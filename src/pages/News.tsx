import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Radio, TrendingUp, Sword, Home, Landmark, ArrowRightLeft } from 'lucide-react';
import { formatNeuralCurrency } from '../utils/formatters';

interface NewsItem {
    id: string;
    type: 'acquisition' | 'conflict' | 'uplink' | 'loan' | 'commerce' | 'system';
    content: string;
    username: string;
    userColor: string;
    timestamp: any;
    value?: number | string;
}

const NewsIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'acquisition': return <Home size={18} color="var(--primary)" />;
        case 'conflict': return <Sword size={18} color="var(--danger)" />;
        case 'uplink': return <ArrowRightLeft size={18} color="#a855f7" />;
        case 'loan': return <Landmark size={18} color="var(--warning)" />;
        case 'commerce': return <TrendingUp size={18} color="var(--success)" />;
        default: return <Radio size={18} color="var(--primary)" />;
    }
};

export const News = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "news"), orderBy("timestamp", "desc"), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem)));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="neural-loader"></div>
            <p className="micro-label" style={{ marginLeft: '1rem', letterSpacing: '2px' }}>جاري مزامنة البث العالمي...</p>
        </div>
    );

    return (
        <div className="page-container fade-in" style={{ padding: '1rem' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div className="pulse-indicator" style={{ background: 'var(--danger)', width: '6px', height: '6px' }}></div>
                        <p className="micro-label" style={{ color: 'var(--danger)', fontSize: '0.6rem', letterSpacing: '2px' }}>بث_مباشر_رابط_القمر_الصناعي</p>
                    </div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>شبكة الأخبار العصبية</h1>
                </div>
                <div className="system-status" style={{ width: 'fit-content', padding: '0.3rem 0.6rem' }}>
                    <span className="micro-label" style={{ fontSize: '0.6rem' }}>المستمعون النشطون: {Math.floor(Math.random() * 100) + 50}</span>
                </div>
            </div>

            {/* News Feed */}
            <div className="news-feed" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {news.map((item) => (
                    <div key={item.id} className="card card-glow news-card" style={{ 
                        padding: '1rem', 
                        borderLeft: `3px solid ${item.userColor || 'var(--primary)'}`,
                        background: 'rgba(255,255,255,0.01)',
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: '16px'
                    }}>
                        <div className="scanline" style={{ opacity: 0.05 }}></div>
                        
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div className="news-icon-box" style={{ 
                                background: 'rgba(0,0,0,0.3)', 
                                padding: '0.75rem', 
                                borderRadius: '10px',
                                border: '1px solid var(--border-dim)',
                                flexShrink: 0
                            }}>
                                <NewsIcon type={item.type} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="mono" style={{ color: item.userColor, fontWeight: '900', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            @{item.username.toUpperCase()}
                                        </span>
                                        <span className="mono" style={{ fontSize: '0.55rem', opacity: 0.4 }}>
                                            {item.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <span className="micro-label" style={{ opacity: 0.2, fontSize: '0.5rem', marginTop: '2px' }}>معرف_الحدث_{item.id.substring(0,8).toUpperCase()}</span>
                                </div>

                                <p className="news-content" style={{ 
                                    fontSize: '0.9rem', 
                                    lineHeight: '1.4', 
                                    color: 'white',
                                    margin: 0,
                                    opacity: 0.9
                                }}>
                                    {item.content}
                                </p>

                                {item.value && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <span className="status-badge connected" style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>
                                            القيمة: {typeof item.value === 'number' ? `$${formatNeuralCurrency(item.value)}` : item.value}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {news.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.3 }}>
                        <Radio size={40} style={{ marginBottom: '1rem' }} />
                        <p className="micro-label">لا توجد إشارات بث حالية...</p>
                    </div>
                )}
            </div>

            <style>{`
                .news-card {
                    transition: all 0.2s ease;
                }
                .news-card:active {
                    transform: scale(0.98);
                    background: rgba(255,255,255,0.05) !important;
                }
                .pulse-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    position: relative;
                }
                .pulse-indicator::after {
                    content: '';
                    position: absolute;
                    inset: -3px;
                    border-radius: 50%;
                    border: 1.5px solid currentColor;
                    animation: ripple 2s infinite;
                }
                @keyframes ripple {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(3); opacity: 0; }
                }
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 110px !important; }
                }
            `}</style>
        </div>
    );
};