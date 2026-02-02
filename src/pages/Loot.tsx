import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Gauge, Database, Layers, Factory, Terminal, Pickaxe } from 'lucide-react';
import { formatNeuralCurrency } from '../utils/formatters';
import { useTerminal } from '../context/TerminalContext';

// القائمة المعربة للموارد (مع الحفاظ على المفاتيح الأصلية إذا لزم الأمر، لكن هنا سنعرب العرض)
const RESOURCES_MAP: Record<string, string> = {
    "Gold": "ذهب", "Uranium": "يورانيوم", "Crude Oil": "نفط خام", "Iron": "حديد", "Lithium": "ليثيوم",
    "Copper": "نحاس", "Natural Gas": "غاز طبيعي", "Aluminum": "ألمنيوم", "Silicon": "سيليكون", "Titanium": "تيتانيوم",
    "Coal": "فحم", "Silver": "فضة", "Diamond": "ألماس", "Natural Rubber": "مطاط طبيعي", "Nickel": "نيكل",
    "Cobalt": "كوبالت", "Phosphate": "فوسفات", "Fresh Water": "ماء عذب", "Wood": "خشب", "Zinc": "زنك"
};

const RESOURCES_LIST = Object.keys(RESOURCES_MAP);

const PRODUCTS_DATA = [
    { id: 1, name: "وحدة معالجة عصبية", req: ["Silicon", "Copper", "Gold"], basePrice: 40000 },
    { id: 2, name: "نواة بطارية سيادية", req: ["Lithium", "Cobalt", "Nickel"], basePrice: 1000000 },
    { id: 3, name: "مفاعل اندماج وانشطار", req: ["Uranium", "Iron", "Fresh Water"], basePrice: 9000000000 },
    { id: 4, name: "ناقلة شحن مدارية", req: ["Titanium", "Aluminum", "Natural Rubber"], basePrice: 250000000 },
    { id: 5, name: "قمر اتصالات فضائي", req: ["Silver", "Silicon", "Titanium"], basePrice: 150000000 },
    { id: 6, name: "مركبة كهربائية خفية", req: ["Aluminum", "Lithium", "Copper"], basePrice: 120000 },
    { id: 7, name: "منصة استخراج متطورة", req: ["Iron", "Titanium", "Natural Gas"], basePrice: 600000000 },
    { id: 8, name: "مركز تصفية هيدروليكي", req: ["Copper", "Coal", "Zinc"], basePrice: 50000 },
    { id: 9, name: "وحدة دفع مغناطيسي", req: ["Iron", "Copper", "Aluminum"], basePrice: 30000000 },
    { id: 10, name: "مختبر جينات حيوية", req: ["Fresh Water", "Silver", "Natural Gas"], basePrice: 500000000 },
    { id: 11, name: "رابط اتصالات سيادي", req: ["Silicon", "Lithium", "Gold"], basePrice: 1200 },
    { id: 12, name: "كاسرة جليد عملاقة", req: ["Iron", "Nickel", "Crude Oil"], basePrice: 120000000 },
    { id: 13, name: "مصفوفة فوتونية", req: ["Silicon", "Silver", "Aluminum"], basePrice: 15000 },
    { id: 14, name: "محفز نمو زراعي", req: ["Phosphate", "Natural Gas", "Fresh Water"], basePrice: 800 },
    { id: 15, name: "بدلة هيكل تكتيكية", req: ["Natural Rubber", "Titanium", "Silver"], basePrice: 12000000 },
    { id: 16, name: "إطار بناء قوسي", req: ["Iron", "Wood", "Aluminum"], basePrice: 1500000000 },
    { id: 17, name: "شبكة لوجستية آلية", req: ["Copper", "Silicon", "Natural Rubber"], basePrice: 45000 },
    { id: 18, name: "خزنة سبائك سيادية", req: ["Gold", "Iron", "Zinc"], basePrice: 2000000 },
    { id: 19, name: "محرك فائق السرعة", req: ["Titanium", "Nickel", "Crude Oil"], basePrice: 10000000 },
    { id: 20, name: "مصفوفة جراحة تبريد", req: ["Diamond", "Silver", "Copper"], basePrice: 250000 }
];

const W_INITIAL = 100000000000;

export const Loot = () => {
    const { user, refreshUser } = useAuth();
    const { showAlert, showConfirm, showToast } = useTerminal();
    const [tileCount, setTileCount] = useState(0);
    const [resources, setResources] = useState<Record<string, number>>({});
    const [inflationFactor, setInflationFactor] = useState(1);
    const [sellAmount, setSellAmount] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. حساب التضخم
            const usersSnap = await getDocs(collection(db, "users"));
            let totalWealth = 0;
            usersSnap.forEach(d => totalWealth += (d.data().balance || 0));
            const factor = Math.max(1, totalWealth / W_INITIAL);
            setInflationFactor(factor);

            // 2. جلب الموارد الحالية
            const currentResources: any = user.resources || {};
            RESOURCES_LIST.forEach(r => { if (!currentResources[r]) currentResources[r] = 0; });

            // 3. التحقق من تاريخ المطالبة
            const lastClaimField = user.lastResourceClaim;

            // إذا لم يسبق له المطالبة، نضع تاريخ "الآن" ونخرج لمنع الحساب الرجعي لعام 1970
            if (!lastClaimField) {
                await updateDoc(doc(db, "users", user.id), {
                    lastResourceClaim: serverTimestamp()
                });
                setResources(currentResources);
                setLoading(false);
                return;
            }

            const lastClaim = lastClaimField.toDate();
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - lastClaim.getTime()) / 86400000);

            // 4. جلب عدد الأراضي
            const q = query(collection(db, "game_map"), where("ownerId", "==", user.id));
            const tilesSnap = await getDocs(q);
            const currentTileCount = tilesSnap.size;
            setTileCount(currentTileCount);

            // 5. إضافة الموارد فقط إذا مر يوم كامل على الأقل
            if (diffDays > 0 && currentTileCount > 0) {
                const amountToAdd = currentTileCount * diffDays;
                const updatedResources = { ...currentResources };
                RESOURCES_LIST.forEach(r => {
                    updatedResources[r] = (updatedResources[r] || 0) + amountToAdd;
                });

                await updateDoc(doc(db, "users", user.id), {
                    resources: updatedResources,
                    lastResourceClaim: serverTimestamp()
                });

                setResources(updatedResources);
                await refreshUser();
            } else {
                setResources(currentResources);
            }
        } catch (error) {
            console.error(error);
            showAlert("خطأ_في_البيانات: فشل استرداد البيانات الصناعية.");
        } finally {
            setLoading(false);
        }
    }, [user, refreshUser, showAlert]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSell = async (product: any) => {
        const qty = sellAmount[product.id] || 0;
        if (qty <= 0) return showAlert("خطأ_تصنيع: حدد كمية التصدير.");
        for (const req of product.req) { if ((resources[req] || 0) < qty) return showAlert(`نقص_موارد: احتياطي ${RESOURCES_MAP[req]} حرج.`); }
        const totalPayout = (product.basePrice * inflationFactor) * qty;
        const confirmed = await showConfirm(`تفويض_دورة_التصنيع: تأكيد ${qty}x ${product.name}؟ العائد المتوقع: ${formatNeuralCurrency(totalPayout)}`);
        if (!confirmed) return;

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", user!.id);
                const userSnap = await transaction.get(userRef);
                const currentRes = userSnap.data()?.resources || {};
                product.req.forEach((r: string) => currentRes[r] -= qty);
                transaction.update(userRef, { resources: currentRes, balance: (userSnap.data()?.balance || 0) + totalPayout });
                transaction.set(doc(collection(db, "activities")), { userId: user!.id, message: `تصدير صناعي: ${qty} ${product.name}`, timestamp: serverTimestamp(), type: 'export' });
                transaction.set(doc(collection(db, "news")), {
                    type: 'commerce', username: user!.username, userColor: user!.color,
                    content: `ازدهار صناعي: ${user!.username} نجح في تصدير شحنة ${product.name}.`,
                    value: totalPayout, timestamp: serverTimestamp()
                });
            });
            showToast(`اكتمل_التصنيع: تم تصدير ${product.name}.`);
            setSellAmount(prev => ({ ...prev, [product.id]: 0 }));
            loadData();
            refreshUser();
        } catch (e: any) {
            showAlert("فشل_الارتباط_الصناعي: تم اختراق البروتوكول.");
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="neural-loader"></div>
            <p className="micro-label" style={{ marginLeft: '1rem', letterSpacing: '2px' }}>جاري مزامنة العقد الصناعية...</p>
        </div>
    );

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.6rem' }}>عقدة_اللوجستيات: التخزين_المركزي</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>مركز الموارد</h1>
                </div>
                <div className="card card-glow" style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Gauge size={16} color="var(--primary)" />
                        <p className="micro-label" style={{ fontSize: '0.6rem', opacity: 0.6 }}>مؤشر التضخم</p>
                    </div>
                    <span className="mono" style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--primary)' }}>x{inflationFactor.toFixed(4)}</span>
                </div>
            </div>

            {/* Territory Stats */}
            <div className="card card-glow" style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-bright)', position: 'relative', overflow: 'hidden' }}>
                <div className="scanline"></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Pickaxe size={16} color="var(--primary)" />
                    <h3 className="micro-label" style={{ fontSize: '0.75rem' }}>تدفق مكافآت الأقاليم</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5 }}>الأقاليم النشطة</p>
                        <span className="mono" style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>{tileCount}</span>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5 }}>العائد اليومي</p>
                        <span className="mono" style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--success)' }}>+{tileCount}</span>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', gridColumn: 'span 2' }}>
                        <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5 }}>إجمالي مخزون الموارد</p>
                        <span className="mono" style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent)' }}>{Object.values(resources).reduce((sum, val) => sum + val, 0).toLocaleString()} وحدة</span>
                    </div>
                </div>
            </div>

            {/* Resources Grid */}
            <div className="card card-glow" style={{ marginBottom: '2.5rem', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-bright)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Database size={16} color="var(--primary)" />
                    <h3 className="micro-label" style={{ fontSize: '0.75rem' }}>مخزون المستودع الآمن</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    {RESOURCES_LIST.map(r => (
                        <div key={r} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-dim)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.4 }}>{RESOURCES_MAP[r]}</p>
                                <Layers size={10} style={{ opacity: 0.2 }} />
                            </div>
                            <p className="mono" style={{ fontSize: '1rem', fontWeight: '900', margin: 0 }}>
                                {resources[r]?.toLocaleString() || 0}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fabrication Terminal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Factory size={20} color="var(--warning)" />
                <h3 className="micro-label" style={{ fontSize: '0.85rem' }}>محطة عقود التصنيع</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {PRODUCTS_DATA.map(p => {
                    const price = p.basePrice * inflationFactor;
                    const canAfford = p.req.every(r => (resources[r] || 0) >= 1);
                    const maxPossible = Math.min(...p.req.map(r => resources[r] || 0));

                    return (
                        <div key={p.id} className="card card-glow" style={{
                            display: 'flex', flexDirection: 'column', padding: '1.25rem',
                            border: canAfford ? '1px solid var(--border-bright)' : '1px solid var(--border-dim)',
                            opacity: canAfford ? 1 : 0.8, borderRadius: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '900' }}>{p.name}</h4>
                                    <p className="micro-label" style={{ color: 'var(--success)', marginTop: '0.2rem', fontSize: '0.65rem' }}>العائد: {formatNeuralCurrency(price)}</p>
                                </div>
                                <Terminal size={14} style={{ opacity: 0.2 }} />
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {p.req.map(r => (
                                        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', fontSize: '0.55rem' }}>
                                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: (resources[r] || 0) > 0 ? 'var(--primary)' : 'var(--danger)' }}></div>
                                            <span style={{ opacity: (resources[r] || 0) > 0 ? 1 : 0.5 }}>{RESOURCES_MAP[r]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="number" placeholder="الكمية"
                                        value={sellAmount[p.id] || ''}
                                        onChange={e => setSellAmount({ ...sellAmount, [p.id]: parseInt(e.target.value) || 0 })}
                                        className="mono"
                                        style={{ flex: 1, fontSize: '0.9rem', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'white', outline: 'none' }}
                                    />
                                    <button onClick={() => setSellAmount({ ...sellAmount, [p.id]: maxPossible })} style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'white', fontSize: '0.6rem' }}>الأقصى ({maxPossible})</button>
                                </div>
                                <button
                                    onClick={() => handleSell(p)}
                                    disabled={!canAfford || !sellAmount[p.id]}
                                    className="primary"
                                    style={{ width: '100%', padding: '0.8rem', fontSize: '0.85rem', background: canAfford ? 'var(--primary)' : 'rgba(255,255,255,0.05)' }}
                                >
                                    تفويض تصدير الشحنة
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 110px !important; }
                }
            `}</style>
        </div>
    );
};
