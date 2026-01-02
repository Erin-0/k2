import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, query, where, serverTimestamp, runTransaction, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Handshake, Activity, ShieldCheck } from 'lucide-react';
import { formatNeuralCurrency } from '../utils/formatters';
import { useTerminal } from '../context/TerminalContext';

export const Loans = () => {
    const { user, refreshUser } = useAuth();
    const { showAlert, showConfirm, showPrompt, showToast } = useTerminal();
    const [tab, setTab] = useState<'central' | 'p2p'>('central');

    const [totalWealth, setTotalWealth] = useState(0);
    const [interestRate, setInterestRate] = useState(0.02);
    const [loanAmount, setLoanAmount] = useState<number | string>('');
    const [activeLoans, setActiveLoans] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [p2pLoans, setP2pLoans] = useState<any[]>([]);
    const [showCreateOffer, setShowCreateOffer] = useState(false);
    const [offerForm, setOfferForm] = useState({ maxAmount: 1000000, interestRate: 5, duration: 48 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        const usersSnap = await getDocs(collection(db, "users"));
        let T = 0;
        usersSnap.forEach(d => T += (d.data().balance || 0));
        setTotalWealth(T);
        const R = T > 0 ? (user?.balance || 0) / T : 0;
        const calculatedRate = 0.02 + (0.48 * R);
        setInterestRate(calculatedRate);

        const loansRef = collection(db, "loans");
        const qBorrower = query(loansRef, where("borrowerId", "==", user?.id), where("status", "in", ["active", "overdue"]));
        const qLender = query(loansRef, where("lenderId", "==", user?.id), where("status", "in", ["active", "overdue"]));
        const [snapB, snapL] = await Promise.all([getDocs(qBorrower), getDocs(qLender)]);
        const allLoans = [...snapB.docs, ...snapL.docs].map(d => ({ id: d.id, ...d.data() }));
        setActiveLoans(allLoans.filter((l: any) => l.lenderId === 'CENTRAL_BANK'));
        setP2pLoans(allLoans.filter((l: any) => l.lenderId !== 'CENTRAL_BANK'));

        const offersQ = query(collection(db, "loan_offers"), orderBy("createdAt", "desc"));
        const offersSnap = await getDocs(offersQ);
        setOffers(offersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((o: any) => o.lenderId !== user?.id));
        setLoading(false);
    };

    const takeCentralLoan = async () => {
        const amount = Number(loanAmount);
        if (amount <= 0) return showAlert("إنذار_المشتريات: طلب رأس مال غير صالح.");
        const totalDue = amount * (1 + interestRate);
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 48);
        const confirmed = await showConfirm(`تفويض_إصدار_دين: تأكيد ${formatNeuralCurrency(amount)} بفائدة ${(interestRate * 100).toFixed(2)}%؟`);
        if (!confirmed) return;

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", user!.id);
                const userSnap = await transaction.get(userRef);
                const newBalance = (userSnap.data()?.balance || 0) + amount;
                transaction.update(userRef, { balance: newBalance });
                const loanRef = doc(collection(db, "loans"));
                transaction.set(loanRef, {
                    borrowerId: user!.id,
                    lenderId: 'CENTRAL_BANK',
                    originalAmount: amount,
                    remainingAmount: totalDue,
                    interestRate,
                    totalDue,
                    deadline,
                    createdAt: serverTimestamp(),
                    status: 'active'
                });
                
                transaction.set(doc(collection(db, "news")), {
                    type: 'loan',
                    username: user!.username,
                    userColor: user!.color,
                    content: `البنك المركزي يوافق على ائتمان طوارئ للمستخدم ${user!.username}. الديون تتراكم في الشبكة.`,
                    value: amount,
                    timestamp: serverTimestamp()
                });
            });
            setLoanAmount('');
            loadData();
            await refreshUser();
            showToast("نجاح_إصدار_الدين: تم الحصول على رأس المال.");
        } catch (e) { showAlert("فشل_الارتباط: تم إلغاء تسلسل تفويض الدين."); }
    };

    const publishOffer = async () => {
        if (offerForm.maxAmount <= 0) return showAlert("خطأ_في_العرض: يجب أن يكون المبلغ أكبر من صفر.");
        if (user!.balance < offerForm.maxAmount) return showAlert("خطأ_في_العرض: رصيدك غير كافٍ لتغطية المبلغ.");

        const confirmed = await showConfirm(`تأكيد_العرض: نشر ${formatNeuralCurrency(offerForm.maxAmount)} بفائدة ${offerForm.interestRate}% لمدة ${offerForm.duration} ساعة؟`);
        if (!confirmed) return;

        try {
            await addDoc(collection(db, "loan_offers"), {
                lenderId: user!.id,
                lenderName: user!.username,
                maxAmount: Number(offerForm.maxAmount),
                interestRate: Number(offerForm.interestRate) / 100,
                durationHours: Number(offerForm.duration),
                createdAt: serverTimestamp()
            });
            setShowCreateOffer(false);
            setOfferForm({ maxAmount: 1000000, interestRate: 5, duration: 48 });
            loadData();
            showToast("تم_نشر_العرض: تم نشر عرض السيولة.");
        } catch (e) { showAlert("فشل_العرض: فشل نشر عرض السيولة."); }
    };

    const repayLoan = async (loan: any, amountToPay: number) => {
        const userBalance = user?.balance || 0;
        if (amountToPay <= 0 || amountToPay > userBalance) return showAlert("خطأ_في_التسوية: احتياطيات سائلة غير كافية.");

        const confirmed = await showConfirm(`تفويض_التسوية: تأكيد سداد ${formatNeuralCurrency(amountToPay)} للقرض معرف ${loan.id.slice(0, 8).toUpperCase()}؟`);
        if (!confirmed) return;

        try {
            await runTransaction(db, async (transaction) => {
                const borrowerRef = doc(db, "users", user!.id);
                transaction.update(borrowerRef, { balance: userBalance - amountToPay });
                if (loan.lenderId !== 'CENTRAL_BANK') {
                    const lRef = doc(db, "users", loan.lenderId);
                    const lSnap = await transaction.get(lRef);
                    transaction.update(lRef, { balance: (lSnap.data()?.balance || 0) + amountToPay });
                }
                const newRemaining = loan.remainingAmount - amountToPay;
                const loanRef = doc(db, "loans", loan.id);
                if (newRemaining <= 0.1) transaction.update(loanRef, { remainingAmount: 0, status: 'repaid' });
                else transaction.update(loanRef, { remainingAmount: newRemaining });
            });
            loadData();
            await refreshUser();
            showToast("نجاح_التسوية: تمت معالجة سداد القرض.");
        } catch (e) { showAlert("تم_إنهاء_التسوية: اختراق في سلامة الارتباط."); }
    };

    const getTimeRemaining = (deadline: any) => {
        const d = deadline?.seconds ? new Date(deadline.seconds * 1000) : deadline;
        const now = new Date();
        const diff = d?.getTime() - now.getTime();
        if (!diff || diff < 0) return 'متأخر';
        const hrs = Math.floor(diff / 3600000);
        return `${hrs} س ${Math.floor((diff % 3600000) / 60000)} د`;
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="neural-loader"></div>
            <p className="micro-label" style={{ marginLeft: '1rem', letterSpacing: '2px' }}>جاري الوصول إلى مستودع التمويل...</p>
        </div>
    );

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.6rem' }}>عقدة_الائتمان: رابط_مالي_للنظام</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>مستودع التمويل</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                    <button
                        onClick={() => setTab('central')}
                        className={`micro-label ${tab === 'central' ? 'primary' : ''}`}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.65rem' }}
                    >
                        البنك المركزي
                    </button>
                    <button
                        onClick={() => setTab('p2p')}
                        className={`micro-label ${tab === 'p2p' ? 'primary' : ''}`}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.65rem' }}
                    >
                        سوق النظراء
                    </button>
                </div>
            </div>

            {tab === 'central' ? (
                <div className="fade-in">
                    <div className="card card-glow" style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-bright)' }}>
                        <div className="scanline"></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                            <ShieldCheck size={18} color="var(--primary)" />
                            <h3 className="micro-label" style={{ fontSize: '0.75rem' }}>محطة الاستحواذ على الديون</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-dim)' }}>
                                <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>مؤشر حصة رأس المال (R)</p>
                                <div className="mono" style={{ fontSize: '0.9rem', fontWeight: '900' }}>
                                    {((user?.balance || 0) / (totalWealth || 1) * 100).toFixed(4)}%
                                </div>
                            </div>
                            <div className="card" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1rem', border: '1px solid var(--primary)' }}>
                                <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>معدل الفائدة السنوي</p>
                                <div className="mono" style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--primary)' }}>
                                    {(interestRate * 100).toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', border: '1px solid var(--border-bright)' }}>
                            <p className="micro-label" style={{ marginBottom: '0.75rem', fontSize: '0.6rem' }}>حجم طلب رأس المال ($)</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <span className="mono" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontSize: '1.2rem' }}>$</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={loanAmount}
                                        onChange={e => setLoanAmount(e.target.value)}
                                        className="mono"
                                        style={{ fontSize: '1.4rem', width: '100%', padding: '0.75rem 0.75rem 0.75rem 2rem', background: 'rgba(0,0,0,0.4)', border: 'none', borderBottom: '2px solid var(--primary)', color: 'white', outline: 'none' }}
                                    />
                                </div>
                                <button onClick={takeCentralLoan} className="primary" style={{ padding: '1rem', fontSize: '0.9rem' }}>تفويض الطلب</button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Activity size={16} color="var(--warning)" />
                        <h3 className="micro-label" style={{ fontSize: '0.7rem' }}>تدفقات الالتزامات النشطة</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {activeLoans.map(loan => (
                            <div key={loan.id} className="card card-glow" style={{ borderRight: '4px solid var(--warning)', padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p className="micro-label" style={{ opacity: 0.6, fontSize: '0.55rem' }}>التزام الدين الحالي</p>
                                        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--warning)' }}>
                                            {formatNeuralCurrency(loan.remainingAmount)}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                            <span className="micro-label" style={{ fontSize: '0.55rem' }}>{getTimeRemaining(loan.deadline)}</span>
                                            <span className="micro-label" style={{ color: 'var(--warning)', fontSize: '0.55rem' }}>الفائدة: {(loan.interestRate * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const amtStr = await showPrompt(`تفويض السداد: أدخل المبلغ المراد دفعه`, loan.remainingAmount.toFixed(2));
                                            if (amtStr) repayLoan(loan, Number(amtStr));
                                        }}
                                        className="primary"
                                        style={{ padding: '0.6rem 1rem', fontSize: '0.7rem', background: 'transparent', border: '1px solid var(--border-bright)' }}
                                    >
                                        تسوية
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="fade-in">
                    <button onClick={() => setShowCreateOffer(true)} className="primary" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', background: 'var(--accent)', fontSize: '0.85rem' }}>نشر عرض سيولة</button>

                    {showCreateOffer && (
                        <div className="card card-glow" style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--accent)' }}>
                            <h4 className="micro-label" style={{ marginBottom: '1.25rem' }}>بروتوكول سيولة النظراء</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <p className="micro-label" style={{ fontSize: '0.6rem' }}>الحد الأقصى للتخصيص ($)</p>
                                    <input type="number" value={offerForm.maxAmount} onChange={e => setOfferForm({ ...offerForm, maxAmount: Number(e.target.value) })} className="mono" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', color: 'white' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <p className="micro-label" style={{ fontSize: '0.6rem' }}>الفائدة السنوية (%)</p>
                                        <input type="number" value={offerForm.interestRate} onChange={e => setOfferForm({ ...offerForm, interestRate: Number(e.target.value) })} className="mono" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', color: 'white' }} />
                                    </div>
                                    <div>
                                        <p className="micro-label" style={{ fontSize: '0.6rem' }}>المدة (ساعة)</p>
                                        <input type="number" value={offerForm.duration} onChange={e => setOfferForm({ ...offerForm, duration: Number(e.target.value) })} className="mono" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', color: 'white' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={publishOffer} className="primary" style={{ flex: 1, padding: '0.8rem', background: 'var(--accent)' }}>تأكيد النشر</button>
                                    <button onClick={() => setShowCreateOffer(false)} className="primary" style={{ padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-bright)' }}>إلغاء</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {offers.map(offer => (
                            <div key={offer.id} className="card card-glow" style={{ padding: '1rem', border: '1px solid var(--border-dim)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <p className="micro-label" style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>المقرض: {offer.lenderName}</p>
                                    <p className="mono" style={{ color: 'var(--success)', fontWeight: '900', fontSize: '0.75rem' }}>{(offer.interestRate * 100).toFixed(0)}% فائدة</p>
                                </div>
                                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: '900' }}>${offer.maxAmount.toLocaleString()}</div>
                                <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5, marginTop: '0.5rem' }}>المدة القصوى: {offer.durationHours} ساعة</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                        <Handshake size={16} color="var(--primary)" />
                        <h3 className="micro-label" style={{ fontSize: '0.7rem' }}>عقود الائتمان الخاصة بي</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {p2pLoans.map(loan => {
                            const isLender = loan.lenderId === user?.id;
                            return (
                                <div key={loan.id} className="card card-glow" style={{ borderRight: `4px solid ${isLender ? 'var(--success)' : 'var(--danger)'}`, padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p className="micro-label" style={{ color: isLender ? 'var(--success)' : 'var(--danger)', fontSize: '0.55rem' }}>
                                                {isLender ? 'أصل ائتماني' : 'خصم التزام'}
                                            </p>
                                            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: '900', margin: '0.2rem 0' }}>${loan.remainingAmount.toLocaleString()}</div>
                                            <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.5rem' }}>
                                                {isLender ? `المقترض: ${loan.borrowerId.slice(0, 8)}` : `المقرض: ${loan.lenderName}`}
                                            </p>
                                        </div>
                                        {!isLender && (
                                            <button onClick={async () => {
                                                const amtStr = await showPrompt("تسوية الالتزام:", loan.remainingAmount.toString());
                                                if (amtStr) repayLoan(loan, Number(amtStr));
                                            }} className="primary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.7rem', background: 'transparent', border: '1px solid var(--border-bright)' }}>تسوية</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <style>{`
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 100px !important; }
                    .primary { border-radius: 12px; }
                }
            `}</style>
        </div>
    );
};