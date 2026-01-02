import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { formatNeuralCurrency } from '../utils/formatters';
import { Shield, Target, Cpu, Fingerprint, Globe, Layers } from 'lucide-react';

export const Home = () => {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [territoryCount, setTerritoryCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const qL = query(collection(db, "users"), orderBy("balance", "desc"), limit(5));
        const unsubL = onSnapshot(qL, (snap) => {
            setLeaderboard(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qA = query(collection(db, "activities"), where("userId", "==", user?.id), orderBy("timestamp", "desc"), limit(10));
        const unsubA = onSnapshot(qA, (snap) => {
            setActivities(snap.docs.map(doc => doc.data()));
        });

        const qT = query(collection(db, "game_map"), where("ownerId", "==", user?.id));
        const unsubT = onSnapshot(qT, (snap) => {
            setTerritoryCount(snap.size);
        });

        return () => { unsubL(); unsubA(); unsubT(); };
    }, [user]);

    if (!user) {
        return (
            <div className="page-container fade-in" style={{ padding: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const balance = user.balance || 0;
    const defenseScore = user.ownedWeapons?.filter((w: any) => w.type === 'Defense')
        .reduce((sum: number, w: any) => sum + (w.power || 0) * (w.quantity || 1), 0) || 0;
    const defenseIndex = Math.min(Math.floor((defenseScore / 5000) * 100), 100);

    const sovereignClass = balance > 1000000000 ? 'S' :
        balance > 100000000 ? 'A' :
            balance > 10000000 ? 'B' :
                balance > 1000000 ? 'C' : 'D';

    const dailyEarnings = user.ownedCompanies?.reduce((sum: number, c: any) => sum + (c.dailyValue || 0), 0) || 0;
    const estROI = balance > 0 ? ((dailyEarnings / balance) * 100).toFixed(2) : "0.00";

    return (
        <div className="page-container fade-in" style={{ padding: '1rem' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.65rem' }}>الارتباط_المركزي: جلسة_نشطة</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>المحطة العصبية</h1>
                </div>
                <div className="system-status" style={{ padding: '0.3rem 0.6rem', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                    <div className="status-dot"></div>
                    <span className="micro-label" style={{ fontSize: '0.6rem' }}>مزامنة_OK</span>
                </div>
            </div>

            <div className="mobile-grid-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Net Worth HUB - Optimized for Mobile */}
                <div className="card card-glow" style={{ minHeight: '180px', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
                    <div className="scanline"></div>
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', opacity: 0.05 }}>
                        <Fingerprint size={80} />
                    </div>

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p className="micro-label" style={{ letterSpacing: '1px', fontSize: '0.65rem', opacity: 0.7 }}>إجمالي الأصول السائلة</p>
                        <h2 className="mono" style={{ fontSize: '2.2rem', margin: '0.5rem 0', letterSpacing: '-1px', wordBreak: 'break-all' }}>
                            ${formatNeuralCurrency(balance)}
                        </h2>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <p className="micro-label" style={{ opacity: 0.5, marginBottom: '0.2rem', fontSize: '0.6rem' }}>معامل العائد التقديري</p>
                                <div className="mono" style={{ color: 'var(--success)', fontSize: '1rem', fontWeight: '900' }}>+{estROI}%</div>
                            </div>
                            <div style={{ width: '1px', height: '30px', background: 'var(--border-dim)' }}></div>
                            <div style={{ flex: 1 }}>
                                <p className="micro-label" style={{ opacity: 0.5, marginBottom: '0.2rem', fontSize: '0.6rem' }}>التصنيف السيادي</p>
                                <div className="mono" style={{ color: 'var(--primary)', fontSize: '1rem', fontWeight: '900' }}>فئة_{sovereignClass}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tactical Metrics - Stacking on mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-bright)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), transparent)' }}>
                        <p className="micro-label" style={{ marginBottom: '0.5rem', color: 'var(--danger)', fontSize: '0.6rem' }}>مؤشر الهيمنة</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Target size={18} color="var(--danger)" />
                            <span className="mono" style={{ fontWeight: '900', fontSize: '1.2rem' }}>{territoryCount}</span>
                        </div>
                        <div style={{ marginTop: '0.75rem', height: '3px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '2px' }}>
                            <div style={{ width: `${Math.min(territoryCount * 2, 100)}%`, height: '100%', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }}></div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-bright)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)' }}>
                        <p className="micro-label" style={{ marginBottom: '0.5rem', color: 'var(--primary)', fontSize: '0.6rem' }}>معامل الدفاع</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={18} color="var(--primary)" />
                            <span className="mono" style={{ fontWeight: '900', fontSize: '1.2rem' }}>{defenseIndex}</span>
                        </div>
                        <div style={{ marginTop: '0.75rem', height: '3px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '2px' }}>
                            <div style={{ width: `${defenseIndex}%`, height: '100%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }}></div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Terminal */}
                <div className="card card-glow" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <Globe size={16} color="var(--warning)" />
                        <h3 className="micro-label" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>رابط النخبة العالمي</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {leaderboard.map((u, index) => (
                            <div key={u.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '12px',
                                border: index === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-dim)',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span className="mono" style={{ width: '15px', fontSize: '0.75rem', fontWeight: '900', color: index === 0 ? 'var(--warning)' : 'var(--text-micro)' }}>{index + 1}</span>
                                    <img src={u.photoUrl || 'https://via.placeholder.com/32'} alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1.5px solid ${u.color || 'var(--border-dim)'}` }} />
                                    <div style={{ overflow: 'hidden', maxWidth: '80px' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</span>
                                    </div>
                                </div>
                                <span className="mono" style={{ fontWeight: '900', fontSize: '0.85rem', color: index === 0 ? 'var(--warning)' : 'white' }}>
                                    ${formatNeuralCurrency(u.balance || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Log Stream Terminal */}
                <div className="card card-glow" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <Cpu size={16} color="var(--accent)" />
                        <h3 className="micro-label" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>تدفق السجلات العصبية</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '300px', overflowY: 'auto' }} className="custom-scrollbar">
                        {activities.length > 0 ? activities.map((a, i) => (
                            <div key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-dim)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-main)', paddingRight: '10px' }}>{a.message}</span>
                                    <span className="mono" style={{ fontSize: '8px', color: 'var(--text-micro)', whiteSpace: 'nowrap' }}>
                                        {a.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '4px' }}>
                                        {a.type?.toUpperCase() || 'حدث_نظام'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                <Layers size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                <p className="micro-label" style={{ fontSize: '0.6rem' }}>لا يوجد نشاط عصبي مكتشف</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Inventory Section - Stacking layout for Mobile */}
                <div className="card card-glow" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Layers size={16} color="var(--warning)" />
                        <h3 className="micro-label" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>مخزن الجرد العصبي</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* 1. ORDNANCE */}
                        <div>
                            <p className="micro-label" style={{ color: 'var(--danger)', marginBottom: '0.75rem', fontSize: '0.6rem' }}>احتياطيات الذخيرة</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem' }}>
                                {user?.ownedWeapons && user.ownedWeapons.length > 0 ? user.ownedWeapons.map((w: any) => (
                                    <div key={w.id} className="card" style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="mono" style={{ fontSize: '0.75rem' }}>{w.name}</span>
                                        <span className="mono" style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '0.8rem' }}>x{w.quantity}</span>
                                    </div>
                                )) : <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.65rem' }}>لا توجد ذخيرة نشطة</p>}
                            </div>
                        </div>

                        {/* 2. CORPORATE */}
                        <div>
                            <p className="micro-label" style={{ color: 'var(--success)', marginBottom: '0.75rem', fontSize: '0.6rem' }}>حصص الشركات</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                {user?.ownedCompanies && user.ownedCompanies.length > 0 ? user.ownedCompanies.map((c: any, i: number) => (
                                    <div key={i} className="card" style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', textAlign: 'center' }}>
                                        <span className="mono" style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{c.name}</span>
                                    </div>
                                )) : <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.65rem' }}>لا توجد حصص نشطة</p>}
                            </div>
                        </div>

                        {/* 3. SOVEREIGN ASSETS */}
                        <div>
                            <p className="micro-label" style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '0.6rem' }}>الأصول السيادية</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {user?.possessions && user.possessions.length > 0 ? user.possessions.map((p: any, i: number) => (
                                    <div key={i} className="card" style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-bright)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                        <img src={p.image} alt="" style={{ width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover' }} />
                                        <div style={{ overflow: 'hidden' }}>
                                            <p className="mono" style={{ fontSize: '0.75rem', margin: 0, color: 'white' }}>{p.name}</p>
                                            <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5 }}>{p.category}</p>
                                        </div>
                                    </div>
                                )) : <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.65rem' }}>لا توجد أصول مؤمنة</p>}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-dim); border-radius: 10px; }
                
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 100px !important; }
                }
            `}</style>
        </div>
    );
};