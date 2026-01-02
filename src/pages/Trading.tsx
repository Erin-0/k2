import { useEffect, useState, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, Activity, Database, Zap, ArrowRight } from 'lucide-react';

export const Trading = () => {
    const { user, refreshUser } = useAuth();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<IChartApi | null>(null);

    const [candles, setCandles] = useState<any[]>([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [amount, setAmount] = useState<number | string>('');
    const [activePosition, setActivePosition] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const snap = await getDocs(collection(db, "users"));
                let T = 0;
                snap.forEach(doc => T += (doc.data().balance || 0));
                const A = T * 0.03;
                const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=365');
                const data = await res.json();
                const lastClose = parseFloat(data[data.length - 1][4]);
                const ratio = A / lastClose;
                const formatted = data.map((d: any) => ({
                    time: new Date(d[0]).toISOString().split('T')[0],
                    open: parseFloat(d[1]) * ratio,
                    high: parseFloat(d[2]) * ratio,
                    low: parseFloat(d[3]) * ratio,
                    close: parseFloat(d[4]) * ratio
                }));
                setCandles(formatted);
                setCurrentPrice(formatted[formatted.length - 1].close);
            } catch (e) { console.error("بيانات السوق غير متوفرة حالياً"); }
        };
        init();
    }, []);

    useEffect(() => {
        if (!candles.length || !chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#64748b',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace'
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.01)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.01)' }
            },
            width: chartContainerRef.current.clientWidth,
            height: 280, // تصغير الارتفاع ليناسب شاشة الهاتف
            timeScale: { borderVisible: false },
            rightPriceScale: { borderVisible: false },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        });

        const newSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444'
        });

        newSeries.setData(candles);
        chartInstanceRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [candles]);

    const handleTrade = async (type: 'buy' | 'sell') => {
        const numAmount = Number(amount);
        const userBalance = user?.balance || 0;
        if (numAmount <= 0 || numAmount > userBalance) return alert("خطأ_في_التمويل: احتياطيات سائلة غير كافية.");
        if (activePosition) return alert("رفض_التداخل: أغلق المركز الحالي قبل البدء بمركز جديد.");

        if (!window.confirm(`تفويض_الطلب: تأكيد أمر ${type === 'buy' ? 'شراء' : 'بيع'} بمبلغ $${numAmount.toLocaleString()}؟`)) return;

        setActivePosition({ type, entryPrice: currentPrice, amount: numAmount, startTime: Date.now() });
        const userRef = doc(db, 'users', user!.id);
        await updateDoc(userRef, { balance: userBalance - numAmount });
        await refreshUser();
    };

    const closePosition = async () => {
        if (!activePosition || !user) return;
        const priceDiff = currentPrice - activePosition.entryPrice;
        const percentChange = priceDiff / activePosition.entryPrice;
        let profit = activePosition.type === 'buy' ? activePosition.amount * percentChange : activePosition.amount * (-percentChange);
        const totalReturn = activePosition.amount + profit;
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { balance: user.balance + totalReturn });
        await addDoc(collection(db, "activities"), {
            userId: user.id,
            message: `نتائج التبادل العصبي: ${profit >= 0 ? 'صافي_ربح' : 'سحب_كلي'} $${Math.abs(profit).toFixed(2)}`,
            timestamp: serverTimestamp(),
            type: 'trade'
        });
        await refreshUser();
        setActivePosition(null);
        setAmount('');
    };

    let currentPL = 0;
    if (activePosition) {
        const diff = currentPrice - activePosition.entryPrice;
        const pct = diff / activePosition.entryPrice;
        currentPL = activePosition.type === 'buy' ? activePosition.amount * pct : activePosition.amount * -pct;
    }

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.6rem' }}>عقدة_التبادل: رابط_الارتباط_العصبي</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.6rem', margin: 0 }}>محطة السوق</h1>
                </div>
                <div className="system-status" style={{ width: 'fit-content' }}>
                    <div className="status-dot"></div>
                    <span className="micro-label" style={{ fontSize: '0.5rem' }}>مزامنة_العقدة_مستقرة</span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Market Visualization Terminal */}
                <div className="card card-glow" style={{ padding: '1rem', border: '1px solid var(--border-bright)', position: 'relative' }}>
                    <div className="scanline"></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>رمز التداول</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Database size={12} color="var(--primary)" />
                                <span className="mono" style={{ fontSize: '0.9rem', fontWeight: '900' }}>BTC / SOV</span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>تقييم المؤشر</p>
                            <div className="mono" style={{ fontSize: '0.9rem', fontWeight: '900', color: 'white' }}>${currentPrice.toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div
                        ref={chartContainerRef}
                        style={{
                            width: '100%',
                            height: '280px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.02)'
                        }}
                    />
                </div>

                {!activePosition ? (
                    <div className="card card-glow" style={{ padding: '1.25rem', border: '1px solid var(--border-dim)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <Zap size={16} color="var(--primary)" />
                            <h3 className="micro-label" style={{ fontSize: '0.75rem' }}>محطة نشر رأس المال</h3>
                        </div>

                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', padding: '1rem', marginBottom: '1rem' }}>
                            <label className="micro-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.6rem' }}>حجم التخصيص ($)</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span className="mono" style={{ position: 'absolute', left: '0.5rem', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: '900' }}>$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="mono"
                                    style={{
                                        padding: '0.75rem 0.75rem 0.75rem 2rem',
                                        fontSize: '1.5rem',
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: 'none',
                                        borderBottom: '2px solid var(--primary)',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', opacity: 0.6 }}>
                                <span className="micro-label" style={{ fontSize: '0.55rem' }}>السيولة المتاحة</span>
                                <span className="mono" style={{ color: 'var(--success)', fontSize: '0.7rem' }}>${(user?.balance || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button
                                onClick={() => handleTrade('buy')}
                                className="primary"
                                style={{
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #064e3b, #10b981)',
                                    fontSize: '0.85rem',
                                    fontWeight: '900',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <TrendingUp size={20} /> شراء
                            </button>
                            <button
                                onClick={() => handleTrade('sell')}
                                className="primary"
                                style={{
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #450a0a, #ef4444)',
                                    fontSize: '0.85rem',
                                    fontWeight: '900',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <TrendingDown size={20} /> بيع
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card card-glow" style={{ border: `1px solid ${currentPL >= 0 ? 'var(--success)' : 'var(--danger)'}`, padding: '1.25rem' }}>
                        <div className="scanline"></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={18} color={currentPL >= 0 ? 'var(--success)' : 'var(--danger)'} className="pulse" />
                                <h3 className="micro-label" style={{ fontSize: '0.75rem' }}>المركز النشط: {activePosition.type === 'buy' ? 'شراء' : 'بيع'}</h3>
                            </div>
                            <div className="status-badge connected" style={{ fontSize: '0.5rem', background: currentPL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: currentPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>المركز مفتوح</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-dim)' }}>
                                <p className="micro-label" style={{ fontSize: '0.55rem', marginBottom: '0.25rem' }}>الأموال المخصصة</p>
                                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: '900' }}>${activePosition.amount.toLocaleString()}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', opacity: 0.5 }}>
                                    <ArrowRight size={10} />
                                    <span className="micro-label" style={{ fontSize: '0.5rem' }}>السعر الأساسي: ${activePosition.entryPrice.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="card" style={{
                                background: currentPL >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                padding: '1rem',
                                border: `1px solid ${currentPL >= 0 ? 'var(--success)' : 'var(--danger)'}`,
                                textAlign: 'center'
                            }}>
                                <p className="micro-label" style={{ fontSize: '0.6rem' }}>صافي الربح/الخسارة غير المحقق</p>
                                <div className="mono" style={{ fontSize: '2rem', fontWeight: '900', color: currentPL >= 0 ? 'var(--success)' : 'var(--danger)', margin: '0.5rem 0' }}>
                                    {currentPL >= 0 ? '+' : ''}${currentPL.toLocaleString()}
                                </div>
                                <div className="micro-label" style={{ opacity: 0.6, fontSize: '0.55rem' }}>مؤشر التغير: {((currentPL / activePosition.amount) * 100).toFixed(2)}%</div>
                            </div>
                        </div>

                        <button
                            onClick={closePosition}
                            className="primary"
                            style={{
                                width: '100%',
                                marginTop: '1.5rem',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-bright)',
                                fontSize: '0.85rem',
                                fontWeight: '900'
                            }}
                        >
                            تنفيذ بروتوكول التصفية // الخروج
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 110px !important; }
                }
            `}</style>
        </div>
    );
};