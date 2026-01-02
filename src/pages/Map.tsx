import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Crosshair, X, Zap, Target, Activity, Radar, Swords, RotateCcw, Minus, Plus } from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';

interface Tile {
    id: string; row: number; col: number; ownerId: string | null; ownerColor: string | null; points: number;
}

export const Map = () => {
    const { user, refreshUser } = useAuth();
    const { showAlert } = useTerminal();

    const [tiles, setTiles] = useState<Record<string, Tile>>({});
    const [warMode, setWarMode] = useState(false);
    const [selectedWeapon, setSelectedWeapon] = useState<any>(null);
    const [targetTile, setTargetTile] = useState<Tile | null>(null);
    const [loading, setLoading] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [hudOpen, setHudOpen] = useState(false); // تبدأ مغلقة لتوفير مساحة

    const rows = 20; const cols = 20;
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.5));
    const resetZoom = () => setZoom(1);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "game_map"), (snap) => {
            const newTiles: Record<string, Tile> = {};
            snap.forEach(doc => { newTiles[doc.id] = doc.data() as Tile; });
            setTiles(newTiles);
        });
        return unsub;
    }, []);

    const getTile = (r: number, c: number) => {
        const id = `${r}_${c}`;
        return tiles[id] || { id, row: r, col: c, ownerId: null, ownerColor: null, points: 0 };
    };

    const handleTileClick = (r: number, c: number) => {
        if (!warMode) return;
        setTargetTile(getTile(r, c));
        setHudOpen(false); // إغلاق قائمة الأسلحة عند اختيار هدف للتركيز
    };

    const formatPoints = (p: number) => {
        if (p >= 1000000) return (p / 1000000).toFixed(1) + 'M';
        if (p >= 1000) return (p / 1000).toFixed(1) + 'k';
        return p;
    };

    const calculateOpacity = (points: number) => points === 0 ? 0 : 0.3 + Math.min(points / 5000, 0.6);

    const executeWarAction = async () => {
        if (!targetTile || !selectedWeapon || !user) return;
        const weaponType = selectedWeapon.type;
        const isOwned = targetTile.ownerId === user.id;

        if (weaponType === 'Defense' && !isOwned) {
            return showAlert(targetTile.ownerId ? "رفض_الدفاع: المنطقة محتلة." : "رفض_الدفاع: منطقة محايدة، هاجم أولاً.");
        }
        if (weaponType === 'Attack' && isOwned) return showAlert("رفض_الهجوم: لا يمكنك مهاجمة قطاعك.");

        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.id);
                const tileRef = doc(db, "game_map", targetTile.id);
                const userSnap = await transaction.get(userRef);
                const tileSnap = await transaction.get(tileRef);

                const inventory = userSnap.data()?.ownedWeapons || [];
                const weaponIdx = inventory.findIndex((w: any) => w.id === selectedWeapon.id);
                if (weaponIdx === -1 || inventory[weaponIdx].quantity < 1) throw new Error("نفاد الذخيرة.");

                const newInventory = [...inventory];
                newInventory[weaponIdx].quantity -= 1;
                transaction.update(userRef, { ownedWeapons: newInventory });

                const currentPoints = tileSnap.exists() ? (tileSnap.data().points || 0) : 0;
                const pwr = selectedWeapon.power || 50;

                if (weaponType === 'Defense') {
                    transaction.set(tileRef, { ...targetTile, ownerId: user.id, ownerColor: user.color, points: currentPoints + pwr }, { merge: true });
                } else {
                    const result = currentPoints - pwr;
                    transaction.set(tileRef, {
                        ...targetTile, ownerId: user.id, ownerColor: user.color,
                        points: result <= 0 ? (Math.abs(result) || 10) : result
                    }, { merge: true });
                }
            });
            setTargetTile(null);
            await refreshUser();
        } catch (e: any) { showAlert(e.message); }
        setLoading(false);
    };

    return (
        <div className="page-container" style={{ position: 'relative', height: '100vh', padding: 0, overflow: 'hidden', background: '#020205' }}>
            
            {/* Header - Compact */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50, textAlign: 'right', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.55rem', letterSpacing: '1px' }}>نظام_النبض_الإقليمي</p>
                    <Radar size={12} color="var(--primary)" className="radar-spin" />
                </div>
                <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.2rem' }}>خريطة الحرب</h1>
            </div>

            {/* Floating Zoom Controls */}
            <div style={{ position: 'absolute', top: '4rem', right: '1rem', zIndex: 60, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button onClick={handleZoomIn} className="map-ctrl-btn"><Plus size={18} /></button>
                <button onClick={handleZoomOut} className="map-ctrl-btn"><Minus size={18} /></button>
                <button onClick={resetZoom} className="map-ctrl-btn"><RotateCcw size={14} /></button>
            </div>

            {/* Viewport */}
            <div className="map-viewport custom-scrollbar">
                <div className="grid-layer" style={{ transform: `scale(${zoom})`, transformOrigin: 'top right' }}>
                    <div className="map-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                        {Array.from({ length: rows * cols }).map((_, i) => {
                            const r = Math.floor(i / cols);
                            const c = i % cols;
                            const tile = getTile(r, c);
                            const isTargeted = targetTile?.id === tile.id;
                            return (
                                <div
                                    key={tile.id}
                                    onClick={() => handleTileClick(r, c)}
                                    className={`map-tile ${isTargeted ? 'targeted' : ''} ${warMode ? 'war-active' : ''}`}
                                    style={{ '--owner-color': tile.ownerColor || 'transparent', '--tile-opacity': calculateOpacity(tile.points) } as any}
                                >
                                    <div className="tile-fill"></div>
                                    <div className="tile-border"></div>
                                    <span className="tile-id">{String.fromCharCode(65 + r)}{c + 1}</span>
                                    {tile.points > 0 && <span className="tile-pts">{formatPoints(tile.points)}</span>}
                                    {isTargeted && <div className="crosshair-overlay"><Crosshair size={10} /></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* War Mode Toggle - Circular & Higher */}
            <button
                onClick={() => { setWarMode(!warMode); setHudOpen(!warMode); if (warMode) { setSelectedWeapon(null); setTargetTile(null); } }}
                className={`war-main-fab ${warMode ? 'active' : ''}`}
            >
                {warMode ? <X size={28} /> : <Swords size={28} />}
            </button>

            {/* NEW Tactical Drawer - Positioned above BottomNav */}
            {warMode && (
                <div className={`tactical-drawer ${hudOpen ? 'open' : 'minimized'}`}>
                    <div className="drawer-handle" onClick={() => setHudOpen(!hudOpen)}>
                        <div className="handle-bar"></div>
                        <p className="micro-label" style={{ fontSize: '0.6rem', marginTop: '4px' }}>
                            {hudOpen ? 'تصغير المخزن' : 'عرض الأسلحة المتوفرة'}
                        </p>
                    </div>

                    <div className="drawer-content">
                        <div className="armory-status">
                            <Activity size={10} className="pulse" color="var(--danger)" />
                            <span className="micro-label" style={{ fontSize: '0.6rem' }}>
                                {selectedWeapon ? `سلاح نشط: ${selectedWeapon.name}` : 'بروتوكول القتال جاهز - اختر سلاحك'}
                            </span>
                        </div>

                        <div className="weapon-scroll">
                            {user?.ownedWeapons?.filter((w: any) => w.quantity > 0).map((w: any, i: number) => (
                                <div
                                    key={i}
                                    onClick={() => setSelectedWeapon(w)}
                                    className={`weapon-mini-card ${selectedWeapon?.id === w.id ? 'active' : ''}`}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span className="w-name">{w.name}</span>
                                        <span className="w-qty">x{w.quantity}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Zap size={10} color="var(--primary)" />
                                        <span className="mono" style={{ fontSize: '0.7rem' }}>{w.power}</span>
                                        <span className={`w-badge ${w.type === 'Attack' ? 'atk' : 'def'}`}>
                                            {w.type === 'Attack' ? 'هجوم' : 'دفاع'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!user?.ownedWeapons || user.ownedWeapons.every((w: any) => w.quantity === 0)) && (
                                <p className="micro-label" style={{ padding: '1rem', textAlign: 'center', width: '100%', opacity: 0.5 }}>لا توجد أسلحة في المخزن</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Strike Confirmation Overlay */}
            {targetTile && selectedWeapon && (
                <div className="strike-modal-overlay fade-in">
                    <div className="strike-modal-card">
                        <div className="scanline"></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <Target size={20} color="var(--danger)" />
                            <h2 className="mono" style={{ margin: 0, fontSize: '1.4rem' }}>{String.fromCharCode(65 + targetTile.row)}{targetTile.col + 1}</h2>
                        </div>
                        
                        <div className="strike-details">
                            <div className="s-row"><span>السلاح المختار:</span> <span>{selectedWeapon.name}</span></div>
                            <div className="s-row"><span>قوة العملية:</span> <span style={{ color: 'var(--primary)' }}>{selectedWeapon.power}</span></div>
                            <div className="s-row"><span>الهدف:</span> <span>{targetTile.ownerId ? 'منطقة معادية' : 'منطقة محايدة'}</span></div>
                        </div>

                        <div className="strike-btns">
                            <button onClick={() => setTargetTile(null)} className="s-btn cancel">تراجع</button>
                            <button onClick={executeWarAction} disabled={loading} className="s-btn confirm">
                                {loading ? <div className="neural-loader sm"></div> : 'تأكيد الضربة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .map-viewport { height: 100%; width: 100%; overflow: auto; padding: 4rem 1rem 250px; direction: ltr; scroll-behavior: smooth; }
                .grid-layer { display: inline-block; padding: 4px; background: rgba(255,255,255,0.02); }
                .map-grid { display: grid; gap: 1px; }
                .map-tile { position: relative; width: 26px; height: 26px; background: rgba(255,255,255,0.03); }
                .tile-fill { position: absolute; inset: 0; background: var(--owner-color); opacity: var(--tile-opacity); }
                .tile-border { position: absolute; inset: 0; border: 0.2px solid rgba(255,255,255,0.05); }
                .map-tile.targeted .tile-border { border: 1.5px solid var(--danger); box-shadow: 0 0 8px var(--danger); }
                .tile-id { position: absolute; top: 1px; left: 1px; font-size: 5px; opacity: 0.3; color: #fff; }
                .tile-pts { position: absolute; bottom: 1px; right: 1px; font-size: 5.5px; font-weight: 900; color: #fff; }
                
                .map-ctrl-btn { width: 38px; height: 38px; border-radius: 12px; background: rgba(10,11,20,0.9); border: 1px solid var(--border-bright); color: #fff; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
                
                .war-main-fab { position: fixed; bottom: 90px; right: 1.25rem; width: 60px; height: 60px; border-radius: 50%; background: #10111a; border: 1.5px solid var(--border-bright); color: #fff; z-index: 100; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
                .war-main-fab.active { background: var(--danger); border-color: #fff; box-shadow: 0 0 25px var(--danger-glow); }
                
                /* Tactical Drawer - Above Bottom Nav */
                .tactical-drawer { position: fixed; bottom: 85px; left: 0; width: 100%; background: rgba(8,9,16,0.98); backdrop-filter: blur(25px); border-top: 1.5px solid var(--border-bright); z-index: 90; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 24px 24px 0 0; }
                .tactical-drawer.minimized { height: 45px; transform: translateY(0); }
                .tactical-drawer.open { height: 180px; }
                
                .drawer-handle { height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
                .handle-bar { width: 40px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
                .drawer-content { padding: 0 1rem 1rem; }
                .armory-status { display: flex; alignItems: center; gap: 6px; margin-bottom: 0.75rem; opacity: 0.8; justify-content: center; }
                
                .weapon-scroll { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none; }
                .weapon-mini-card { min-width: 135px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-dim); padding: 0.6rem; border-radius: 12px; }
                .weapon-mini-card.active { border-color: var(--primary); background: rgba(99,102,241,0.1); }
                .w-name { font-size: 0.75rem; font-weight: 800; }
                .w-qty { font-size: 0.65rem; opacity: 0.5; }
                .w-badge { font-size: 0.5rem; padding: 1px 4px; border-radius: 3px; margin-left: auto; }
                .w-badge.atk { background: rgba(239,68,68,0.1); color: var(--danger); }
                .w-badge.def { background: rgba(99,102,241,0.1); color: var(--primary); }
                
                .strike-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; alignItems: center; justifyContent: center; padding: 1.5rem; backdrop-filter: blur(6px); direction: rtl; }
                .strike-modal-card { width: 100%; max-width: 320px; background: #0c0d14; border: 1.5px solid var(--border-bright); border-radius: 24px; padding: 1.5rem; position: relative; overflow: hidden; }
                .strike-details { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
                .s-row { display: flex; justify-content: space-between; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; }
                .strike-btns { display: flex; gap: 0.75rem; }
                .s-btn { flex: 1; padding: 0.85rem; border-radius: 12px; font-weight: 800; font-size: 0.85rem; border: none; }
                .s-btn.confirm { background: var(--danger); color: #fff; box-shadow: 0 0 15px var(--danger-glow); }
                .s-btn.cancel { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--border-dim); }
                
                .radar-spin { animation: spin 4s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
                .pulse { animation: pulse 1.5s infinite; }
            `}</style>
        </div>
    );
};