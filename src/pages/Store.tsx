import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { StoreItem } from '../data/storeRepo';
import { createStore, buyWholesale, listForSale, processBotSale, WHOLESALE_MARKET } from '../data/storeRepo';
import { Plus, ShoppingCart, Building2, Monitor, Truck, Archive, X } from 'lucide-react';

export const StorePage = () => {
    const { user, refreshUser } = useAuth();
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showMarket, setShowMarket] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Electronics');
    const [viewItem, setViewItem] = useState<any>(null);
    const [buyQty, setBuyQty] = useState(10);
    const [sellItem, setSellItem] = useState<StoreItem | null>(null);
    const [sellPrice, setSellPrice] = useState<number>(0);
    const [storeNameInput, setStoreNameInput] = useState('');

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "stores"), where("ownerId", "==", user.id));
        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) setStore({ id: snap.docs[0].id, ...snap.docs[0].data() });
            else setStore(null);
            setLoading(false);
        });
        return unsub;
    }, [user]);

    useEffect(() => {
        if (!store || !store.items) return;
        const interval = setInterval(() => {
            store.items.forEach((item: StoreItem) => {
                if (item.status === 'for_sale' && item.sellingPrice) {
                    const margin = item.sellingPrice / item.basePrice;
                    let chance = 0.05;
                    if (margin < 1.2) chance = 0.3;
                    else if (margin < 1.5) chance = 0.15;
                    else if (margin > 3) chance = 0.01;
                    if (Math.random() < chance) {
                        processBotSale(user!.id, store.id, item).catch(console.error);
                    }
                }
            });
        }, 8000);
        return () => clearInterval(interval);
    }, [store, user]);

    const handleCreateStore = async () => {
        if (!storeNameInput.trim()) return alert("مطلوب تعريف: أدخل اسم المتجر");
        try { await createStore(user!.id, storeNameInput); }
        catch (e: any) { alert(e.message); }
    };

    const handleBuyWholesale = async () => {
        if (!viewItem) return;
        try {
            await buyWholesale(user!.id, store.id, viewItem, buyQty);
            setShowMarket(false);
            setViewItem(null);
            refreshUser();
        } catch (e: any) { alert(e.message); }
    };

    const handleListForSale = async () => {
        if (!sellItem) return;
        if (sellPrice < sellItem.basePrice && !window.confirm("تحذير_خسارة: البيع بأقل من تكلفة الاستحواذ. هل تستمر؟")) return;
        try {
            await listForSale(store.id, sellItem.id, sellPrice);
            setSellItem(null);
        } catch (e: any) { alert(e.message); }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div className="neural-loader"></div>
                <p className="micro-label" style={{ marginTop: '2rem', letterSpacing: '2px' }}>جاري الاتصال بالشبكة التجارية...</p>
            </div>
        );
    }

    if (!store) {
        return (
            <div className="page-container fade-in" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div className="card card-glow" style={{ textAlign: 'center', padding: '2rem 1.5rem', borderStyle: 'double', borderWidth: '3px' }}>
                    <div className="icon-action" style={{ width: '60px', height: '60px', margin: '0 auto 1rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: '15px' }}>
                        <Building2 size={30} color="var(--primary)" />
                    </div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '1px' }}>بروتوكول تأسيس الشركة</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.6rem', margin: '0.5rem 0' }}>مشروع جينيسيس</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
                        قم بإنشاء عقدة بيع متخصصة داخل شبكة التجارة السيادية. احصل على حقوق التصفية الذاتية وأولوية سلاسل الإمداد العالمية.
                    </p>

                    <div style={{ background: 'var(--surface-soft)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-bright)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span className="micro-label" style={{ fontSize: '0.6rem' }}>رسوم الترخيص</span>
                            <span className="mono" style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.8rem' }}>$10,000,000,000</span>
                        </div>
                        <input
                            placeholder="تحديد_اسم_العقدة"
                            value={storeNameInput}
                            onChange={e => setStoreNameInput(e.target.value)}
                            className="mono"
                            style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '1rem', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', border: '1px solid var(--border-bright)', color: 'white' }}
                        />
                        <button
                            onClick={handleCreateStore}
                            disabled={(user?.balance || 0) < 10000000000}
                            className="primary"
                            style={{ width: '100%', padding: '1rem', fontSize: '0.85rem' }}
                        >
                            {(user?.balance || 0) < 10000000000 ? 'نقص في رأس المال' : 'تفويض الترخيص'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            {/* Header Strategy View */}
            <div className="card card-glow" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <div className="status-dot"></div>
                        <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.55rem' }}>محطة اللوجستيات: متصل</p>
                    </div>
                    <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.2rem' }}>{store.name}</h1>
                </div>
                <div style={{ textAlign: 'left' }}>
                    <p className="micro-label" style={{ fontSize: '0.55rem' }}>الثقل_العالمي</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Monitor size={12} color="var(--primary)" />
                        <span className="mono" style={{ fontSize: '0.9rem', fontWeight: '900' }}>{store.items?.length || 0} وحدة</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Archive size={16} color="var(--primary)" />
                <h3 className="micro-label" style={{ fontSize: '0.7rem', opacity: 0.7 }}>مصفوفة المخزون النشط</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {store.items?.length > 0 ? store.items.map((item: StoreItem) => (
                    <div key={item.id} className="card card-glow" style={{ padding: 0, overflow: 'hidden', border: item.status === 'for_sale' ? '1px solid var(--primary)' : '1px solid var(--border-dim)', borderRadius: '16px' }}>
                        <div style={{ height: '140px', position: 'relative' }}>
                            <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,11,20,0.9), transparent)' }}></div>
                            <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                <span className={`status-badge ${item.status === 'for_sale' ? 'connected' : ''}`} style={{ fontSize: '0.55rem', padding: '0.2rem 0.5rem' }}>
                                    {item.status === 'for_sale' ? 'للبيع' : 'في المخزن'}
                                </span>
                            </div>
                            <div style={{ position: 'absolute', bottom: '0.75rem', left: '1rem' }}>
                                <p className="micro-label" style={{ color: 'var(--primary)', marginBottom: '0.1rem', fontSize: '0.5rem' }}>الوحدات على الرف</p>
                                <p className="mono" style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>{item.quantity.toString().padStart(3, '0')}</p>
                            </div>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>{item.name}</h4>

                            {item.status === 'storage' ? (
                                <div className="fade-in">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px' }}>
                                        <span className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>قيمة الاستحواذ</span>
                                        <span className="mono" style={{ fontSize: '0.85rem' }}>${item.basePrice.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={() => { setSellItem(item); setSellPrice(Math.round(item.basePrice * 1.5)); }}
                                        className="primary"
                                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.7rem' }}
                                    >
                                        بدء تسييل الأصول
                                    </button>
                                </div>
                            ) : (
                                <div className="fade-in">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <ShoppingCart size={12} color="var(--success)" />
                                            <span className="micro-label" style={{ color: 'var(--success)', fontSize: '0.6rem' }}>عرض نشط</span>
                                        </div>
                                        <span className="mono" style={{ fontWeight: '900', color: 'var(--success)', fontSize: '1rem' }}>${item.sellingPrice?.toLocaleString()}</span>
                                    </div>
                                    <div style={{ height: '3px', background: 'var(--surface-soft)', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                                        <div className="progress-fill" style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--success))' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.4 }}>
                                        <p className="micro-label" style={{ fontSize: '0.5rem' }}>دورة استهلاك AI</p>
                                        <p className="micro-label" style={{ fontSize: '0.5rem' }}>قيمة السوق: 1.2x</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="card" style={{ padding: '4rem 1.5rem', textAlign: 'center', borderStyle: 'dashed', background: 'transparent' }}>
                        <Truck size={40} color="var(--border-bright)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <p className="micro-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الاحتياطيات الاستراتيجية نافدة. ادخل محطة الجملة لإعادة التعبئة.</p>
                        <button onClick={() => setShowMarket(true)} className="primary" style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', fontSize: '0.8rem' }}>فتح رابط المحطة</button>
                    </div>
                )}
            </div>

            {/* Floating Operations Hub */}
            <button
                onClick={() => setShowMarket(true)}
                className="war-fab"
                style={{ background: 'var(--primary)', bottom: '90px', right: '1.25rem', width: '56px', height: '56px', borderRadius: '16px', boxShadow: '0 0 20px var(--primary-glow)', zIndex: 80 }}
            >
                <Plus size={28} color="white" />
            </button>

            {/* Logistics Terminal Overlay - Redesigned for Mobile */}
            {showMarket && (
                <div className="engagement-overlay fade-in" style={{ padding: 0, zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: 0, border: 'none' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-bright)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10,11,20,0.95)', backdropFilter: 'blur(10px)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.1rem' }}>
                                    <Truck size={12} color="var(--primary)" />
                                    <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.55rem' }}>رابط الشحن: نشط</p>
                                </div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>مركز الجملة العالمي</h2>
                            </div>
                            <button onClick={() => setShowMarket(false)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', padding: '0.5rem' }}><X size={20} /></button>
                        </div>

                        {/* Tactical Navigation - Horizontal Scroll */}
                        <div style={{ display: 'flex', gap: '0.6rem', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', overflowX: 'auto', borderBottom: '1px solid var(--border-dim)', scrollbarWidth: 'none' }}>
                            {['Electronics', 'Automotive', 'Fashion', 'Furniture', 'Food'].map(c => {
                                const names:any = { Electronics: 'إلكترونيات', Automotive: 'سيارات', Fashion: 'أزياء', Furniture: 'أثاث', Food: 'أغذية' };
                                return (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedCategory(c)}
                                        style={{
                                            background: selectedCategory === c ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                            color: selectedCategory === c ? 'white' : 'var(--text-muted)',
                                            border: '1px solid ' + (selectedCategory === c ? 'var(--primary)' : 'var(--border-dim)'),
                                            whiteSpace: 'nowrap', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.7rem', transition: '0.2s'
                                        }}
                                    >
                                        {names[c]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Marketplace Mesh - 2 columns for mobile */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', background: '#03040b', paddingBottom: '100px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {WHOLESALE_MARKET.filter(i => i.category === selectedCategory).map(p => (
                                    <div
                                        key={p.id}
                                        className="card"
                                        onClick={() => { setViewItem(p); setBuyQty(10); }}
                                        style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', border: '1px solid var(--border-dim)' }}
                                    >
                                        <div style={{ height: '100px', position: 'relative' }}>
                                            <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                            <div style={{ position: 'absolute', bottom: '0.4rem', right: '0.4rem', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px' }}>
                                                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>${p.price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div style={{ padding: '0.6rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.7rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Acquisition Detail Board */}
            {viewItem && (
                <div className="engagement-overlay fade-in" style={{ zIndex: 3000, background: 'rgba(5,5,8,0.98)', padding: '1rem' }}>
                    <div className="engagement-card" style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--primary)', padding: '1.25rem', borderRadius: '24px' }}>
                        <div className="scanline"></div>
                        <img src={viewItem.image} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px', border: '1px solid var(--border-bright)' }} />

                        <div style={{ margin: '1.25rem 0' }}>
                            <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.55rem' }}>مواصفات الفئة</p>
                            <h2 className="mono" style={{ fontSize: '1.3rem', margin: '0.2rem 0' }}>{viewItem.name}</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div className="intel-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '12px' }}>
                                <p className="micro-label" style={{ fontSize: '0.5rem' }}>سعر الوحدة</p>
                                <p className="mono" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>${viewItem.price.toLocaleString()}</p>
                            </div>
                            <div className="intel-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '12px' }}>
                                <p className="micro-label" style={{ fontSize: '0.5rem' }}>قطاع الشبكة</p>
                                <p className="mono" style={{ fontSize: '0.75rem' }}>{viewItem.category}</p>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-dim)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <label className="micro-label" style={{ fontSize: '0.6rem' }}>تحديد الكمية</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[10, 50, 100].map(q => (
                                        <button key={q} onClick={() => setBuyQty(q)} style={{ background: buyQty === q ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', color: 'white', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.6rem' }}>{q}U</button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="number"
                                value={buyQty}
                                onChange={e => setBuyQty(Math.max(1, Number(e.target.value)))}
                                className="mono"
                                style={{ width: '100%', fontSize: '1.5rem', color: 'var(--primary)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--primary)', textAlign: 'center', outline: 'none' }}
                            />
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>رأس المال المطلوب</span>
                                <span className="mono" style={{ color: 'var(--warning)', fontSize: '1.1rem', fontWeight: '900' }}>${(buyQty * viewItem.price).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button onClick={handleBuyWholesale} disabled={((user?.balance || 0) < (buyQty * viewItem.price))} className="primary" style={{ flex: 2, padding: '1rem', fontSize: '0.9rem' }}>
                                {(user?.balance || 0) < (buyQty * viewItem.price) ? 'الرصيد غير كافٍ' : 'بدء عملية التحويل'}
                            </button>
                            <button onClick={() => setViewItem(null)} className="micro-label" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', fontSize: '0.7rem' }}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sales Deployment HUD */}
            {sellItem && (
                <div className="engagement-overlay fade-in" style={{ zIndex: 3000, background: 'rgba(5,5,8,0.95)', padding: '1rem' }}>
                    <div className="engagement-card" style={{ width: '100%', border: '1px solid var(--success)', borderRadius: '24px', padding: '1.5rem' }}>
                        <div className="scanline"></div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <img src={sellItem.imageUrl} style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }} />
                            <div>
                                <p className="micro-label" style={{ color: 'var(--success)', fontSize: '0.55rem' }}>بروتوكول التسييل V3</p>
                                <h3 className="mono" style={{ margin: 0, fontSize: '1rem' }}>{sellItem.name}</h3>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div className="intel-item">
                                <p className="micro-label" style={{ fontSize: '0.5rem' }}>تكلفة الوحدة</p>
                                <p className="mono" style={{ fontSize: '0.85rem' }}>${sellItem.basePrice.toLocaleString()}</p>
                            </div>
                            <div className="intel-item">
                                <p className="micro-label" style={{ fontSize: '0.5rem' }}>حجم الدفعة</p>
                                <p className="mono" style={{ fontSize: '0.85rem' }}>{sellItem.quantity} وحدة</p>
                            </div>
                        </div>

                        <div style={{ background: 'var(--surface-soft)', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--success)', textAlign: 'center' }}>
                            <p className="micro-label" style={{ marginBottom: '0.5rem', opacity: 0.6, fontSize: '0.55rem' }}>تحديد سعر البيع المستهدف</p>
                            <input
                                type="number"
                                value={sellPrice}
                                onChange={e => setSellPrice(Number(e.target.value))}
                                className="mono"
                                style={{ width: '100%', fontSize: '2rem', color: 'var(--success)', background: 'transparent', border: 'none', borderBottom: '2px dashed var(--success)', textAlign: 'center', fontWeight: '900', outline: 'none' }}
                            />
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                                <div>
                                    <p className="micro-label" style={{ fontSize: '0.5rem' }}>هامش الربح</p>
                                    <p className="mono" style={{ color: 'var(--success)', fontSize: '0.8rem' }}>+{((sellPrice / sellItem.basePrice - 1) * 100).toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p className="micro-label" style={{ fontSize: '0.5rem' }}>الإيراد المتوقع</p>
                                    <p className="mono" style={{ color: 'white', fontSize: '0.8rem' }}>${(sellPrice * sellItem.quantity).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button onClick={handleListForSale} className="primary" style={{ flex: 2, background: 'var(--success)', padding: '1rem', fontSize: '0.85rem' }}>تفعيل عقد البيع</button>
                            <button onClick={() => setSellItem(null)} className="micro-label" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', fontSize: '0.7rem' }}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 150px !important; }
                }
                .weapon-scroll::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};