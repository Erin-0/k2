import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Building2, ArrowLeft, Globe, TrendingUp, Hash } from 'lucide-react';
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
    const [n, setN] = useState(7);
    const [buying, setBuying] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const getOwnedCount = (companyId: number) => user?.ownedCompanies?.filter((c: any) => c.id === companyId).length || 0;


    const handleBuy = async () => {
        if (!selectedCompany || !user) return;
        const cost = selectedCompany.value;
        const dailyValueA = cost / 5;
        const remainderB = (user.balance || 0) - cost;

        if (remainderB < 0) return showAlert("خطأ_مالي: أصول سائلة غير كافية للاستحواذ.");

        const confirmed = await showConfirm(`تفويض_الاستحواذ: هل تؤكد السيطرة على ${selectedCompany.name}؟ إجمالي التكلفة: ${formatNeuralCurrency(cost)}`);
        if (!confirmed) return;


        setBuying(true);
        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, {
                balance: remainderB,
                ownedCompanies: arrayUnion({
                    id: selectedCompany.id,
                    name: selectedCompany.name,
                    dailyValue: dailyValueA,
                    purchasedAt: serverTimestamp()
                })
            });
            await refreshUser();
            showToast(`اكتمل_الاستحواذ: تم دمج ${selectedCompany.name} بنجاح.`);
            setSelectedCompany(null);
        } catch (e) {
            showAlert("فشل_الارتباط: تم إلغاء بروتوكول الاستحواذ.");
        }

        setBuying(false);
    };
    
    const filteredAndSortedCompanies = COMPANIES_DATA.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (sortOrder === 'desc') {
            return b.value - a.value;
        } else {
            return a.value - b.value;
        }
    });
    
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    if (selectedCompany) {
        const A = selectedCompany.value / 5;
        const B = (user?.balance || 0) - selectedCompany.value;
        const projectedReturn = B + (A * n);

        return (
            <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
                <button
                    onClick={() => setSelectedCompany(null)}
                    className="micro-label"
                    style={{ background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                >
                    <ArrowLeft size={14} /> إنهاء_الارتباط // سوق_الأسهم
                </button>

                <div className="card card-glow" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--primary)', borderRadius: '20px' }}>
                    <div style={{ height: '160px', width: '100%', background: 'linear-gradient(135deg, #050508 0%, #0a1120 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        <div className="scanline"></div>
                        <Building2 size={60} color="var(--primary)" style={{ opacity: 0.5 }} />

                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', textAlign: 'right' }}>
                            <span className="status-badge connected" style={{ fontSize: '0.5rem', padding: '0.2rem 0.5rem' }}>أصول_الفئة_1</span>
                        </div>
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.6rem' }}>تعيين_حقوق_الملكية_الأساسية</p>
                            <h1 className="text-gradient" style={{ fontSize: '1.6rem', margin: '0.25rem 0' }}>{selectedCompany.name}</h1>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <span className="micro-label" style={{ background: 'var(--surface-soft)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>{selectedCompany.category}</span>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                             <p className="micro-label" style={{ marginBottom: '0.25rem' }}>تقييم_السوق</p>
                             <h2 className="mono" style={{ fontSize: '1.5rem', margin: 0 }}>{formatNeuralCurrency(selectedCompany.value)}</h2>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{selectedCompany.description}</p>

                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <TrendingUp size={16} color="var(--primary)" />
                                <h3 className="micro-label" style={{ fontSize: '0.65rem' }}>لوحة_توقعات_الإيرادات</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div className="intel-item">
                                    <p className="micro-label" style={{ fontSize: '0.55rem' }}>العائد/الدورة (A)</p>
                                    <p className="mono" style={{ color: 'var(--success)', fontSize: '0.9rem' }}>+{formatNeuralCurrency(A)}</p>
                                </div>
                                <div className="intel-item">
                                    <p className="micro-label" style={{ fontSize: '0.55rem' }}>السيولة_الصافية (B)</p>
                                    <p className="mono" style={{ color: B < 0 ? 'var(--danger)' : 'var(--text-main)', fontSize: '0.9rem' }}>{formatNeuralCurrency(B)}</p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                                    <label className="micro-label" style={{ fontSize: '0.6rem' }}>مدة الاستبقاء (n)</label>
                                    <span className="mono" style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '0.9rem' }}>{n} دورة</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="90"
                                    value={n}
                                    onChange={e => setN(Number(e.target.value))}
                                    style={{ height: '5px', width: '100%' }}
                                />
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-bright)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>إجمالي القيمة المتوقعة</p>
                                    <p className="mono" style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>{formatNeuralCurrency(projectedReturn)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="micro-label" style={{ fontSize: '0.55rem' }}>معامل العائد</p>
                                    <p className="mono" style={{ color: 'var(--success)', fontSize: '0.9rem' }}>+{((A * n / selectedCompany.value) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleBuy}
                            disabled={B < 0 || buying}
                            className="primary"
                            style={{
                                width: '100%',
                                marginTop: '1.5rem',
                                padding: '1.1rem',
                                fontSize: '0.9rem',
                                fontWeight: '900'
                            }}
                        >
                            {buying ? 'جاري تنفيذ الاستحواذ...' : (B < 0 ? 'تم الرفض: نقص في الاحتياطي' : `تفويض الشراء (${formatNeuralCurrency(selectedCompany.value)})`)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.6rem' }}>بورصة_سيادية: البث_المباشر</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.6rem', margin: 0 }}>سوق الأسهم</h1>
                </div>
                <div className="system-status" style={{ padding: '0.3rem 0.6rem' }}>
                    <span className="micro-label" style={{ fontSize: '0.5rem' }}>السوق_نشط</span>
                </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-bright)', borderRadius: '12px' }}>
                    <input
                        type="text"
                        placeholder="ابحث عن الشركات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.85rem',
                            outline: 'none',
                        }}
                    />
                </div>
                <button
                    onClick={toggleSortOrder}
                    className="card"
                    style={{
                        padding: '0.7rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        borderRadius: '12px',
                    }}
                >
                    <TrendingUp size={14} />
                    <span className="micro-label">{sortOrder === 'desc' ? 'من الأعلى للأقل' : 'من الأقل للأعلى'}</span>
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {filteredAndSortedCompanies.map((company: any) => (
                    <div
                        key={company.id}
                        className="card card-glow"
                        onClick={() => setSelectedCompany(company)}
                        style={{
                            padding: 0,
                            overflow: 'hidden',
                            border: getOwnedCount(company.id) > 0 ? '1px solid var(--success)' : '1px solid var(--border-dim)',
                            borderRadius: '16px',
                            display: 'flex'
                        }}
                    >
                        <div style={{ width: '100px', background: 'linear-gradient(135deg, #0a1120, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                            {getOwnedCount(company.id) > 0 ? (
                                <div style={{ background: 'var(--success)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px var(--success)' }}>
                                    <Hash size={12} color="white" />
                                </div>
                            ) : (
                                <Globe size={24} color="var(--primary)" style={{ opacity: 0.3 }} />
                            )}
                        </div>
                        <div style={{ padding: '1rem', flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {company.name.toUpperCase()}
                            </h3>
                            <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5, marginTop: '0.2rem' }}>{company.category}</p>
                            
                            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="mono" style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--primary)' }}>
                                    {formatNeuralCurrency(company.value)}
                                </span>
                                {getOwnedCount(company.id) > 0 && (
                                    <span className="micro-label" style={{ color: 'var(--success)', fontSize: '0.55rem' }}>مملوك: {getOwnedCount(company.id)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <style>{`
                input[type="range"] { -webkit-appearance: none; background: rgba(255,255,255,0.1); border-radius: 5px; }
                input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; background: var(--primary); border-radius: 50%; cursor: pointer; box-shadow: 0 0 10px var(--primary); }
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 100px !important; }
                }
            `}</style>
        </div>
    );
};