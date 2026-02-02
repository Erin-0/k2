import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Building2, DollarSign, Trash2, X, TrendingUp, Filter, Search, ArrowUpDown, Shield } from 'lucide-react';
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
            <div className="flex gap-2 mb-6">
                <div className="search-box flex-1">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="البحث عن الاستثمارات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    className={`sort-toggle ${sortOrder === 'asc' ? 'asc' : ''}`}
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    title="ترتيب حسب السعر"
                >
                    <ArrowUpDown size={18} />
                </button>
            </div>

            {/* Company Cards */}
            <div className="companies-stack">
                {filteredAndSortedCompanies.map((company: any) => {
                    const owned = getOwnedData(company.id);
                    const ready = owned && canClaim(owned.lastClaimedAt);

                    return (
                        <div key={company.id} className={`corp-card ${owned ? 'owned' : ''}`} onClick={() => !owned && setSelectedCompany(company)}>
                            <div className="corp-main">
                                <div className="corp-visual">
                                    <div className="icon-frame">
                                        {owned ? <Shield size={24} className="text-success" /> : <Building2 size={24} />}
                                    </div>
                                    <div className="corp-line"></div>
                                </div>
                                <div className="corp-body">
                                    <div className="corp-header">
                                        <div>
                                            <h3 className="corp-name">{company.name}</h3>
                                            <span className="corp-tag">{company.category}</span>
                                        </div>
                                        {owned ? (
                                            <span className="status-badge connected">تحت السيطرة</span>
                                        ) : (
                                            <span className="status-badge">متاح للاستحواذ</span>
                                        )}
                                    </div>

                                    <div className="corp-stats">
                                        <div className="c-stat">
                                            <label>القيمة السوقية</label>
                                            <span className="val mono">{formatNeuralCurrency(company.value)}</span>
                                        </div>
                                        <div className="c-stat highlight">
                                            <label>عائد الدورة</label>
                                            <span className="val mono">+{formatNeuralCurrency(company.value / 5)}</span>
                                        </div>
                                    </div>

                                    {owned && (
                                        <div className="corp-actions-bar">
                                            {ready ? (
                                                <button
                                                    disabled={claiming}
                                                    onClick={(e) => { e.stopPropagation(); handleClaim(company.id); }}
                                                    className="claim-btn pulse-success"
                                                >
                                                    <DollarSign size={14} /> تحصيل الأرباح
                                                </button>
                                            ) : (
                                                <div className="wait-timer">
                                                    <TrendingUp size={12} />
                                                    <span>الدورة القادمة: {getNextClaimTime(owned.lastClaimedAt)}</span>
                                                </div>
                                            )}
                                            <button
                                                className="sell-btn"
                                                onClick={(e) => { e.stopPropagation(); setSellConfirm(company); }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selection/Buy Detail Modal */}
            {selectedCompany && (
                <div className="modal-overlay">
                    <div className="modal-content corp-details-modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="text-xl font-black">{selectedCompany.name}</h2>
                                <p className="micro-label">{selectedCompany.category}</p>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedCompany(null)}><X size={20} /></button>
                        </div>

                        <div className="modal-body">
                            <div className="intel-section mb-6">
                                <label className="micro-label text-primary">الملف المؤسسي</label>
                                <p className="description">{selectedCompany.description}</p>
                            </div>

                            <div className="financial-grid">
                                <div className="fin-box">
                                    <label>تكلفة الاستحواذ</label>
                                    <span className="val mono text-primary">{formatNeuralCurrency(selectedCompany.value)}</span>
                                </div>
                                <div className="fin-box">
                                    <label>عائد الدورة (24س)</label>
                                    <span className="val mono text-success">+{formatNeuralCurrency(selectedCompany.value / 5)}</span>
                                </div>
                                <div className="fin-box full">
                                    <label>معدل استرداد الاستثمار (ROI)</label>
                                    <div className="roi-visual">
                                        <div className="roi-bar">
                                            <div className="roi-fill" style={{ width: '20%' }}></div>
                                        </div>
                                        <span className="roi-text mono">5 دورات تشغيلية</span>
                                    </div>
                                </div>
                            </div>

                            <div className="warning-note">
                                <Filter size={14} />
                                <p>الاستحواذ يستهلك السيولة فوراً ويفتح قناة تدفق نقدي دائمة.</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setSelectedCompany(null)}>إلغاء الأمر</button>
                            <button onClick={handleBuy} disabled={buying} className="buy-btn primary">
                                {buying ? 'جاري التفويض...' : 'تأكيد الاستحواذ النهائي'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .search-box {
                    position: relative;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-dim);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    padding: 0 1rem;
                }
                .search-icon { opacity: 0.4; margin-left: 0.75rem; }
                .search-box input {
                    background: transparent;
                    border: none;
                    color: white;
                    padding: 0.8rem 0;
                    width: 100%;
                    outline: none;
                    font-size: 0.9rem;
                }
                .sort-toggle {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-dim);
                    border-radius: 12px;
                    width: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .sort-toggle:hover { background: rgba(255,255,255,0.08); border-color: var(--primary); }
                .sort-toggle.asc { color: var(--primary); border-color: var(--primary); }

                .companies-stack { display: flex; flex-direction: column; gap: 1rem; }
                .corp-card {
                    background: var(--surface);
                    border: 1px solid var(--border-dim);
                    border-radius: 20px;
                    transition: 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
                    cursor: pointer;
                    overflow: hidden;
                }
                .corp-card:hover:not(.owned) { border-color: var(--primary); transform: translateY(-3px); }
                .corp-card.owned { background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.05); }
                
                .corp-main { display: flex; padding: 1.25rem; }
                .corp-visual { width: 40px; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
                .icon-frame {
                    width: 40px; height: 40px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-dim);
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                }
                .corp-line { flex: 1; width: 2px; background: linear-gradient(180deg, var(--border-dim) 0%, transparent 100%); }
                
                .corp-body { flex: 1; padding-right: 1.25rem; }
                .corp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
                .corp-name { font-size: 1.1rem; font-weight: 800; margin: 0; }
                .corp-tag { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
                
                .corp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
                .c-stat label { display: block; font-size: 0.6rem; color: var(--text-muted); margin-bottom: 2px; }
                .c-stat .val { font-size: 1rem; font-weight: 700; }
                .c-stat.highlight .val { color: var(--success); }

                .corp-actions-bar { border-top: 1px solid rgba(255,255,255,0.03); padding-top: 1rem; display: flex; gap: 0.5rem; }
                .claim-btn { flex: 1; padding: 0.6rem; background: var(--success); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: 0.2s; }
                .claim-btn:hover { filter: brightness(1.2); }
                .wait-timer { flex: 1; padding: 0.6rem; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); }
                .sell-btn { width: 40px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: var(--danger); display: flex; align-items: center; justify-content: center; }

                /* MODAL */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
                .modal-content { background: #0a0b10; border: 1px solid var(--border-dim); border-radius: 24px; width: 100%; max-width: 480px; padding: 2rem; position: relative; }
                .close-btn { background: transparent; border: none; color: white; opacity: 0.5; }
                .description { color: #aaa; line-height: 1.6; font-size: 0.95rem; }
                
                .financial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
                .fin-box { background: rgba(255,255,255,0.03); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--border-dim); }
                .fin-box.full { grid-column: 1 / -1; }
                .fin-box label { display: block; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.5rem; }
                .fin-box .val { font-size: 1.25rem; font-weight: 800; }
                
                .roi-visual { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; }
                .roi-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
                .roi-fill { height: 100%; background: var(--success); box-shadow: 0 0 10px var(--success); }
                .roi-text { font-size: 0.75rem; color: var(--success); font-weight: 700; }
                
                .warning-note { display: flex; gap: 0.75rem; background: rgba(59, 130, 246, 0.1); padding: 1rem; border-radius: 12px; color: #60a5fa; font-size: 0.8rem; border: 1px solid rgba(59, 130, 246, 0.2); }
                .modal-footer { display: flex; gap: 1rem; margin-top: 2rem; }
                .modal-footer button { flex: 1; padding: 1rem; border-radius: 12px; font-weight: 800; cursor: pointer; border: none; }
                .buy-btn { background: var(--primary); color: white; }
                .cancel-btn { background: rgba(255,255,255,0.05); color: white; }

                .pulse-success { animation: pulse-success 2s infinite; }
                @keyframes pulse-success { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
            `}</style>
        </div>
    );
};
