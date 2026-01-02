import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Shield, ArrowLeft, Crosshair, Zap, Sword, Target, Binary } from 'lucide-react';
import weaponsData from '../data/WEAPONS.json';

const WEAPONS_DATA = weaponsData;

export const Weapons = () => {
    const { user, refreshUser } = useAuth();
    const [selectedWeapon, setSelectedWeapon] = useState<any>(null);
    const [n, setN] = useState<number>(1);
    const [buying, setBuying] = useState(false);

    const handleBuy = async () => {
        if (!selectedWeapon || !user) return;
        const B = selectedWeapon.price * n;
        const C = user.balance - B;

        if (C < 0) return alert("إنذار المشتريات: تم اكتشاف نقص في رأس المال.");

        if (!window.confirm(`تفويض الاستحواذ: تأكيد نشر ${n} وحدة من ${selectedWeapon.name}؟ إجمالي التكلفة: $${B.toLocaleString()}`)) return;

        setBuying(true);
        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, {
                balance: C,
                ownedWeapons: arrayUnion({
                    id: selectedWeapon.id,
                    name: selectedWeapon.name,
                    type: selectedWeapon.type,
                    power: selectedWeapon.power,
                    quantity: n,
                    purchasedAt: new Date()
                })
            });

            await addDoc(collection(db, "activities"), {
                userId: user.id,
                message: `لوجستيات: تم نشر ${n}x ${selectedWeapon.name} (مؤشر القوة: ${selectedWeapon.power})`,
                timestamp: serverTimestamp(),
                type: 'purchase'
            });

            await refreshUser();
            setSelectedWeapon(null);
            setN(1);
        } catch (e: any) {
            alert("فشل الارتباط: تم إلغاء المعاملة من التخزين المؤقت.");
        }
        setBuying(false);
    };

    if (selectedWeapon) {
        const B = selectedWeapon.price * n;
        const C = (user?.balance || 0) - B;

        return (
            <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
                <button
                    onClick={() => { setSelectedWeapon(null); setN(1); }}
                    className="micro-label"
                    style={{ background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                >
                    <ArrowLeft size={14} /> إنهاء_العرض // العودة_إلى_المخزن
                </button>

                <div className="card card-glow" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--danger)', borderRadius: '20px' }}>
                    {/* Weapon Visual Area - Optimized height */}
                    <div style={{ height: '200px', width: '100%', background: 'linear-gradient(135deg, #050508 0%, #1a0808 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'repeating-linear-gradient(0deg, var(--danger) 0px, transparent 1px, transparent 15px)', backgroundSize: '100% 15px' }}></div>
                        
                        {selectedWeapon.type === 'Attack' ? 
                            <Crosshair size={80} color="var(--danger)" style={{ opacity: 0.6, filter: 'drop-shadow(0 0 10px var(--danger))' }} /> : 
                            <Shield size={80} color="var(--primary)" style={{ opacity: 0.6, filter: 'drop-shadow(0 0 10px var(--primary))' }} />
                        }

                        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', textAlign: 'right' }}>
                            <p className="micro-label" style={{ fontSize: '0.5rem' }}>قوة_الإشارة</p>
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
                                {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 3, height: 3 * i, background: i < 5 ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}></div>)}
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span className={`status-badge ${selectedWeapon.type === 'Attack' ? 'neutral' : ''}`} style={{ fontSize: '0.55rem', padding: '0.2rem 0.5rem' }}>
                                    {selectedWeapon.type === 'Attack' ? 'ذخيرة_فئة_الهجوم' : 'ذخيرة_فئة_الدفاع'}
                                </span>
                                <span className="micro-label" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-dim)', fontSize: '0.55rem' }}>
                                    معرف: {selectedWeapon.id.toUpperCase()}
                                </span>
                            </div>
                            <h1 className="text-gradient" style={{ fontSize: '1.6rem', margin: 0 }}>{selectedWeapon.name}</h1>
                            
                            <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
                                <p className="micro-label" style={{ fontSize: '0.55rem', marginBottom: '0.2rem' }}>قيمة الوحدة في السوق</p>
                                <h2 className="mono" style={{ fontSize: '1.4rem', margin: 0 }}>${selectedWeapon.price.toLocaleString()}</h2>
                            </div>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{selectedWeapon.description}</p>

                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <Binary size={16} color="var(--danger)" />
                                <h3 className="micro-label" style={{ fontSize: '0.7rem' }}>تحليل مقياس المشتريات</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div className="intel-item">
                                    <p className="micro-label" style={{ fontSize: '0.5rem' }}>تقييم القوة</p>
                                    <p className="mono" style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>{selectedWeapon.power.toLocaleString()} PWR</p>
                                </div>
                                <div className="intel-item">
                                    <p className="micro-label" style={{ fontSize: '0.5rem' }}>مستوى التهديد</p>
                                    <p className="mono" style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>حرج</p>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '15px', border: '1px solid var(--border-dim)' }}>
                                <label className="micro-label" style={{ marginBottom: '0.5rem', display: 'block', textAlign: 'center', fontSize: '0.6rem' }}>الوحدات المطلوب تجهيزها (n)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={n}
                                    onChange={e => setN(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="mono"
                                    style={{ fontSize: '1.8rem', padding: '0.5rem', background: 'transparent', border: 'none', borderBottom: '2px solid var(--danger)', textAlign: 'center', width: '100%', color: 'var(--danger)', outline: 'none' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
                                    <span className="micro-label" style={{ fontSize: '0.55rem' }}>إجمالي رأس المال (B)</span>
                                    <span className="mono" style={{ fontSize: '1.1rem', fontWeight: '900' }}>${B.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', opacity: 0.6 }}>
                                    <span className="micro-label" style={{ fontSize: '0.55rem' }}>السيولة المتبقية (C)</span>
                                    <span className="mono" style={{ color: C < 0 ? 'var(--danger)' : 'var(--success)', fontSize: '1rem' }}>${C.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleBuy}
                            disabled={C < 0 || buying}
                            className="primary"
                            style={{
                                width: '100%',
                                marginTop: '1.5rem',
                                padding: '1.1rem',
                                background: C < 0 ? 'var(--surface-soft)' : 'linear-gradient(135deg, #450a0a, #ef4444)',
                                boxShadow: C < 0 ? 'none' : '0 0 30px rgba(239, 68, 68, 0.3)',
                                border: '1px solid white',
                                fontSize: '0.9rem',
                                fontWeight: '900'
                            }}
                        >
                            {buying ? 'جاري مزامنة الذخيرة...' : (C < 0 ? 'تم رفض الوصول: نقص الأموال' : `تفويض الاستحواذ ($${B.toLocaleString()})`)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--danger)', letterSpacing: '2px', fontSize: '0.6rem' }}>رابط_المخزن: وصول_مقيد</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>مخزن السوق السوداء</h1>
                </div>
                <div className="system-status" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', width: 'fit-content' }}>
                    <div className="status-dot" style={{ background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }}></div>
                    <span className="micro-label" style={{ color: 'var(--danger)', fontSize: '0.55rem' }}>بث مباشر للأسلحة</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {WEAPONS_DATA.map((weapon: any) => (
                    <div
                        key={weapon.id}
                        className="card card-glow"
                        onClick={() => setSelectedWeapon(weapon)}
                        style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-dim)', borderRadius: '16px' }}
                    >
                        <div style={{ height: '140px', width: '100%', background: 'linear-gradient(135deg, #0a0b10, #161824)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <div className="scanline" style={{ opacity: 0.1 }}></div>
                            {weapon.type === 'Attack' ? <Target size={40} color="var(--danger)" style={{ opacity: 0.3 }} /> : <Shield size={40} color="var(--primary)" style={{ opacity: 0.3 }} />}

                            <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                <span className={`status-badge ${weapon.type === 'Attack' ? 'neutral' : ''}`} style={{ fontSize: '0.5rem', padding: '0.2rem 0.4rem' }}>{weapon.type === 'Attack' ? 'هجومي' : 'دفاعي'}</span>
                            </div>
                        </div>

                        <div style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>{weapon.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)' }}>
                                    <Zap size={10} /> <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{weapon.power.toLocaleString()}</span>
                                </div>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 1rem', lineHeight: '1.4' }}>
                                {weapon.description}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                <div>
                                    <span className="micro-label" style={{ display: 'block', opacity: 0.5, fontSize: '0.5rem' }}>تكلفة الوحدة</span>
                                    <span className="mono" style={{ fontWeight: '900', fontSize: '1.1rem', color: 'white' }}>${weapon.price.toLocaleString()}</span>
                                </div>
                                <div className="icon-action" style={{ background: 'var(--surface-soft)', color: 'var(--danger)', width: '32px', height: '32px', border: '1px solid var(--border-bright)' }}>
                                    <Sword size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <style>{`
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 110px !important; }
                }
            `}</style>
        </div>
    );
};