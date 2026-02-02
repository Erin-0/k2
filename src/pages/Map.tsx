import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
    Plus, Minus, RotateCcw, Radar, Crosshair, Target,
    Zap, X, Swords
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTerminal } from '../context/TerminalContext';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */
export interface Tile {
    id: string;
    row: number;
    col: number;
    ownerId: string | null;
    ownerColor: string | null;
    points: number;
}

export interface Weapon {
    id: string;
    name: string;
    type: 'Attack' | 'Defense';
    power: number;
    quantity: number;
    rarity?: string;
    description?: string;
}

export interface MapConfig {
    rows: number;
    cols: number;
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
}

export const MAP_CONFIG: MapConfig = {
    rows: 20,
    cols: 20,
    minZoom: 0.5,
    maxZoom: 3,
    zoomStep: 0.25
};

/* ═══════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════ */
const formatPoints = (points: number): string => {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
    return points.toString();
};

const calculateTileOpacity = (points: number): number => {
    if (points === 0) return 0;
    return 0.25 + Math.min(points / 5000, 0.65);
};

const getTileId = (row: number, col: number): string => `${row}_${col}`;

const getTileLabel = (row: number, col: number): string => {
    return `${String.fromCharCode(65 + row)}${col + 1}`;
};

const createEmptyTile = (row: number, col: number): Tile => ({
    id: getTileId(row, col),
    row,
    col,
    ownerId: null,
    ownerColor: null,
    points: 0
});

/* ═══════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════ */

const useMapData = () => {
    const [tiles, setTiles] = useState<Record<string, Tile>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, "game_map"),
            (snapshot) => {
                const newTiles: Record<string, Tile> = {};
                snapshot.forEach(doc => {
                    newTiles[doc.id] = doc.data() as Tile;
                });
                setTiles(newTiles);
                setLoading(false);
            },
            (error) => {
                console.error("Map data error:", error);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, []);

    const getTile = useCallback((row: number, col: number): Tile => {
        const id = getTileId(row, col);
        return tiles[id] || createEmptyTile(row, col);
    }, [tiles]);

    return { tiles, getTile, loading };
};

const useZoom = () => {
    const [zoom, setZoom] = useState(1);

    const zoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev + MAP_CONFIG.zoomStep, MAP_CONFIG.maxZoom));
    }, []);

    const zoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev - MAP_CONFIG.zoomStep, MAP_CONFIG.minZoom));
    }, []);

    const resetZoom = useCallback(() => {
        setZoom(1);
    }, []);

    return { zoom, zoomIn, zoomOut, resetZoom };
};

const useWarMode = ({ user, refreshUser, showAlert }: { user: any, refreshUser: () => void, showAlert: (msg: string, title?: string) => void }) => {
    const [isActive, setIsActive] = useState(false);
    const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
    const [targetTile, setTargetTile] = useState<Tile | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleWarMode = useCallback(() => {
        setIsActive(prev => {
            const newState = !prev;
            if (!newState) {
                setSelectedWeapon(null);
                setTargetTile(null);
                setDrawerOpen(false);
            } else {
                setDrawerOpen(true);
            }
            return newState;
        });
    }, []);

    const selectWeapon = useCallback((weapon: Weapon) => {
        setSelectedWeapon(weapon);
    }, []);

    const selectTarget = useCallback((tile: Tile) => {
        if (!isActive) return;
        setTargetTile(tile);
        setDrawerOpen(false);
    }, [isActive]);

    const cancelStrike = useCallback(() => {
        setTargetTile(null);
    }, []);

    const executeStrike = useCallback(async () => {
        if (!targetTile || !selectedWeapon || !user) return;

        const isOwned = targetTile.ownerId === user.id;
        const weaponType = selectedWeapon.type;

        if (weaponType === 'Defense' && !isOwned) {
            showAlert(targetTile.ownerId ? "المنطقة محتلة من قبل عدو." : "منطقة محايدة، هاجم أولاً.", "فشل الدفاع");
            return;
        }

        if (weaponType === 'Attack' && isOwned) {
            showAlert("لا يمكنك مهاجمة قطاعك الخاص.", "فشل الهجوم");
            return;
        }

        setIsExecuting(true);

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.id);
                const tileRef = doc(db, "game_map", targetTile.id);

                const userSnap = await transaction.get(userRef);
                const tileSnap = await transaction.get(tileRef);

                const inventory = userSnap.data()?.ownedWeapons || [];
                const weaponIdx = inventory.findIndex((w: any) => w.id === selectedWeapon.id);

                if (weaponIdx === -1 || inventory[weaponIdx].quantity < 1) {
                    throw new Error("نفاد الذخيرة.");
                }

                const newInventory = [...inventory];
                newInventory[weaponIdx].quantity -= 1;
                transaction.update(userRef, { ownedWeapons: newInventory });

                const currentPoints = tileSnap.exists() ? (tileSnap.data().points || 0) : 0;
                const power = selectedWeapon.power || 50;

                if (weaponType === 'Defense') {
                    transaction.set(tileRef, {
                        ...targetTile,
                        ownerId: user.id,
                        ownerColor: user.color,
                        points: currentPoints + power
                    }, { merge: true });
                } else {
                    const result = currentPoints - power;
                    transaction.set(tileRef, {
                        ...targetTile,
                        ownerId: user.id,
                        ownerColor: user.color,
                        points: result <= 0 ? (Math.abs(result) || 10) : result
                    }, { merge: true });
                }
            });

            setTargetTile(null);
            await refreshUser();
        } catch (error: any) {
            showAlert(error.message || "حدث خطأ أثناء تنفيذ العملية.", "خطأ تقني");
        } finally {
            setIsExecuting(false);
        }
    }, [targetTile, selectedWeapon, user, refreshUser, showAlert]);

    const availableWeapons = user?.ownedWeapons?.filter((w: Weapon) => w.quantity > 0) || [];

    return {
        isActive, selectedWeapon, targetTile, isExecuting,
        drawerOpen, availableWeapons, toggleWarMode,
        selectWeapon, selectTarget, cancelStrike, executeStrike, setDrawerOpen
    };
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════ */

const MapHeader = ({ userTileCount = 0, totalPoints = 0 }: { userTileCount?: number, totalPoints?: number }) => {
    return (
        <header className="map-header">
            <div className="map-header__title-group">
                <div className="map-header__label">
                    <span className="map-header__label-text">نظام_النبض_الإقليمي</span>
                    <Radar size={12} className="map-header__label-icon" />
                </div>
                <h1 className="map-header__title">خريطة الحرب</h1>
            </div>

            <div className="map-header__stats">
                <div className="map-header__stat">
                    <div className="map-header__stat-value">{userTileCount}</div>
                    <div className="map-header__stat-label">قطاعات</div>
                </div>
                <div className="map-header__stat">
                    <div className="map-header__stat-value">{totalPoints.toLocaleString()}</div>
                    <div className="map-header__stat-label">نقاط</div>
                </div>
            </div>
        </header>
    );
};

const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onReset }: { zoom: number, onZoomIn: () => void, onZoomOut: () => void, onReset: () => void }) => {
    return (
        <div className="zoom-controls">
            <button className="zoom-btn" onClick={onZoomIn} aria-label="Zoom in"><Plus size={18} /></button>
            <button className="zoom-btn" onClick={onZoomOut} aria-label="Zoom out"><Minus size={18} /></button>
            <button className="zoom-btn" onClick={onReset} aria-label="Reset zoom"><RotateCcw size={14} /></button>
            <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
        </div>
    );
};

const MapTile = memo(({ tile, isTargeted, isInteractive, onClick }: { tile: Tile, isTargeted: boolean, isInteractive: boolean, onClick: () => void }) => {
    const label = getTileLabel(tile.row, tile.col);
    const opacity = calculateTileOpacity(tile.points);

    return (
        <div
            className={`map-tile ${isInteractive ? 'map-tile--interactive' : ''} ${isTargeted ? 'map-tile--targeted' : ''}`}
            onClick={onClick}
            style={{
                '--tile-color': tile.ownerColor || 'transparent',
                '--tile-opacity': opacity
            } as React.CSSProperties}
        >
            <div className="tile-fill" />
            <div className="tile-border" />
            <span className="tile-id">{label}</span>
            {tile.points > 0 && <span className="tile-points">{formatPoints(tile.points)}</span>}
            {isTargeted && <div className="tile-crosshair"><Crosshair size={12} /></div>}
        </div>
    );
});
MapTile.displayName = 'MapTile';

const MapGrid = memo(({ getTile, targetTileId, isWarMode, zoom, onTileClick }: { getTile: (r: number, c: number) => Tile, targetTileId: string | null, isWarMode: boolean, zoom: number, onTileClick: (t: Tile) => void }) => {
    const { rows, cols } = MAP_CONFIG;

    return (
        <div className="map-viewport">
            <div className="map-grid-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top right' }}>
                <div className="map-grid" style={{ gridTemplateColumns: `repeat(${cols}, var(--map-tile-size))` }}>
                    {Array.from({ length: rows * cols }).map((_, index) => {
                        const row = Math.floor(index / cols);
                        const col = index % cols;
                        const tile = getTile(row, col);
                        return (
                            <MapTile
                                key={tile.id}
                                tile={tile}
                                isTargeted={targetTileId === tile.id}
                                isInteractive={isWarMode}
                                onClick={() => onTileClick(tile)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
MapGrid.displayName = 'MapGrid';

const WarFAB = ({ isActive, onClick }: { isActive: boolean, onClick: () => void }) => {
    return (
        <button className={`war-fab ${isActive ? 'war-fab--active' : ''}`} onClick={onClick}>
            <div className="war-fab__icon">
                {isActive ? <X size={26} /> : <Swords size={26} />}
            </div>
        </button>
    );
};

const WeaponCard = memo(({ weapon, isSelected, onClick }: { weapon: Weapon, isSelected: boolean, onClick: () => void }) => {
    return (
        <div className={`weapon-card ${isSelected ? 'weapon-card--active' : ''}`} onClick={onClick}>
            <div className="weapon-card__header">
                <span className="weapon-card__name">{weapon.name}</span>
                <span className="weapon-card__qty">x{weapon.quantity}</span>
            </div>
            <div className="weapon-card__stats">
                <div className="weapon-card__power">
                    <Zap size={12} className="weapon-card__power-icon" />
                    <span>{weapon.power}</span>
                </div>
                <span className={`weapon-card__type weapon-card__type--${weapon.type.toLowerCase()}`}>
                    {weapon.type === 'Attack' ? 'هجوم' : 'دفاع'}
                </span>
            </div>
        </div>
    );
});
WeaponCard.displayName = 'WeaponCard';

const TacticalDrawer = ({ isOpen, weapons, selectedWeaponId, onToggle, onSelectWeapon }: { isOpen: boolean, weapons: Weapon[], selectedWeaponId: string | null, onToggle: () => void, onSelectWeapon: (w: Weapon) => void }) => {
    const selectedWeapon = weapons.find(w => w.id === selectedWeaponId);

    return (
        <div className={`tactical-drawer ${isOpen ? 'tactical-drawer--open' : 'tactical-drawer--minimized'}`}>
            <div className="drawer-handle" onClick={onToggle}>
                <div className="drawer-handle__bar" />
                <span className="drawer-handle__label">{isOpen ? 'إخفاء الترسانة' : 'عرض الترسانة التكتيكية'}</span>
            </div>
            <div className="drawer-content">
                <div className="armory-status">
                    <div className="armory-status__icon" style={{ width: 8, height: 8, borderRadius: '50%', background: selectedWeapon ? '#22c55e' : '#ef4444' }} />
                    <span className={`armory-status__text ${selectedWeapon ? 'armory-status__text--active' : ''}`}>
                        {selectedWeapon ? `سلاح نشط: ${selectedWeapon.name}` : 'بروتوكول القتال جاهز - اختر سلاحك'}
                    </span>
                </div>
                <div className="weapons-scroll">
                    {weapons.length === 0 ? (
                        <div className="weapons-empty">لا توجد أسلحة متاحة في المخزن حالياً.</div>
                    ) : (
                        weapons.map(weapon => (
                            <WeaponCard
                                key={weapon.id}
                                weapon={weapon}
                                isSelected={selectedWeaponId === weapon.id}
                                onClick={() => onSelectWeapon(weapon)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const StrikeModal = ({ tile, weapon, isExecuting, onConfirm, onCancel }: { tile: Tile, weapon: Weapon, isExecuting: boolean, onConfirm: () => void, onCancel: () => void }) => {
    const tileLabel = getTileLabel(tile.row, tile.col);
    const targetType = tile.ownerId ? 'منطقة معادية' : 'منطقة محايدة';

    return (
        <div className="strike-overlay" onClick={onCancel}>
            <div className="strike-modal" onClick={e => e.stopPropagation()}>
                <div className="strike-modal__scanline" />
                <div className="strike-modal__header">
                    <Target size={24} className="strike-modal__target-icon" />
                    <h2 className="strike-modal__target-label">{tileLabel}</h2>
                </div>
                <div className="strike-modal__body">
                    <div className="strike-modal__detail">
                        <span className="strike-modal__detail-label">السلاح المختار</span>
                        <span className="strike-modal__detail-value">{weapon.name}</span>
                    </div>
                    <div className="strike-modal__detail">
                        <span className="strike-modal__detail-label">قوة العملية</span>
                        <span className="strike-modal__detail-value strike-modal__detail-value--power">{weapon.power}</span>
                    </div>
                    <div className="strike-modal__detail">
                        <span className="strike-modal__detail-label">نوع الهدف</span>
                        <span className={`strike-modal__detail-value ${tile.ownerId ? 'strike-modal__detail-value--enemy' : 'strike-modal__detail-value--neutral'}`}>{targetType}</span>
                    </div>
                    <div className="strike-modal__detail">
                        <span className="strike-modal__detail-label">النقاط الحالية</span>
                        <span className="strike-modal__detail-value">{tile.points.toLocaleString()}</span>
                    </div>
                </div>
                <div className="strike-modal__footer">
                    <button className="strike-btn strike-btn--cancel" onClick={onCancel} disabled={isExecuting}>تراجع</button>
                    <button className="strike-btn strike-btn--confirm" onClick={onConfirm} disabled={isExecuting}>
                        {isExecuting ? <div className="mini-loader" /> : <><Crosshair size={16} /> تأكيد الضربة</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export const Map = () => {
    const { user, refreshUser } = useAuth();
    const { showAlert } = useTerminal();

    const { tiles, getTile, loading } = useMapData();
    const { zoom, zoomIn, zoomOut, resetZoom } = useZoom();
    const {
        isActive: warModeActive, selectedWeapon, targetTile, isExecuting,
        drawerOpen, availableWeapons, toggleWarMode,
        selectWeapon, selectTarget, cancelStrike, executeStrike, setDrawerOpen
    } = useWarMode({ user, refreshUser, showAlert });

    const userStats = useMemo(() => {
        const userTiles = Object.values(tiles).filter(t => t.ownerId === user?.id);
        return {
            tileCount: userTiles.length,
            totalPoints: userTiles.reduce((sum, t) => sum + t.points, 0)
        };
    }, [tiles, user?.id]);

    if (loading) {
        return (
            <div className="map-page">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div className="mini-loader" style={{ width: 40, height: 40 }} />
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
            :root {
                --map-bg: #030308;
                --map-grid-bg: rgba(255, 255, 255, 0.015);
                --map-border: rgba(255, 255, 255, 0.06);
                --map-border-bright: rgba(255, 255, 255, 0.12);
                --map-tile-size: 28px;
                --tactical-red: #ef4444;
                --tactical-red-glow: rgba(239, 68, 68, 0.4);
                --tactical-blue: #6366f1;
                --tactical-blue-glow: rgba(99, 102, 241, 0.4);
                --tactical-green: #22c55e;
                --tactical-gold: #f59e0b;
                --drawer-bg: rgba(8, 9, 18, 0.98);
                --card-bg: rgba(255, 255, 255, 0.03);
                --card-bg-active: rgba(99, 102, 241, 0.1);
            }

            .map-page {
                position: relative; height: 100vh; width: 100%;
                background: var(--map-bg); overflow: hidden;
            }

            .map-page::before {
                content: ''; position: absolute; inset: 0;
                background: radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
                            radial-gradient(ellipse at 80% 80%, rgba(239, 68, 68, 0.02) 0%, transparent 50%);
                pointer-events: none;
            }

            .map-header {
                position: absolute; top: 0; left: 0; right: 0; z-index: 50;
                padding: 1rem 1.25rem; background: linear-gradient(180deg, var(--map-bg) 0%, transparent 100%);
                display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none;
            }

            .map-header__title-group { text-align: right; }
            .map-header__label { display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; margin-bottom: 0.25rem; }
            .map-header__label-text { font-size: 0.55rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--tactical-blue); }
            .map-header__label-icon { color: var(--tactical-blue); animation: radar-spin 4s linear infinite; }
            @keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .map-header__title { font-size: 1.4rem; font-weight: 950; letter-spacing: -1px; margin: 0; color: #fff; }

            .map-header__stats { display: flex; gap: 1rem; pointer-events: auto; }
            .map-header__stat { text-align: center; padding: 0.5rem 0.75rem; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(10px); border: 1px solid var(--map-border); border-radius: 8px; }
            .map-header__stat-value { font-size: 1rem; font-weight: 900; color: var(--tactical-gold); }
            .map-header__stat-label { font-size: 0.5rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }

            .zoom-controls { position: absolute; top: 5rem; right: 1rem; z-index: 60; display: flex; flex-direction: column; gap: 0.4rem; }
            .zoom-btn { width: 40px; height: 40px; border-radius: 10px; background: rgba(10, 11, 20, 0.95); backdrop-filter: blur(15px); border: 1px solid var(--map-border-bright); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
            .zoom-btn:hover { background: rgba(99, 102, 241, 0.15); border-color: var(--tactical-blue); transform: scale(1.05); }
            .zoom-indicator { font-size: 0.6rem; font-weight: 800; text-align: center; padding: 0.3rem; color: rgba(255,255,255,0.5); }

            .map-viewport { height: 100%; width: 100%; overflow: auto; padding: 5rem 1rem 220px; direction: ltr; scroll-behavior: smooth; }
            .map-grid-wrapper { display: inline-block; padding: 8px; background: var(--map-grid-bg); border: 1px solid var(--map-border); border-radius: 4px; transition: transform 0.3s; }
            .map-grid { display: grid; gap: 1px; }

            .map-tile { position: relative; width: var(--map-tile-size); height: var(--map-tile-size); background: rgba(255, 255, 255, 0.02); cursor: default; transition: 0.15s; overflow: hidden; }
            .map-tile--interactive { cursor: crosshair; }
            .map-tile--interactive:hover { background: rgba(255, 255, 255, 0.08); }
            .tile-fill { position: absolute; inset: 0; background: var(--tile-color, transparent); opacity: var(--tile-opacity, 0); transition: opacity 0.3s; }
            .tile-border { position: absolute; inset: 0; border: 0.5px solid rgba(255, 255, 255, 0.04); pointer-events: none; }
            .map-tile--targeted .tile-border { border: 2px solid var(--tactical-red); box-shadow: 0 0 10px var(--tactical-red-glow), inset 0 0 10px var(--tactical-red-glow); animation: target-pulse 1.5s infinite; }
            @keyframes target-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            .tile-id { position: absolute; top: 1px; left: 2px; font-size: 5px; font-weight: 600; color: rgba(255, 255, 255, 0.2); pointer-events: none; }
            .tile-points { position: absolute; bottom: 1px; right: 2px; font-size: 6px; font-weight: 900; color: #fff; text-shadow: 0 1px 2px #000; pointer-events: none; }
            .tile-crosshair { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--tactical-red); animation: blink 0.8s infinite; }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

            .war-fab { position: fixed; bottom: 100px; right: 1.25rem; z-index: 100; width: 64px; height: 64px; border-radius: 50%; background: #0f1019; border: 2px solid var(--map-border-bright); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 32px #000; transition: 0.3s; }
            .war-fab:hover { transform: scale(1.05); border-color: var(--tactical-blue); }
            .war-fab--active { background: var(--tactical-red); border-color: #fff; box-shadow: 0 0 30px var(--tactical-red-glow); }

            .tactical-drawer { position: fixed; bottom: 75px; left: 0; right: 0; z-index: 90; background: var(--drawer-bg); backdrop-filter: blur(30px); border-top: 1px solid var(--map-border-bright); border-radius: 20px 20px 0 0; transition: 0.4s; overflow: hidden; }
            .tactical-drawer--minimized { height: 50px; }
            .tactical-drawer--open { height: 200px; }
            .drawer-handle { height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
            .drawer-handle__bar { width: 36px; height: 4px; background: rgba(255, 255, 255, 0.15); border-radius: 2px; }
            .drawer-handle__label { font-size: 0.6rem; font-weight: 700; color: rgba(255, 255, 255, 0.4); margin-top: 6px; }
            .drawer-content { padding: 0 1rem 1.5rem; }
            .armory-status { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 1rem; }
            .armory-status__text { font-size: 0.65rem; font-weight: 700; color: rgba(255, 255, 255, 0.6); }
            .armory-status__text--active { color: var(--tactical-green); }

            .weapons-scroll { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; }
            .weapon-card { min-width: 145px; background: var(--card-bg); border: 1px solid var(--map-border); border-radius: 12px; padding: 0.75rem; cursor: pointer; transition: 0.2s; }
            .weapon-card--active { background: var(--card-bg-active); border-color: var(--tactical-blue); }
            .weapon-card__header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
            .weapon-card__name { font-size: 0.8rem; font-weight: 800; color: #fff; }
            .weapon-card__qty { font-size: 0.6rem; color: rgba(255, 255, 255, 0.4); }
            .weapon-card__power { display: flex; align-items: center; gap: 3px; font-size: 0.75rem; font-weight: 800; }
            .weapon-card__type { font-size: 0.5rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: auto; }
            .weapon-card__type--attack { background: rgba(239, 68, 68, 0.15); color: var(--tactical-red); }
            .weapon-card__type--defense { background: rgba(99, 102, 241, 0.15); color: var(--tactical-blue); }

            .strike-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
            .strike-modal { width: 100%; max-width: 340px; background: #0c0d14; border: 1px solid var(--map-border-bright); border-radius: 20px; overflow: hidden; position: relative; }
            .strike-modal__header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--map-border); }
            .strike-modal__target-label { font-size: 1.6rem; font-weight: 950; }
            .strike-modal__body { padding: 1.5rem; }
            .strike-modal__detail { display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 0.85rem; }
            .strike-modal__detail-label { color: rgba(255, 255, 255, 0.5); }
            .strike-modal__detail-value { font-weight: 700; color: #fff; }
            .strike-modal__footer { display: flex; gap: 0.75rem; padding: 1rem 1.5rem 1.5rem; }
            .strike-btn { flex: 1; padding: 1rem; border-radius: 12px; font-size: 0.85rem; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
            .strike-btn--cancel { background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid var(--map-border); }
            .strike-btn--confirm { background: var(--tactical-red); color: #fff; }

            .mini-loader { width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="map-page">
                <MapHeader userTileCount={userStats.tileCount} totalPoints={userStats.totalPoints} />
                <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
                <MapGrid
                    getTile={getTile}
                    targetTileId={targetTile?.id || null}
                    isWarMode={warModeActive}
                    zoom={zoom}
                    onTileClick={selectTarget}
                />
                <WarFAB isActive={warModeActive} onClick={toggleWarMode} />
                {warModeActive && (
                    <TacticalDrawer
                        isOpen={drawerOpen}
                        weapons={availableWeapons}
                        selectedWeaponId={selectedWeapon?.id || null}
                        onToggle={() => setDrawerOpen(!drawerOpen)}
                        onSelectWeapon={selectWeapon}
                    />
                )}
                {targetTile && selectedWeapon && (
                    <StrikeModal
                        tile={targetTile}
                        weapon={selectedWeapon}
                        isExecuting={isExecuting}
                        onConfirm={executeStrike}
                        onCancel={cancelStrike}
                    />
                )}
            </div>
        </>
    );
};

export default Map;
