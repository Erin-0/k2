import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowRightLeft, Send, Users, Activity, Zap, ShieldCheck, Eye } from 'lucide-react';

export const Transfers = () => {
    const { user, refreshUser } = useAuth();
    const [recipients, setRecipients] = useState<any[]>([]);
    const [targetId, setTargetId] = useState('');
    const [amount, setAmount] = useState<number | string>('');
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, "users"));
                setRecipients(snap.docs
                    .filter(d => d.id !== user?.id)
                    .map(d => ({ id: d.id, ...d.data() }))
                );
            } catch (err) {
                console.error("Error fetching users:", err);
            }
        };
        fetchUsers();
    }, [user]);

    // دالة لتنسيق الأرقام بالفواصل للعرض فقط
    const formatNumber = (val: number | string) => {
        if (!val || isNaN(Number(val))) return "0";
        return Number(val).toLocaleString('en-US');
    };

    const sendMoney = async () => {
        const numAmount = Number(amount);
        if (numAmount <= 0) return setMsg({ type: 'error', text: "خطأ_في_الحساب: يجب أن يكون المبلغ رقماً موجباً." });
        if (numAmount > (user?.balance || 0)) return setMsg({ type: 'error', text: "تم_رفض_التفويض: احتياطيات سائلة غير كافية." });
        if (!targetId) return setMsg({ type: 'error', text: "خطأ_بروتوكول: تعيين الهدف مفقود." });

        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const senderRef = doc(db, "users", user!.id);
                const receiverRef = doc(db, "users", targetId);
                const receiverSnap = await transaction.get(receiverRef);
                
                if (!receiverSnap.exists()) throw new Error("الهدف غير موجود في الشبكة.");

                const targetData = receiverSnap.data();
                const targetName = targetData?.username;
                const senderBalance = (user?.balance || 0) - numAmount;
                
                transaction.update(senderRef, { balance: senderBalance });
                transaction.update(receiverRef, { balance: (targetData?.balance || 0) + numAmount });

                transaction.set(doc(collection(db, "activities")), {
                    userId: user?.id,
                    message: `نشر رأس المال: -$${numAmount.toLocaleString()} -> ${targetName}`,
                    timestamp: serverTimestamp(),
                    type: 'debit'
                });

                transaction.set(doc(collection(db, "activities")), {
                    userId: targetId,
                    message: `تدفق رأس المال: +$${numAmount.toLocaleString()} <- ${user?.username}`,
                    timestamp: serverTimestamp(),
                    type: 'credit'
                });

                transaction.set(doc(collection(db, "news")), {
                    type: 'uplink',
                    username: user?.username,
                    userColor: user?.color,
                    content: `قام العميل ${user?.username} بإجراء تحويل مالي ضخم إلى ${targetName}.`,
                    value: numAmount,
                    timestamp: serverTimestamp()
                });
            });

            setMsg({ type: 'success', text: `نجاح_الارتباط: تم إرسال $${numAmount.toLocaleString()} إلى ${recipients.find(r => r.id === targetId)?.username}.` });
            setAmount('');
            refreshUser();
            setTargetId('');
        } catch (e: any) {
            setMsg({ type: 'error', text: "فشل_الارتباط: فشل تسلسل العملية. " + e.message });
        }
        setLoading(false);
    };

    return (
        <div className="page-container fade-in" style={{ padding: '1rem' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.6rem' }}>عقدة_مالية: تحويل_رأس_المال</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>نشر الأصول</h1>
                </div>
                <div className="card" style={{ padding: '0.4rem 0.8rem', width: 'fit-content', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity size={12} color="var(--primary)" className="pulse" />
                        <span className="micro-label" style={{ fontSize: '0.55rem' }}>طبقة التشفير: 128-بت</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Deployment configuration */}
                <div className="card card-glow" style={{ padding: '1.5rem', border: '1px solid var(--border-bright)', position: 'relative', overflow: 'hidden', borderRadius: '24px' }}>
                    <div className="scanline"></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                        <Send size={18} color="var(--primary)" />
                        <h3 className="micro-label" style={{ fontSize: '0.75rem' }}>معلمات التفويض</h3>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-dim)', textAlign: 'center' }}>
                        <p className="micro-label" style={{ marginBottom: '0.5rem', opacity: 0.5, fontSize: '0.6rem' }}>إدخال الحجم الكمي ($)</p>
                        
                        <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="mono" style={{ fontSize: '1.5rem', opacity: 0.3, marginRight: '5px' }}>$</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="mono"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '2.5rem',
                                        textAlign: 'center',
                                        width: '100%',
                                        fontWeight: '900',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* Live Preview / معاينة حية بالفواصل */}
                            {amount && (
                                <div className="fade-in" style={{ 
                                    marginTop: '10px', 
                                    padding: '4px 12px', 
                                    background: 'rgba(var(--primary-rgb), 0.1)', 
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: '1px dashed var(--primary)'
                                }}>
                                    <Eye size={12} color="var(--primary)" />
                                    <span className="mono" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        ${formatNumber(amount)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p className="micro-label" style={{ opacity: 0.5, marginBottom: '0.2rem', fontSize: '0.55rem' }}>صافي القيمة السائلة</p>
                            <span className="mono" style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                ${(user?.balance || 0).toLocaleString()}
                            </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p className="micro-label" style={{ opacity: 0.5, marginBottom: '0.2rem', fontSize: '0.55rem' }}>العمولة المقدرة</p>
                            <span className="mono" style={{ opacity: 0.6, fontSize: '0.8rem' }}>$0.00 (مدعوم)</span>
                        </div>
                    </div>
                </div>

                {/* Target selector */}
                <div className="card card-glow" style={{ padding: '1.5rem', border: '1px solid var(--border-dim)', borderRadius: '24px', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                        <Users size={18} color="var(--accent)" />
                        <h3 className="micro-label" style={{ fontSize: '0.75rem' }}>شبكة تعيين الأهداف</h3>
                    </div>

                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recipients.length > 0 ? recipients.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => setTargetId(r.id)}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '16px',
                                        background: targetId === r.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: '0.2s',
                                        border: `1.5px solid ${targetId === r.id ? 'var(--primary)' : 'transparent'}`
                                    }}
                                >
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: r.color || 'var(--primary)',
                                        overflow: 'hidden', flexShrink: 0
                                    }}>
                                        {r.photoUrl ? (
                                            <img src={r.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '14px' }}>
                                                {r.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ marginLeft: '1rem', marginRight: '1rem', minWidth: 0, flex: 1 }}>
                                        <p className="mono" style={{ fontSize: '0.85rem', marginBottom: '0.1rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.username}</p>
                                        <p className="micro-label" style={{ fontSize: '0.5rem', opacity: 0.4 }}>ID: {r.id.substring(0, 8).toUpperCase()}</p>
                                    </div>
                                    {targetId === r.id && <Zap size={14} color="var(--primary)" />}
                                </div>
                            )) : (
                                <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>جاري البحث عن أهداف في الشبكة...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Response Message */}
                {msg.text && (
                    <div className="fade-in" style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${msg.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                        color: msg.type === 'error' ? 'var(--danger)' : 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                    }}>
                        <ShieldCheck size={16} />
                        <span>{msg.text}</span>
                    </div>
                )}
            </div>

            {/* Main Action Button */}
            <div style={{ marginTop: '2rem', paddingBottom: '100px' }}>
                <button
                    onClick={sendMoney}
                    disabled={loading || !targetId || !amount}
                    className={`primary ${(!targetId || !amount) ? 'disabled' : ''}`}
                    style={{
                        width: '100%',
                        padding: '1.25rem',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        borderRadius: '16px',
                        cursor: (loading || !targetId || !amount) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'جاري_تعديل_الارتباط...' : 'تفويض نشر رأس المال'}
                    <ArrowRightLeft size={20} />
                </button>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 120px !important; }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-bright); borderRadius: 10px; }
                
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
            `}</style>
        </div>
    );
};
