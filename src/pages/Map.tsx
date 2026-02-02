import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
    Plus, Minus, Radar, Crosshair, Target,
    Zap, X, Swords, ChevronDown, Maximize2
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
    minZoom: 0.6,
    maxZoom: 2.5,
    zoomStep: 0.2
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

const useZoomAndPan = () => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const zoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev + MAP_CONFIG.zoomStep, MAP_CONFIG.maxZoom));
    }, []);

    const zoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev - MAP_CONFIG.zoomStep, MAP_CONFIG.minZoom));
    }, []);

    const resetView = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 0 || e.button === 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    }, [pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    return {
        zoom, pan, isDragging,
        zoomIn, zoomOut, resetView,
        handleMouseDown, handleMouseMove, handleMouseUp
    };
};

const useWarMode = ({ user, refreshUser, showAlert }: { user: any, refreshUser: () => void, showAlert: (msg: string, title?: string) => void }) => {
    const [isActive, setIsActive] = useState(false);
    const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
    const [targetTile, setTargetTile] = useState<Tile | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [showWeapons, setShowWeapons] = useState(false);

    const toggleWarMode = useCallback(() => {
        setIsActive(prev => {
            const newState = !prev;
            if (!newState) {
                setSelectedWeapon(null);
                setTargetTile(null);
                setShowWeapons(false);
            } else {
                setShowWeapons(true);
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
        showWeapons, availableWeapons, toggleWarMode,
        selectWeapon, selectTarget, cancelStrike, executeStrike, setShowWeapons
    };
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════ */

const MapHeader = ({ }: { userTileCount?: number, totalPoints?: number }) => {
    return (
        <div className="map-tactical-header">
            <div className="map-header__label">
                <span className="map-header__label-text">نظام_النبض_الإقليمي</span>
                <Radar size={12} className="map-header__label-icon" />
            </div>
            <h1 className="map-header__title">خريطة الحرب التكتيكية</h1>
        </div>
    );
};

const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onReset }: { zoom: number, onZoomIn: () => void, onZoomOut: () => void, onReset: () => void }) => {
    return (
        <div className="zoom-controls">
            <button className="zoom-btn" onClick={onZoomIn} aria-label="Zoom in"><Plus size={16} /></button>
            <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
            <button className="zoom-btn" onClick={onZoomOut} aria-label="Zoom out"><Minus size={16} /></button>
            <button className="zoom-btn zoom-btn--reset" onClick={onReset} aria-label="Reset view"><Maximize2 size={14} /></button>
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
            {isTargeted && <div className="tile-crosshair"><Crosshair size={14} /></div>}
        </div>
    );
});
MapTile.displayName = 'MapTile';

const MapGrid = memo(({ getTile, targetTileId, isWarMode, zoom, pan, isDragging, onMouseDown, onMouseMove, onMouseUp, onTileClick }: {
    getTile: (r: number, c: number) => Tile,
    targetTileId: string | null,
    isWarMode: boolean,
    zoom: number,
    pan: { x: number, y: number },
    isDragging: boolean,
    onMouseDown: (e: React.MouseEvent) => void,
    onMouseMove: (e: React.MouseEvent) => void,
    onMouseUp: () => void,
    onTileClick: (t: Tile) => void
}) => {
    const { rows, cols } = MAP_CONFIG;

    return (
        <div
            className={`map-viewport ${isDragging ? 'map-viewport--dragging' : ''}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            <div
                className="map-grid-wrapper"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center'
                }}
            >
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

const WeaponSidebar = ({ isVisible, weapons, selectedWeaponId, onToggle, onSelectWeapon }: { isVisible: boolean, weapons: Weapon[], selectedWeaponId: string | null, onToggle: () => void, onSelectWeapon: (w: Weapon) => void }) => {
    const selectedWeapon = weapons.find(w => w.id === selectedWeaponId);

    if (!isVisible) return null;

    return (
        <div className="weapon-sidebar">
            <div className="weapon-sidebar__header" onClick={onToggle}>
                <div className="weapon-sidebar__title">
                    <Swords size={16} />
                    <span>الترسانة التكتيكية</span>
                </div>
                <button className="weapon-sidebar__toggle">
                    <ChevronDown size={18} />
                </button>
            </div>

            <div className="weapon-sidebar__status">
                <div className={`status-dot ${selectedWeapon ? 'status-dot--active' : 'status-dot--idle'}`} />
                <span className="status-text">
                    {selectedWeapon ? `${selectedWeapon.name} جاهز للإطلاق` : 'اختر سلاحاً للهجوم'}
                </span>
            </div>

            <div className="weapon-sidebar__grid">
                {weapons.length === 0 ? (
                    <div className="weapons-empty">
                        <Zap size={32} opacity={0.3} />
                        <p>لا توجد أسلحة متاحة</p>
                    </div>
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
    );
};

const StrikePanel = ({ tile, weapon, isExecuting, onConfirm, onCancel }: { tile: Tile, weapon: Weapon, isExecuting: boolean, onConfirm: () => void, onCancel: () => void }) => {
    const tileLabel = getTileLabel(tile.row, tile.col);
    const targetType = tile.ownerId ? 'معادية' : 'محايدة';

    return (
        <div className="strike-panel">
            <div className="strike-panel__header">
                <Target size={20} className="strike-panel__icon" />
                <div className="strike-panel__target">
                    <span className="strike-panel__label">الهدف</span>
                    <span className="strike-panel__coord">{tileLabel}</span>
                </div>
                <button className="strike-panel__close" onClick={onCancel}>
                    <X size={18} />
                </button>
            </div>

            <div className="strike-panel__details">
                <div className="strike-detail">
                    <span className="strike-detail__label">السلاح</span>
                    <span className="strike-detail__value">{weapon.name}</span>
                </div>
                <div className="strike-detail">
                    <span className="strike-detail__label">القوة</span>
                    <span className="strike-detail__value strike-detail__value--power">{weapon.power}</span>
                </div>
                <div className="strike-detail">
                    <span className="strike-detail__label">النوع</span>
                    <span className={`strike-detail__value strike-detail__value--${tile.ownerId ? 'enemy' : 'neutral'}`}>
                        {targetType}
                    </span>
                </div>
                <div className="strike-detail">
                    <span className="strike-detail__label">النقاط</span>
                    <span className="strike-detail__value">{tile.points.toLocaleString()}</span>
                </div>
            </div>

            <div className="strike-panel__actions">
                <button className="strike-btn strike-btn--cancel" onClick={onCancel} disabled={isExecuting}>
                    تراجع
                </button>
                <button className="strike-btn strike-btn--confirm" onClick={onConfirm} disabled={isExecuting}>
                    {isExecuting ? (
                        <div className="mini-loader" />
                    ) : (
                        <>
                            <Crosshair size={16} />
                            <span>تنفيذ الضربة</span>
                        </>
                    )}
                </button>
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
    const { zoom, pan, isDragging, zoomIn, zoomOut, resetView, handleMouseDown, handleMouseMove, handleMouseUp } = useZoomAndPan();
    const {
        isActive: warModeActive, selectedWeapon, targetTile, isExecuting,
        showWeapons, availableWeapons, toggleWarMode,
        selectWeapon, selectTarget, cancelStrike, executeStrike, setShowWeapons
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
                <div className="map-loader">
                    <div className="loader-ring" />
                    <span>جاري تحميل الخريطة...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
            :root {
                --map-bg: #030308;
                --map-grid-bg: rgba(255, 255, 255, 0.02);
                --map-border: rgba(255, 255, 255, 0.08);
                --map-border-bright: rgba(255, 255, 255, 0.15);
                --map-tile-size: 32px;
                --tactical-red: #ef4444;
                --tactical-red-glow: rgba(239, 68, 68, 0.5);
                --tactical-blue: #6366f1;
                --tactical-blue-glow: rgba(99, 102, 241, 0.5);
                --tactical-green: #22c55e;
                --tactical-gold: #f59e0b;
                --sidebar-width: 320px;
                --header-height: 70px;
            }

            .map-page {
                position: relative; 
                height: calc(100vh - 100px); 
                width: 100%;
                background: var(--map-bg);
                overflow: hidden;
                border: 1px solid var(--map-border);
                border-radius: 20px;
                margin-top: 10px;
            }

            .map-page::before {
                content: ''; position: absolute; inset: 0;
                background: 
                    radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
                    radial-gradient(ellipse at 70% 80%, rgba(239, 68, 68, 0.03) 0%, transparent 50%);
                pointer-events: none;
            }

            /* ═══ Tactical Header (Floating Top Left) ═══ */
            .map-tactical-header {
                position: absolute; top: 1.5rem; left: 1.5rem;
                z-index: 100;
                pointer-events: none;
            }

            .map-header__label { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; }
            .map-header__label-text { font-size: 0.6rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--tactical-blue); opacity: 0.8; }
            .map-header__label-icon { color: var(--tactical-blue); animation: radar-spin 4s linear infinite; }
            @keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .map-header__title { font-size: 1.4rem; font-weight: 950; letter-spacing: -0.5px; margin: 0; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }

            /* ═══ Tactical Status (Floating Bottom Right) ═══ */
            .map-tactical-controls {
                position: absolute; bottom: 1.5rem; right: 1.5rem;
                z-index: 100;
                display: flex; align-items: stretch; gap: 1rem;
            }

            .map-header__center { 
                display: flex; align-items: center; gap: 1rem; 
                padding: 0.75rem 1.25rem; 
                background: rgba(10, 11, 20, 0.9); 
                backdrop-filter: blur(15px);
                border-radius: 12px; 
                border: 1px solid var(--map-border-bright); 
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .map-header__stat { text-align: center; min-width: 60px; }
            .map-header__stat-value { font-size: 1.1rem; font-weight: 900; color: var(--tactical-gold); }
            .map-header__stat-label { font-size: 0.55rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
            .map-header__divider { width: 1px; height: 24px; background: var(--map-border); }

            .war-toggle-btn {
                display: flex; align-items: center; gap: 0.75rem;
                padding: 0 1.5rem;
                background: rgba(10, 11, 20, 0.9);
                backdrop-filter: blur(15px);
                border: 1px solid var(--map-border-bright);
                border-radius: 12px;
                color: #fff;
                font-size: 0.9rem;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .war-toggle-btn:hover { border-color: var(--tactical-blue); transform: translateY(-2px); }
            .war-toggle-btn--active { background: var(--tactical-red); border-color: #fff; box-shadow: 0 0 30px var(--tactical-red-glow); }
            .war-toggle-btn--active:hover { background: #dc2626; transform: translateY(-2px); }

            /* ═══ Map Viewport (Inside relative container) ═══ */
            .map-viewport { 
                height: 100%; 
                width: 100%;
                overflow: hidden;
                cursor: grab;
                display: flex; align-items: center; justify-content: center;
                position: relative;
            }
            .map-viewport--dragging { cursor: grabbing; }

            .map-grid-wrapper { 
                padding: 20px; 
                background: var(--map-grid-bg); 
                border: 1px solid var(--map-border); 
                border-radius: 8px;
                transition: transform 0.1s;
                will-change: transform;
            }

            .map-grid { display: grid; gap: 2px; }

            .map-tile { 
                position: relative; 
                width: var(--map-tile-size); 
                height: var(--map-tile-size); 
                background: rgba(255, 255, 255, 0.03); 
                cursor: default; 
                transition: 0.15s; 
                overflow: hidden;
                border-radius: 2px;
            }
            .map-tile--interactive { cursor: crosshair; }
            .map-tile--interactive:hover { 
                background: rgba(255, 255, 255, 0.1); 
                transform: scale(1.1);
                z-index: 10;
                box-shadow: 0 0 10px rgba(255,255,255,0.1);
            }
            .tile-fill { position: absolute; inset: 0; background: var(--tile-color, transparent); opacity: var(--tile-opacity, 0); transition: opacity 0.3s; border-radius: 2px; }
            .tile-border { position: absolute; inset: 0; border: 0.5px solid rgba(255, 255, 255, 0.05); pointer-events: none; border-radius: 2px; }
            
            .map-tile--targeted { 
                animation: target-pulse 1s infinite;
                z-index: 20;
            }
            .map-tile--targeted .tile-border { 
                border: 2px solid var(--tactical-red); 
                box-shadow: 0 0 15px var(--tactical-red-glow), inset 0 0 10px var(--tactical-red-glow); 
            }
            @keyframes target-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            
            .tile-id { position: absolute; top: 2px; left: 3px; font-size: 6px; font-weight: 600; color: rgba(255, 255, 255, 0.25); pointer-events: none; }
            .tile-points { position: absolute; bottom: 2px; right: 3px; font-size: 7px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px #000; pointer-events: none; }
            .tile-crosshair { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--tactical-red); }

            /* ═══ Zoom Controls ═══ */
            .zoom-controls { 
                position: fixed; 
                bottom: 1.5rem; 
                left: 1.5rem; 
                z-index: 90; 
                display: flex; 
                flex-direction: column; 
                align-items: center;
                gap: 0.3rem;
                background: rgba(10, 11, 20, 0.9);
                backdrop-filter: blur(10px);
                padding: 0.5rem;
                border-radius: 12px;
                border: 1px solid var(--map-border);
            }
            .zoom-btn { 
                width: 36px; 
                height: 36px; 
                border-radius: 8px; 
                background: transparent;
                border: none;
                color: #fff; 
                display: flex; align-items: center; justify-content: center; 
                cursor: pointer; 
                transition: 0.2s; 
            }
            .zoom-btn:hover { background: rgba(99, 102, 241, 0.2); }
            .zoom-btn--reset { margin-top: 0.3rem; border-top: 1px solid var(--map-border); padding-top: 0.3rem; }
            .zoom-indicator { font-size: 0.65rem; font-weight: 800; color: rgba(255,255,255,0.6); padding: 0.2rem 0; }

            /* ═══ Sidebar ═══ */
            .weapon-sidebar {
                position: fixed;
                top: 0;
                right: 0;
                width: var(--sidebar-width);
                height: 100vh;
                background: rgba(8, 9, 16, 0.98);
                border-left: 1px solid var(--map-border-bright);
                z-index: 80;
                display: flex;
                flex-direction: column;
            }

            .weapon-sidebar__header {
                padding: 1.25rem;
                border-bottom: 1px solid var(--map-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
            }
            .weapon-sidebar__title {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #fff;
                font-weight: 700;
                font-size: 0.95rem;
            }
            .weapon-sidebar__toggle {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                cursor: pointer;
                padding: 0.25rem;
            }

            .weapon-sidebar__status {
                padding: 0.75rem 1.25rem;
                background: rgba(255,255,255,0.02);
                border-bottom: 1px solid var(--map-border);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ef4444;
                box-shadow: 0 0 8px #ef4444;
                animation: blink 1s infinite;
            }
            .status-dot--active {
                background: #22c55e;
                box-shadow: 0 0 8px #22c55e;
                animation: none;
            }
            .status-text {
                font-size: 0.75rem;
                color: rgba(255,255,255,0.6);
                font-weight: 600;
            }

            .weapon-sidebar__grid {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .weapons-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                padding: 3rem 1rem;
                color: rgba(255,255,255,0.3);
                text-align: center;
            }
            .weapons-empty p { font-size: 0.85rem; margin: 0; }

            .weapon-card { 
                background: rgba(255, 255, 255, 0.03); 
                border: 1px solid var(--map-border); 
                border-radius: 12px; 
                padding: 1rem; 
                cursor: pointer; 
                transition: 0.2s; 
            }
            .weapon-card:hover { 
                background: rgba(255, 255, 255, 0.06); 
                border-color: var(--map-border-bright);
                transform: translateX(-4px);
            }
            .weapon-card--active { 
                background: rgba(99, 102, 241, 0.15); 
                border-color: var(--tactical-blue);
                box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
            }
            .weapon-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
            .weapon-card__name { font-size: 0.9rem; font-weight: 800; color: #fff; }
            .weapon-card__qty { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; }
            .weapon-card__stats { display: flex; align-items: center; justify-content: space-between; }
            .weapon-card__power { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 700; color: var(--tactical-gold); }
            .weapon-card__type { font-size: 0.65rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 4px; }
            .weapon-card__type--attack { background: rgba(239, 68, 68, 0.15); color: var(--tactical-red); }
            .weapon-card__type--defense { background: rgba(99, 102, 241, 0.15); color: var(--tactical-blue); }

            /* ═══ Strike Panel ═══ */
            .strike-panel {
                position: fixed;
                bottom: 1.5rem;
                left: 50%;
                transform: translateX(-50%);
                width: calc(100% - var(--sidebar-width) - 3rem);
                max-width: 600px;
                background: rgba(12, 13, 22, 0.98);
                backdrop-filter: blur(20px);
                border: 1px solid var(--map-border-bright);
                border-radius: 16px;
                padding: 1.25rem;
                z-index: 150;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
            }

            .strike-panel__header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid var(--map-border);
            }
            .strike-panel__icon { color: var(--tactical-red); }
            .strike-panel__target { flex: 1; display: flex; flex-direction: column; }
            .strike-panel__label { font-size: 0.65rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
            .strike-panel__coord { font-size: 1.5rem; font-weight: 900; color: #fff; }
            .strike-panel__close {
                background: rgba(255,255,255,0.05);
                border: none;
                color: rgba(255,255,255,0.6);
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: 0.2s;
            }
            .strike-panel__close:hover { background: rgba(239, 68, 68, 0.2); color: var(--tactical-red); }

            .strike-panel__details {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 1rem;
                margin-bottom: 1rem;
            }
            .strike-detail { display: flex; flex-direction: column; gap: 0.25rem; }
            .strike-detail__label { font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; }
            .strike-detail__value { font-size: 0.9rem; font-weight: 700; color: #fff; }
            .strike-detail__value--power { color: var(--tactical-gold); }
            .strike-detail__value--enemy { color: var(--tactical-red); }
            .strike-detail__value--neutral { color: var(--tactical-green); }

            .strike-panel__actions {
                display: flex;
                gap: 0.75rem;
            }
            .strike-btn { 
                flex: 1; 
                padding: 0.875rem; 
                border-radius: 10px; 
                font-size: 0.85rem; 
                font-weight: 800; 
                border: none; 
                cursor: pointer; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                gap: 0.5rem;
                transition: 0.2s;
            }
            .strike-btn--cancel { 
                background: rgba(255, 255, 255, 0.05); 
                color: #fff; 
                border: 1px solid var(--map-border); 
            }
            .strike-btn--cancel:hover { background: rgba(255,255,255,0.1); }
            .strike-btn--confirm { 
                background: var(--tactical-red); 
                color: #fff;
                box-shadow: 0 4px 15px var(--tactical-red-glow);
            }
            .strike-btn--confirm:hover:not(:disabled) { 
                background: #dc2626;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px var(--tactical-red-glow);
            }
            .strike-btn:disabled { opacity: 0.6; cursor: not-allowed; }

            /* ═══ Loader ═══ */
            .map-loader {
                position: fixed; inset: 0;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                gap: 1rem;
                color: rgba(255,255,255,0.5);
            }
            .loader-ring {
                width: 48px; height: 48px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: var(--tactical-blue);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }

            .mini-loader { 
                width: 18px; height: 18px; 
                border: 2px solid rgba(255, 255, 255, 0.2); 
                border-top-color: #fff; 
                border-radius: 50%; 
                animation: spin 0.8s linear infinite; 
            }

            /* ═══ Responsive ═══ */
            @media (max-width: 1024px) {
                :root { --sidebar-width: 280px; }
            }
            @media (max-width: 768px) {
                :root { --sidebar-width: 100%; }
                .weapon-sidebar {
                    top: auto;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    width: 100%;
                    height: 50vh;
                    border-left: none;
                    border-top: 1px solid var(--map-border-bright);
                }
                .map-header { right: 0; }
                .map-viewport { right: 0; bottom: 50vh; }
                .zoom-controls { bottom: calc(50vh + 1rem); }
                .strike-panel {
                    width: calc(100% - 2rem);
                    left: 1rem;
                    right: 1rem;
                    transform: none;
                }
            }
            `}</style>

            <div className="map-page">
                {/* Header Overlay (Top Left) */}
                <MapHeader />

                {/* Viewport & Grid */}
                <MapGrid
                    getTile={getTile}
                    targetTileId={targetTile?.id || null}
                    isWarMode={warModeActive}
                    zoom={zoom}
                    pan={pan}
                    isDragging={isDragging}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTileClick={selectTarget}
                />

                {/* Tactical Controls Overlay (Bottom Right) */}
                <div className="map-tactical-controls">
                    <div className="map-header__center">
                        <div className="map-header__stat">
                            <div className="map-header__stat-value">{userStats.tileCount}</div>
                            <div className="map-header__stat-label">قطاعات</div>
                        </div>
                        <div className="map-header__divider" />
                        <div className="map-header__stat">
                            <div className="map-header__stat-value">{userStats.totalPoints.toLocaleString()}</div>
                            <div className="map-header__stat-label">نقاط</div>
                        </div>
                    </div>

                    <button
                        className={`war-toggle-btn ${warModeActive ? 'war-toggle-btn--active' : ''}`}
                        onClick={toggleWarMode}
                    >
                        {warModeActive ? <X size={20} /> : <Swords size={20} />}
                        <span>{warModeActive ? 'إلغاء' : 'وضع الحرب'}</span>
                    </button>
                </div>

                {/* Zoom Controls Overlay (Bottom Left) */}
                <ZoomControls
                    zoom={zoom}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onReset={resetView}
                />

                {/* War Mode Features */}
                {warModeActive && (
                    <WeaponSidebar
                        isVisible={showWeapons}
                        weapons={availableWeapons}
                        selectedWeaponId={selectedWeapon?.id || null}
                        onToggle={() => setShowWeapons(!showWeapons)}
                        onSelectWeapon={selectWeapon}
                    />
                )}

                {targetTile && selectedWeapon && (
                    <StrikePanel
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
