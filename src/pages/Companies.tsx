import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Building2, ArrowLeft, Globe, TrendingUp, Hash, DollarSign, Trash2, X, Check } from 'lucide-react';
import companiesData from '../data/companys.json';
import { formatNeuralCurrency } from '../utils/formatters';
import { useTerminal } from '../context/TerminalContext';

const COMPANIES_DATA = companiesData.map((c: any) => ({
    ...c,
    value: c.price,
    description: c.description || 'كيان مؤسسي يعمل في المنطقة الاقتصادية السيادية.'
}));

export const Companies = () => {
    const { user, refreshUser } = useAuth();
    const { showAlert, showConfirm, showToast } = useTerminal();

    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [claiming, setClaiming] = useState(false);
    const [buying, setBuying] = useState(false);
    const [selling, setSelling] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modal state
    const [sellConfirm, setSellConfirm] = useState<any>(null);

    const isOwned = (companyId: number) => user?.ownedCompanies?.some((c: any) => c.id === companyId);

    const getOwnedData = (companyId: number) => user?.ownedCompanies?.find((c: any) => c.id === companyId);

    const handleBuy = async () => {
        if (!selectedCompany || !user) return;
        if (isOwned(selectedCompany.id)) return showAlert("خطأ_استحواذ: هذه الشركة مملوكة بالفعل لمحفظتك.");

        const cost = selectedCompany.value;
        const dailyValue = cost / 5;
        const remainder = (user.balance || 0) - cost;

        if (remainder < 0) return showAlert("خطأ_مالي: أصول سائلة غير كافية للاستحواذ.");

        const confirmed = await showConfirm(`تفويض_الاستحواذ: هل تؤكد السيطرة على ${selectedCompany.name}؟ إجمالي التكلفة: ${formatNeuralCurrency(cost)}`);
        if (!confirmed) return;

        setBuying(true);
        try {
            const userRef = doc(db, "users", user.id);
            const now = Timestamp.now();

            // Add to ownedCompanies array
            const newOwned = [
                ...(user.ownedCompanies || []),
                {
                    id: selectedCompany.id,
                    name: selectedCompany.name,
                    dailyValue: dailyValue,
                    purchasedAt: now,
                    lastClaimedAt: now // Initial claim clock starts at purchase
                }
            ];

            await updateDoc(userRef, {
                balance: remainder,
                ownedCompanies: newOwned
            });

            await refreshUser();
            showToast(`اكتمل_الاستحواذ: تم دمج ${selectedCompany.name} بنجاح.`);
            setSelectedCompany(null);
        } catch (e) {
            console.error(e);
            showAlert("فشل_الارتباط: تم إلغاء بروتوكول الاستحواذ.");
        }
        setBuying(false);
    };

    const handleClaim = async (compId: number) => {
        if (!user || claiming) return;

        const owned = user.ownedCompanies?.find(c => c.id === compId);
        if (!owned) return;

        setClaiming(true);
        try {
            const userRef = doc(db, "users", user.id);
            const profit = owned.dailyValue;

            const updatedOwned = user.ownedCompanies?.map(c => {
                if (c.id === compId) {
                    return { ...c, lastClaimedAt: Timestamp.now() };
                }
                return c;
            }) || [];

            await updateDoc(userRef, {
                balance: (user.balance || 0) + profit,
                ownedCompanies: updatedOwned
            });

            await refreshUser();
            showToast(`تحصيل_أرباح: تم إيداع ${formatNeuralCurrency(profit)} من ${owned.name}.`);
        } catch (e) {
            showAlert("خطأ_النظام: فشل في تحصيل الأرباح.");
        }
        setClaiming(false);
    };

    const handleSellConfirm = async () => {
        if (!sellConfirm || !user || selling) return;

        setSelling(true);
        try {
            const userRef = doc(db, "users", user.id);
            const originalCompany = COMPANIES_DATA.find(c => c.id === sellConfirm.id);
            const refund = (originalCompany?.value || 0) * 0.8; // 80% refund

            const updatedOwned = user.ownedCompanies?.filter(c => c.id !== sellConfirm.id) || [];

            await updateDoc(userRef, {
                balance: (user.balance || 0) + refund,
                ownedCompanies: updatedOwned
            });

            await refreshUser();
            showToast(`تصفية_أصول: تم بيع ${sellConfirm.name} واسترداد ${formatNeuralCurrency(refund)}.`);
            setSellConfirm(null);
            setSelectedCompany(null);
        } catch (e) {
            showAlert("خطأ_النظام: فشل في تصفية الأصل.");
        }
        setSelling(false);
    };

    const canClaim = (lastClaimedAt: any) => {
        if (!lastClaimedAt) return false;
        const last = lastClaimedAt instanceof Timestamp ? lastClaimedAt.toDate() : new Date(lastClaimedAt);
        const now = new Date();
        const diff = now.getTime() - last.getTime();
        return diff >= 24 * 60 * 60 * 1000;
        // For testing: return diff >= 10 * 1000; // 10 seconds
    };

    const getNextClaimTime = (lastClaimedAt: any) => {
        if (!lastClaimedAt) return "";
        const last = lastClaimedAt instanceof Timestamp ? lastClaimedAt.toDate() : new Date(lastClaimedAt);
        const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
        return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredAndSortedCompanies = COMPANIES_DATA.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        const aOwned = isOwned(a.id);
        const bOwned = isOwned(b.id);
        if (aOwned && !bOwned) return 1;
        if (!aOwned && bOwned) return -1;
        return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
    });

    const readyToClaim = user?.ownedCompanies?.filter(c => canClaim(c.lastClaimedAt)) || [];

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem', paddingBottom: '120px' }}>
            {/* Sell Confirmation Modal */}
            {sellConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div className="card card-glow" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--danger)', padding: '1.5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <Trash2 size={48} color="var(--danger)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                            <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem' }}>تأكيد تصفية الأصل</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>سيتم بيع {sellConfirm.name} مقابل استرداد 80% من القيمة الأصلية.</p>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span className="micro-label">قيمة الاسترداد:</span>
                                <span className="mono" style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatNeuralCurrency(COMPANIES_DATA.find(c => c.id === sellConfirm.id)?.value * 0.8)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => setSellConfirm(null)} className="micro-label" style={{ padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'white' }}>
                                إلغاء
                            </button>
                            <button onClick={handleSellConfirm} disabled={selling} className="primary" style={{ padding: '0.8rem', background: 'var(--danger)', borderRadius: '8px' }}>
                                {selling ? 'جار البيع...' : 'تأكيد البيع'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.6rem' }}>بورصة_سيادية: إدارة_الأصول</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.6rem', margin: 0 }}>قطاع الشركات</h1>
                </div>
                <div className="system-status" style={{ padding: '0.3rem 0.6rem' }}>
                    <span className="micro-label" style={{ fontSize: '0.5rem' }}>{user?.ownedCompanies?.length || 0} أصول نشطة</span>
                </div>
            </div>

            {/* Profits Bar */}
            {readyToClaim.length > 0 && (
                <div className="card card-glow" style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--success)', padding: '0.4rem', borderRadius: '8px' }}>
                            <DollarSign size={20} color="white" />
                        </div>
                        <div>
                            <p className="micro-label" style={{ color: 'var(--success)', fontSize: '0.7rem' }}>أرباح جاهزة للتحصيل</p>
                            <p className="mono" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{readyToClaim.length} شركات جاهزة</p>
                        </div>
                    </div>
                    <span className="micro-label" style={{ opacity: 0.6, fontSize: '0.5rem' }}>تحصيل يدوي نشط</span>
                </div>
            )}

            {/* Search and Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-bright)', borderRadius: '12px' }}>
                    <input
                        type="text"
                        placeholder="ابحث عن الشركات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                    />
                </div>
            </div>

            {/* Company Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {filteredAndSortedCompanies.map((company: any) => {
                    const owned = getOwnedData(company.id);
                    const ready = owned && canClaim(owned.lastClaimedAt);

                    return (
                        <div
                            key={company.id}
                            className="card card-glow"
                            style={{
                                padding: 0,
                                overflow: 'hidden',
                                border: owned ? '1px solid var(--border-bright)' : '1px solid var(--primary-dim)',
                                borderRadius: '20px',
                                opacity: owned ? 0.9 : 1,
                                background: owned ? 'rgba(0,0,0,0.4)' : 'var(--surface)',
                                cursor: 'default'
                            }}
                        >
                            <div style={{ display: 'flex' }}>
                                {/* Icon Side */}
                                <div style={{
                                    width: '80px',
                                    background: owned ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #0a1120, #1e293b)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    borderRight: '1px solid var(--border-dim)'
                                }}>
                                    {owned ? <Building2 size={32} style={{ opacity: 0.3 }} /> : <Globe size={32} color="var(--primary)" style={{ opacity: 0.6 }} />}
                                </div>

                                {/* Info Side */}
                                <div style={{ padding: '1rem', flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1rem', color: owned ? 'var(--text-muted)' : 'white' }}>{company.name}</h3>
                                            <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5 }}>{company.category}</p>
                                        </div>
                                        {owned && <Check size={16} color="var(--success)" />}
                                    </div>

                                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p className="micro-label" style={{ fontSize: '0.5rem', opacity: 0.5 }}>القيمة</p>
                                            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: owned ? 'var(--text-muted)' : 'var(--primary)' }}>
                                                {formatNeuralCurrency(company.value)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="micro-label" style={{ fontSize: '0.5rem', opacity: 0.5, textAlign: 'right' }}>الأرباح/24س</p>
                                            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                                +{formatNeuralCurrency(company.value / 5)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        {!owned ? (
                                            <button
                                                onClick={() => setSelectedCompany(company)}
                                                className="primary"
                                                style={{ flex: 1, padding: '0.5rem', fontSize: '0.7rem' }}
                                            >
                                                استحواذ
                                            </button>
                                        ) : (
                                            <>
                                                {ready ? (
                                                    <button
                                                        disabled={claiming}
                                                        onClick={() => handleClaim(company.id)}
                                                        className="primary"
                                                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.7rem', background: 'var(--success)', border: 'none' }}
                                                    >
                                                        {claiming ? 'جار التحصيل...' : 'تحصيل الآن'}
                                                    </button>
                                                ) : (
                                                    <div className="micro-label" style={{ flex: 1, padding: '0.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.6rem' }}>
                                                        جاهز في {getNextClaimTime(owned.lastClaimedAt)}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setSellConfirm(company)}
                                                    style={{ width: '40px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Trash2 size={16} color="var(--danger)" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selection/Buy Detail Modal (if needed, otherwise justBuy) */}
            {selectedCompany && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card card-glow" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.4rem' }}>{selectedCompany.name}</h2>
                            <button onClick={() => setSelectedCompany(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}><X /></button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{selectedCompany.description}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                                <p className="micro-label">تكلفة الاستحواذ</p>
                                <p className="mono" style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{formatNeuralCurrency(selectedCompany.value)}</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                                <p className="micro-label">العائد اليومي</p>
                                <p className="mono" style={{ fontSize: '1.1rem', color: 'var(--success)' }}>+{formatNeuralCurrency(selectedCompany.value / 5)}</p>
                            </div>
                        </div>

                        <button onClick={handleBuy} disabled={buying} className="primary" style={{ width: '100%', padding: '1rem' }}>
                            {buying ? 'جار المعالجة...' : 'تأكيد الاستحواذ'}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                input[type="range"] { -webkit-appearance: none; background: rgba(255,255,255,0.1); border-radius: 5px; }
                input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; background: var(--primary); border-radius: 50%; cursor: pointer; box-shadow: 0 0 10px var(--primary); }
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 120px !important; }
                }
            `}</style>
        </div>
    );
};
