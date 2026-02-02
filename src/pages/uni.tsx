import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, TrendingUp,
    Crown, BarChart3, ChevronRight,
    Layers, Zap, Info, X
} from 'lucide-react';
import { formatNeuralCurrency } from '../utils/formatters';

const UNIVERSES_BASE = [
    { id: 0, name: "الكون 0", ruler: "Omni-Zeno", baseWealth: 50000000000000, currency: "Omni-Credit", rate: 250, color: "#ffffff" },
    { id: 1, name: "الكون 1", ruler: "Iwen", baseWealth: 12000000000000, currency: "Divine Aura", rate: 180, color: "#facc15" },
    { id: 12, name: "الكون 12", ruler: "Geene", baseWealth: 8000000000000, currency: "Equilibrium", rate: 140, color: "#60a5fa" },
    { id: 8, name: "الكون 8", ruler: "Liquiir", baseWealth: 5000000000000, currency: "Speed Flux", rate: 110, color: "#f87171" },
    { id: 7, name: "الكون 7", ruler: "X", baseWealth: 0, currency: "Neural Dollar", rate: 1, color: "#6366f1" }, // ديناميكي
    { id: 6, name: "الكون 6", ruler: "Champa", baseWealth: 250000000000, currency: "Champa Credit", rate: 0.85, color: "#fb923c" },
    { id: 11, name: "الكون 11", ruler: "Belmod", baseWealth: 180000000000, currency: "Justice Token", rate: 0.75, color: "#ef4444" },
    { id: 10, name: "الكون 10", ruler: "Rumsshi", baseWealth: 120000000000, currency: "Power Stone", rate: 0.65, color: "#a855f7" },
    { id: 2, name: "الكون 2", ruler: "Helles", baseWealth: 90000000000, currency: "Beauty Aura", rate: 0.55, color: "#ec4899" },
    { id: 3, name: "الكون 3", ruler: "Mosco", baseWealth: 70000000000, currency: "Robo-Circuit", rate: 0.45, color: "#94a3b8" },
    { id: 5, name: "الكون 5", ruler: "Arack", baseWealth: 50000000000, currency: "Balance Shard", rate: 0.35, color: "#10b981" },
    { id: 9, name: "الكون 9", ruler: "Sidra", baseWealth: 30000000000, currency: "Chaos Bit", rate: 0.25, color: "#78350f" },
    { id: 4, name: "الكون 4", ruler: "Quitela", baseWealth: 15000000000, currency: "Illusion Coin", rate: 0.15, color: "#4ade80" },
];

export const Multiverse = () => {
    const [universes, setUniverses] = useState<any[]>([]);
    const [selectedUni, setSelectedUni] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            let total = 0;
            snap.forEach(doc => {
                total += (doc.data().balance || 0);
            });

            const updated = UNIVERSES_BASE.map(u => {
                if (u.id === 7) return { ...u, baseWealth: total };
                return u;
            }).sort((a, b) => b.baseWealth - a.baseWealth);

            setUniverses(updated);
            setLoading(false);
        });

        return unsub;
    }, []);

    if (loading) return (
        <div className="multiverse-loading">
            <div className="cosmic-spinner"></div>
            <p className="mono animate-pulse">مزامنة البيانات بين الأبعاد...</p>
        </div>
    );

    return (
        <div className="multiverse-root">
            {/* Background Effects */}
            <div className="cosmic-bg">
                <div className="nebula red"></div>
                <div className="nebula blue"></div>
                <div className="stars"></div>
            </div>

            <div className="multiverse-content">
                <header className="multiverse-header">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hud-label"
                    >
                        <Layers size={14} className="text-primary" />
                        <span>MULTIVERSE_RANKING_PROTOCOL_v4.2</span>
                    </motion.div>

                    <div className="header-main">
                        <h1 className="cyber-title">التصنيف الكوني للمادة</h1>
                        <div className="header-stats">
                            <div className="h-stat">
                                <span className="h-label">الناتج الكلي</span>
                                <span className="h-val mono">{formatNeuralCurrency(universes.reduce((acc, current) => acc + current.baseWealth, 0))}</span>
                            </div>
                            <div className="h-divider"></div>
                            <div className="h-stat">
                                <span className="h-label">الأكوان المرصودة</span>
                                <span className="h-val mono">{universes.length}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="ticker-section">
                    <div className="ticker-track">
                        {[...universes, ...universes].map((u, i) => (
                            <div key={i} className="ticker-uni">
                                <span className="dot" style={{ background: u.color }}></span>
                                <span className="name mono">{u.name}</span>
                                <span className="val mono">{formatNeuralCurrency(u.baseWealth)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="universe-grid">
                    <AnimatePresence mode="popLayout">
                        {universes.map((uni, index) => (
                            <motion.div
                                key={uni.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                                className={`uni-entry ${uni.id === 7 ? 'uni-entry--current' : ''}`}
                                onClick={() => setSelectedUni(uni)}
                            >
                                <div className="uni-rank mono">#{index + 1}</div>

                                <div className="uni-visual">
                                    <div className="uni-orb" style={{ background: `radial-gradient(circle, ${uni.color}44 0%, transparent 70%)` }}>
                                        <div className="uni-core" style={{ background: uni.color }}></div>
                                    </div>
                                </div>

                                <div className="uni-details">
                                    <h3 className="uni-name">{uni.name}</h3>
                                    <div className="uni-meta">
                                        <span><Crown size={12} /> {uni.ruler}</span>
                                        <span><Zap size={12} /> {uni.currency}</span>
                                    </div>
                                </div>

                                <div className="uni-wealth">
                                    <div className="wealth-main mono">{formatNeuralCurrency(uni.baseWealth)}</div>
                                    <div className="wealth-sub mono">RATE: {uni.rate} ND</div>
                                </div>

                                <div className="uni-action">
                                    <ChevronRight size={20} />
                                </div>

                                {uni.id === 7 && <div className="user-uni-badge">نظامك الإقليمي</div>}
                                <div className="hover-glow" style={{ background: `radial-gradient(400px circle at var(--x) var(--y), ${uni.color}11, transparent 40%)` }}></div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Universe Detail Modal */}
            <AnimatePresence>
                {selectedUni && (
                    <div className="uni-modal-overlay">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="modal-backdrop"
                            onClick={() => setSelectedUni(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="uni-modal-content"
                            style={{ '--accent': selectedUni.color } as any}
                        >
                            <div className="modal-header">
                                <div className="modal-title-group">
                                    <span className="modal-subtitle mono">DATA_EXTRACT_ID: {selectedUni.id}</span>
                                    <h2 className="modal-title">{selectedUni.name}</h2>
                                </div>
                                <button className="modal-close" onClick={() => setSelectedUni(null)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <section className="modal-intel">
                                    <div className="intel-card">
                                        <div className="intel-label">وصف البعد</div>
                                        <p className="intel-text">{selectedUni.desc}</p>
                                    </div>

                                    <div className="intel-grid">
                                        <div className="intel-item">
                                            <BarChart3 className="icon" />
                                            <div className="label">الثروة السيادية</div>
                                            <div className="val mono">{formatNeuralCurrency(selectedUni.baseWealth)}</div>
                                        </div>
                                        <div className="intel-item">
                                            <TrendingUp className="icon" />
                                            <div className="label">قوة العملة</div>
                                            <div className="val mono">{selectedUni.rate} ND</div>
                                        </div>
                                        <div className="intel-item">
                                            <Shield className="icon" />
                                            <div className="label">الحاكم الكوني</div>
                                            <div className="val">{selectedUni.ruler}</div>
                                        </div>
                                    </div>
                                </section>

                                <div className="modal-footer">
                                    <div className="travel-warning">
                                        <Info size={16} />
                                        <span>السفر بين الأكوان يتطلب تصريحاً من "The Council" ونسبة ضريبة 15%.</span>
                                    </div>
                                    <button className="travel-btn">بدء بروتوكول الانتقال البعدي</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .multiverse-root {
                    position: relative;
                    min-height: 100vh;
                    background: #020205;
                    color: white;
                    overflow-x: hidden;
                    padding: 2rem;
                    direction: rtl;
                }

                /* ═══ Cosmic Background ═══ */
                .cosmic-bg {
                    position: fixed; inset: 0; z-index: 0;
                    background: radial-gradient(circle at 50% 50%, #050510 0%, #010103 100%);
                }
                .nebula {
                    position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.15;
                    animation: nebula-float 20s infinite alternate;
                }
                .nebula.red { width: 600px; height: 600px; background: #ff0044; top: -100px; right: -100px; }
                .nebula.blue { width: 800px; height: 800px; background: #0066ff; bottom: -200px; left: -200px; animation-delay: -5s; }
                @keyframes nebula-float { from { transform: translate(0, 0) scale(1); } to { transform: translate(50px, 50px) scale(1.1); } }
                
                .stars {
                    position: absolute; inset: 0;
                    background-image: 
                        radial-gradient(1px 1px at 20px 30px, #eee, rgba(0,0,0,0)),
                        radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
                        radial-gradient(1.5px 1.5px at 90px 40px, #fff, rgba(0,0,0,0));
                    background-size: 200px 200px;
                    opacity: 0.3;
                }

                .multiverse-content { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; }

                /* ═══ Header ═══ */
                .multiverse-header { margin-bottom: 3rem; }
                .hud-label {
                    display: flex; align-items: center; gap: 0.5rem;
                    font-size: 0.6rem; font-weight: 800; letter-spacing: 2px;
                    color: rgba(255,255,255,0.4); margin-bottom: 1rem;
                }
                .cyber-title {
                    font-size: 3rem; font-weight: 950; letter-spacing: -2px; margin: 0;
                    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .header-stats { display: flex; gap: 2.5rem; margin-top: 1.5rem; }
                .h-stat { display: flex; flex-direction: column; }
                .h-label { font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 0.25rem; }
                .h-val { font-size: 1.4rem; font-weight: 900; color: var(--primary); }
                .h-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.1); }

                /* ═══ Ticker ═══ */
                .ticker-section {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px; padding: 0.75rem 0; margin-bottom: 3rem; overflow: hidden;
                }
                .ticker-track { display: flex; width: max-content; animation: ticker-scroll 80s linear infinite; }
                @keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(50%); } }
                .ticker-uni { display: flex; align-items: center; gap: 0.75rem; padding: 0 2rem; border-left: 1px solid rgba(255,255,255,0.1); }
                .ticker-uni .dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
                .ticker-uni .name { font-size: 0.75rem; color: rgba(255,255,255,0.6); }
                .ticker-uni .val { font-size: 0.85rem; font-weight: 800; }

                /* ═══ Universe Grid ═══ */
                .universe-grid { display: grid; gap: 1rem; }
                .uni-entry {
                    display: grid; grid-template-columns: 60px 80px 1fr 200px 40px;
                    align-items: center; padding: 1.25rem 1.5rem;
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 16px; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative; overflow: hidden;
                }
                .uni-entry:hover { 
                    background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); 
                    transform: translateX(-8px) scale(1.01);
                }
                .uni-entry--current {
                    background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.4);
                    box-shadow: 0 0 30px rgba(99, 102, 241, 0.1);
                }
                
                .uni-rank { font-size: 1.5rem; font-weight: 900; opacity: 0.2; }
                
                .uni-orb { 
                    width: 50px; height: 50px; border-radius: 50%; 
                    display: flex; align-items: center; justify-content: center;
                }
                .uni-core { 
                    width: 12px; height: 12px; border-radius: 50%; 
                    box-shadow: 0 0 20px currentColor; animation: uni-pulse 2s infinite ease-in-out;
                }
                @keyframes uni-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.7; } }

                .uni-name { font-size: 1.2rem; font-weight: 800; margin: 0 0 0.25rem 0; }
                .uni-meta { display: flex; gap: 1rem; font-size: 0.65rem; color: rgba(255,255,255,0.4); }
                .uni-meta span { display: flex; align-items: center; gap: 0.25rem; }

                .uni-wealth { text-align: left; }
                .wealth-main { font-size: 1.1rem; font-weight: 900; color: #fff; }
                .wealth-sub { font-size: 0.65rem; color: var(--primary); opacity: 0.8; }

                .uni-action { opacity: 0.2; transition: opacity 0.3s; text-align: left;}
                .uni-entry:hover .uni-action { opacity: 1; color: var(--primary); }

                .user-uni-badge {
                    position: absolute; top: 0; left: 100px;
                    background: var(--primary); color: white; padding: 2px 10px;
                    font-size: 0.6rem; font-weight: 900; border-radius: 0 0 8px 8px;
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
                }

                /* ═══ Modal ═══ */
                .uni-modal-overlay {
                    position: fixed; inset: 0; z-index: 2000;
                    display: flex; align-items: center; justify-content: center; padding: 1.5rem;
                }
                .modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); }
                .uni-modal-content {
                    position: relative; width: 100%; max-width: 640px;
                    background: #0a0a10; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px;
                    overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.8);
                }
                .uni-modal-content::before {
                    content: ''; position: absolute; top: 0; height: 4px; left: 0; right: 0;
                    background: var(--accent); opacity: 0.8;
                }

                .modal-header { padding: 2rem; display: flex; justify-content: space-between; align-items: flex-start; }
                .modal-subtitle { font-size: 0.65rem; color: var(--accent); opacity: 0.8; letter-spacing: 2px; }
                .modal-title { font-size: 2.5rem; font-weight: 950; margin: 0.25rem 0 0 0; }
                .modal-close { 
                    background: rgba(255,255,255,0.05); border: none; color: white; 
                    width: 40px; height: 40px; border-radius: 12px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                }

                .modal-body { padding: 0 2rem 2.5rem; }
                .intel-card {
                    background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1);
                    border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem;
                }
                .intel-label { font-size: 0.7rem; color: var(--accent); margin-bottom: 0.75rem; font-weight: 800; }
                .intel-text { font-size: 1.1rem; line-height: 1.6; opacity: 0.8; margin: 0; }

                .intel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
                .intel-item { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 16px; }
                .intel-item .icon { color: var(--accent); margin-bottom: 0.75rem; opacity: 0.7; }
                .intel-item .label { font-size: 0.6rem; opacity: 0.4; margin-bottom: 0.25rem; }
                .intel-item .val { font-size: 1rem; font-weight: 800; }

                .modal-footer { margin-top: 2.5rem; border-top: 1px solid rgba(255,255,255,0.05); pt: 2rem;}
                .travel-warning { 
                    display: flex; align-items: center; gap: 0.75rem; color: #ffaa00; 
                    background: rgba(255, 170, 0, 0.05); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;
                    font-size: 0.8rem; border: 1px solid rgba(255, 170, 0, 0.1);
                }
                .travel-btn {
                    width: 100%; padding: 1.25rem; border-radius: 12px; border: none;
                    background: var(--accent); color: white; font-weight: 900; font-size: 1rem;
                    cursor: pointer; transition: 0.3s; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .travel-btn:hover { transform: translateY(-3px); filter: brightness(1.2); }

                /* Loading State */
                .multiverse-loading {
                    height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    background: #020205; color: white; gap: 2rem;
                }
                .cosmic-spinner {
                    width: 80px; height: 80px; border: 2px solid rgba(99, 102, 241, 0.1);
                    border-top: 2px solid var(--primary); border-radius: 50%;
                    animation: spin 1s linear infinite; box-shadow: 0 0 40px rgba(99, 102, 241, 0.2);
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 1024px) {
                    .uni-entry { grid-template-columns: 40px 60px 1fr 140px; }
                    .uni-action { display: none; }
                }
                @media (max-width: 768px) {
                    .uni-entry { grid-template-columns: 30px 1fr 120px; }
                    .uni-visual, .header-stats { display: none; }
                    .cyber-title { font-size: 2rem; }
                    .intel-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};


