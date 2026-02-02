import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { Radio, TrendingUp, Sword, Home, Landmark, ArrowRightLeft, Plus, Trophy, Clock, Image as ImageIcon, Users, CheckCircle, ShieldAlert, Zap, Globe, Activity } from 'lucide-react';
import { formatNeuralCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface NewsItem {
    id: string;
    type: 'acquisition' | 'conflict' | 'uplink' | 'loan' | 'commerce' | 'system';
    content: string;
    username: string;
    userColor: string;
    timestamp: any;
    value?: number | string;
}

interface EventItem {
    id: string;
    title: string;
    description: string;
    rules?: string;
    prizes: { first: string; second: string; third: string };
    cardImage: string;
    detailImage: string;
    startTime: any;
    participants: string[];
    creatorId: string;
}

const NewsIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'acquisition': return <Home size={16} />;
        case 'conflict': return <Sword size={16} />;
        case 'uplink': return <ArrowRightLeft size={16} />;
        case 'loan': return <Landmark size={16} />;
        case 'commerce': return <TrendingUp size={16} />;
        default: return <Activity size={16} />;
    }
};

const getIconColor = (type: string) => {
    switch (type) {
        case 'acquisition': return 'var(--primary)';
        case 'conflict': return 'var(--danger)';
        case 'uplink': return '#a855f7';
        case 'loan': return 'var(--warning)';
        case 'commerce': return 'var(--success)';
        default: return 'var(--text-muted)';
    }
};

export const News = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'news' | 'events'>('news');
    const [news, setNews] = useState<NewsItem[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [authCode, setAuthCode] = useState('');
    const [authStep, setAuthStep] = useState<'code' | 'question'>('code');
    const [newEvent, setNewEvent] = useState({
        title: '', description: '', rules: '',
        prize1: '', prize2: '', prize3: '',
        cardImage: '', detailImage: '', startTime: ''
    });

    useEffect(() => {
        const qNews = query(collection(db, "news"), orderBy("timestamp", "desc"), limit(50));
        const unsubNews = onSnapshot(qNews, (snapshot) => {
            setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem)));
        });

        const qEvents = query(collection(db, "events"), orderBy("startTime", "asc"));
        const unsubEvents = onSnapshot(qEvents, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventItem)));
            setLoading(false);
        });

        return () => { unsubNews(); unsubEvents(); };
    }, []);

    const handleAuthSubmit = () => {
        if (authStep === 'code') {
            if (authCode === '899889') {
                setShowAuthModal(false);
                setShowEventModal(true);
                setAuthCode('');
            } else {
                setAuthStep('question');
                setAuthCode('');
            }
        } else {
            if (authCode.includes('غوكو') || authCode.toLowerCase().includes('goku')) {
                setShowAuthModal(false);
                setShowEventModal(true);
                setAuthCode('');
                setAuthStep('code');
            } else {
                alert('إجابة خاطئة. الوصول مرفوض.');
                setShowAuthModal(false);
                setAuthStep('code');
            }
        }
    };

    const handleCreateEvent = async () => {
        if (!newEvent.title || !newEvent.startTime) return;
        try {
            await addDoc(collection(db, "events"), {
                title: newEvent.title,
                description: newEvent.description,
                rules: newEvent.rules,
                prizes: { first: newEvent.prize1, second: newEvent.prize2, third: newEvent.prize3 },
                cardImage: newEvent.cardImage,
                detailImage: newEvent.detailImage,
                startTime: new Date(newEvent.startTime),
                participants: [],
                creatorId: user?.id,
                createdAt: serverTimestamp()
            });
            setShowEventModal(false);
            setNewEvent({ title: '', description: '', rules: '', prize1: '', prize2: '', prize3: '', cardImage: '', detailImage: '', startTime: '' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleJoinEvent = async (eventId: string) => {
        if (!user) return;
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            participants: arrayUnion(user.id)
        });
    };

    const getTimeLeft = (date: any) => {
        const now = new Date().getTime();
        const target = date?.toDate ? date.toDate().getTime() : new Date(date).getTime();
        const diff = target - now;

        if (diff < 0) return "منتهي";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days} يوم ${hours} ساعة`;
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="neural-loader"></div>
        </div>
    );

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div className="pulse-indicator"></div>
                        <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.6rem', letterSpacing: '2px' }}>محطة_البث_العالمية</p>
                    </div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>سجل النظام</h1>
                </div>

                <div className="flex bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg shadow-black/40">
                    <button
                        className={`
            tab-btn flex-1 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
            flex items-center justify-center gap-2
            ${activeTab === 'news'
                                ? 'bg-gradient-to-r from-red-600/80 to-rose-600/60 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-rose-500/40'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }
        `}
                        onClick={() => setActiveTab('news')}
                    >
                        <Radio size={18} className={activeTab === 'news' ? 'text-white' : ''} />
                        <span>الأخبار</span>
                    </button>

                    <button
                        className={`
            tab-btn flex-1 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
            flex items-center justify-center gap-2
            ${activeTab === 'events'
                                ? 'bg-gradient-to-r from-indigo-600/80 to-violet-600/60 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-violet-500/40'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }
        `}
                        onClick={() => setActiveTab('events')}
                    >
                        <Trophy size={18} className={activeTab === 'events' ? 'text-white' : ''} />
                        <span>الأحداث</span>
                    </button>
                </div>
            </header>

            {/* NEWS FEED */}
            {activeTab === 'news' && (
                <div className="news-feed-container">
                    <div className="feed-line"></div>
                    {news.map((item, index) => (
                        <div key={item.id} className="news-item-wrapper fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            <div className="timeline-dot" style={{ borderColor: getIconColor(item.type) }}></div>
                            <div className="card card-glow news-card">
                                <div className="news-header">
                                    <div className="user-badge" style={{ borderColor: item.userColor }}>
                                        <div className="avatar-placeholder" style={{ background: item.userColor }}>
                                            {item.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="username mono">{item.username}</span>
                                    </div>
                                    <span className="timestamp mono">
                                        {item.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div className="news-content">
                                    <div className="icon-wrapper" style={{ color: getIconColor(item.type), background: `${getIconColor(item.type)}20` }}>
                                        <NewsIcon type={item.type} />
                                    </div>
                                    <p className="message">{item.content}</p>
                                </div>

                                {item.value && (
                                    <div className="news-footer">
                                        <div className="value-chip">
                                            <span className="label">القيمة:</span>
                                            <span className="val mono">{typeof item.value === 'number' ? formatNeuralCurrency(item.value) : item.value}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* EVENTS FEED */}
            {activeTab === 'events' && (
                <div className="events-container pb-20">
                    <div className="events-actions mb-6 flex justify-end">
                        <button className="create-event-btn" onClick={() => setShowAuthModal(true)}>
                            <Plus size={16} /> إضافة حدث جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        {events.map(event => (
                            <div key={event.id} className="event-card-modern group">
                                <div className="card-image-wrapper">
                                    <img src={event.cardImage} alt="" className="card-bg" />
                                    <div className="card-overlay"></div>
                                    <div className="card-meta">
                                        <div className="meta-badge"><Clock size={12} /> {getTimeLeft(event.startTime)}</div>
                                        <div className="meta-badge"><Users size={12} /> {event.participants?.length || 0}</div>
                                    </div>
                                </div>

                                <div className="card-body">
                                    <h2 className="event-title">{event.title}</h2>
                                    <p className="event-desc">{event.description}</p>

                                    <div className="prizes-grid">
                                        <div className="prize-item gold">
                                            <div className="rank">1</div>
                                            <div className="amount mono">{event.prizes.first}</div>
                                        </div>
                                        <div className="prize-item silver">
                                            <div className="rank">2</div>
                                            <div className="amount mono">{event.prizes.second}</div>
                                        </div>
                                        <div className="prize-item bronze">
                                            <div className="rank">3</div>
                                            <div className="amount mono">{event.prizes.third}</div>
                                        </div>
                                    </div>

                                    <button
                                        className={`join-btn ${event.participants?.includes(user?.id || '') ? 'joined' : ''}`}
                                        onClick={() => handleJoinEvent(event.id)}
                                        disabled={event.participants?.includes(user?.id || '')}
                                    >
                                        {event.participants?.includes(user?.id || '') ? (
                                            <>
                                                <CheckCircle size={16} />
                                                <span>مسجل في الحدث</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={16} />
                                                <span>تسجيل المشاركة</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AUTH MODAL */}
            {showAuthModal && (
                <div className="modal-overlay">
                    <div className="modal-content auth-modal">
                        <div className="modal-header">
                            <ShieldAlert size={24} className="text-danger" />
                            <h3>بروتوكول المسؤولين</h3>
                        </div>
                        <p className="modal-desc">أدخل رمز الوصول المصرح به للمتابعة.</p>

                        {authStep === 'code' ? (
                            <input
                                type="password"
                                className="auth-input mono"
                                placeholder="******"
                                value={authCode}
                                onChange={e => setAuthCode(e.target.value)}
                                autoFocus
                            />
                        ) : (
                            <div className="security-question">
                                <p className="question">"من هو الأقوى؟"</p>
                                <input
                                    type="text"
                                    className="auth-input"
                                    placeholder="الإجابة..."
                                    value={authCode}
                                    onChange={e => setAuthCode(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowAuthModal(false)}>إلغاء</button>
                            <button className="confirm-btn" onClick={handleAuthSubmit}>تحقق</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE EVENT MODAL */}
            {showEventModal && (
                <div className="modal-overlay">
                    <div className="modal-content create-event-modal custom-scrollbar">
                        <div className="modal-header">
                            <Globe size={24} className="text-primary" />
                            <h3>إطلاق حدث عالمي</h3>
                        </div>

                        <div className="form-grid">
                            <div className="form-group full">
                                <label>عنوان الحدث</label>
                                <input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="العنوان الرئيسي..." />
                            </div>

                            <div className="form-group full">
                                <label>وصف الحدث</label>
                                <textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="تفاصيل الحدث..." />
                            </div>

                            <div className="form-group full">
                                <label>وقت البدء</label>
                                <input type="datetime-local" value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} />
                            </div>

                            <div className="form-group full section-label">
                                <Trophy size={14} /> الجوائز والمكافآت
                            </div>

                            <div className="form-group">
                                <label className="gold-text">المركز الأول</label>
                                <input type="text" className="mono text-center" value={newEvent.prize1} onChange={e => setNewEvent({ ...newEvent, prize1: e.target.value })} placeholder="$0" />
                            </div>
                            <div className="form-group">
                                <label className="silver-text">المركز الثاني</label>
                                <input type="text" className="mono text-center" value={newEvent.prize2} onChange={e => setNewEvent({ ...newEvent, prize2: e.target.value })} placeholder="$0" />
                            </div>
                            <div className="form-group">
                                <label className="bronze-text">المركز الثالث</label>
                                <input type="text" className="mono text-center" value={newEvent.prize3} onChange={e => setNewEvent({ ...newEvent, prize3: e.target.value })} placeholder="$0" />
                            </div>

                            <div className="form-group full section-label">
                                <ImageIcon size={14} /> الوسائط
                            </div>

                            <div className="form-group full">
                                <label>رابط الصورة (URL)</label>
                                <input type="text" className="mono" value={newEvent.cardImage} onChange={e => setNewEvent({ ...newEvent, cardImage: e.target.value })} placeholder="https://..." />
                            </div>
                        </div>

                        <div className="modal-actions sticky-bottom">
                            <button className="cancel-btn" onClick={() => setShowEventModal(false)}>إلغاء</button>
                            <button className="confirm-btn primary" onClick={handleCreateEvent}>نشر الحدث</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* TABS */
                .tab-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: 0.3s;
                }
                .tab-btn.active {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    font-weight: 600;
                }

                /* NEWS FEED */
                .news-feed-container {
                    position: relative;
                    padding-left: 20px;
                    padding-bottom: 50px;
                }
                .feed-line {
                    position: absolute;
                    left: 9px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: rgba(255,255,255,0.05);
                }
                .news-item-wrapper {
                    position: relative;
                    margin-bottom: 1.5rem;
                }
                .timeline-dot {
                    position: absolute;
                    left: -16px;
                    top: 20px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #000;
                    border: 2px solid;
                    z-index: 1;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
                .news-card {
                    padding: 1rem;
                    border: 1px solid var(--border-dim);
                    background: rgba(255,255,255,0.02);
                }
                .news-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    padding-bottom: 0.5rem;
                }
                .user-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-left: 2px solid;
                    padding-left: 0.5rem;
                }
                .avatar-placeholder {
                    width: 20px; height: 20px;
                    border-radius: 4px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 10px; font-weight: bold; color: white;
                }
                .username { font-size: 0.85rem; color: white; }
                .timestamp { font-size: 0.7rem; color: var(--text-muted); opacity: 0.5; }
                
                .news-content {
                    display: flex;
                    gap: 0.75rem;
                    align-items: flex-start;
                }
                .icon-wrapper {
                    padding: 0.4rem;
                    border-radius: 6px;
                }
                .message {
                    font-size: 0.9rem;
                    line-height: 1.5;
                    color: #ddd;
                    margin: 0;
                }
                .news-footer {
                    margin-top: 0.75rem;
                    display: flex;
                    justify-content: flex-end;
                }
                .value-chip {
                    background: rgba(255,255,255,0.05);
                    padding: 0.2rem 0.6rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    display: flex;
                    gap: 0.4rem;
                }
                .value-chip .label { opacity: 0.5; }
                .value-chip .val { color: var(--success); }

                /* EVENTS MODERN */
                .create-event-btn {
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--primary);
                    border: 1px solid var(--primary);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .create-event-btn:hover {
                    background: var(--primary);
                    color: white;
                }

                .event-card-modern {
                    background: #0a0b10;
                    border: 1px solid var(--border-dim);
                    border-radius: 16px;
                    overflow: hidden;
                    transition: 0.3s;
                    display: flex;
                    flex-direction: column;
                }
                .event-card-modern:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .card-image-wrapper {
                    height: 180px;
                    position: relative;
                    overflow: hidden;
                }
                .card-bg {
                    width: 100%; height: 100%; object-fit: cover;
                    transition: 0.5s;
                }
                .event-card-modern:hover .card-bg { transform: scale(1.05); }
                .card-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(0deg, #0a0b10 0%, transparent 100%);
                }
                .card-meta {
                    position: absolute; bottom: 10px; right: 10px;
                    display: flex; gap: 0.5rem;
                }
                .meta-badge {
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    padding: 0.3rem 0.6rem;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex; align-items: center; gap: 0.3rem;
                }
                .card-body {
                    padding: 1.5rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .event-title {
                    font-size: 1.4rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                    line-height: 1.2;
                }
                .event-desc {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                    flex: 1;
                }
                .prizes-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    background: rgba(255,255,255,0.02);
                    padding: 0.75rem;
                    border-radius: 10px;
                }
                .prize-item {
                    text-align: center;
                }
                .prize-item .rank { font-size: 0.7rem; font-weight: bold; margin-bottom: 2px; }
                .prize-item .amount { font-size: 0.8rem; font-weight: 700; color: white; }
                .gold .rank { color: #ffd700; }
                .silver .rank { color: #c0c0c0; }
                .bronze .rank { color: #cd7f32; }

                .join-btn {
                    width: 100%;
                    padding: 0.9rem;
                    border-radius: 10px;
                    border: none;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                    background: white;
                    color: black;
                    transition: 0.2s;
                }
                .join-btn:hover { background: #eee; }
                .join-btn.joined {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border: 1px solid #10b981;
                    cursor: default;
                }

                /* MODALS */
                .modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(5px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2000;
                    padding: 1rem;
                }
                .modal-content {
                    background: #0f1016;
                    border: 1px solid var(--border-dim);
                    border-radius: 16px;
                    padding: 1.5rem;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .create-event-modal { max-width: 600px; max-height: 90vh; overflow-y: auto; }
                
                .modal-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
                .modal-header h3 { font-size: 1.2rem; margin: 0; font-weight: 800; }
                .modal-desc { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem; }
                
                .auth-input {
                    width: 100%;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid var(--border-dim);
                    padding: 1rem;
                    color: white;
                    text-align: center;
                    font-size: 1.2rem;
                    border-radius: 8px;
                    outline: none;
                    margin-bottom: 1.5rem;
                    letter-spacing: 2px;
                }
                .auth-input:focus { border-color: var(--primary); }
                
                .modal-actions { display: flex; gap: 1rem; }
                .modal-actions button { flex: 1; padding: 0.9rem; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; }
                .confirm-btn { background: white; color: black; }
                .cancel-btn { background: rgba(255,255,255,0.05); color: white; }
                .confirm-btn.primary { background: var(--primary); color: white; }

                .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
                .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
                .form-group.full { grid-column: 1 / -1; }
                .form-group label { font-size: 0.75rem; opacity: 0.7; }
                .form-group input, .form-group textarea {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-dim);
                    padding: 0.75rem;
                    border-radius: 8px;
                    color: white;
                    outline: none;
                    font-family: inherit;
                }
                .form-group textarea { resize: vertical; min-height: 80px; }
                .section-label { 
                    font-size: 0.8rem; font-weight: bold; color: var(--primary); 
                    display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-dim);
                }
                .sticky-bottom { 
                    position: sticky; bottom: -1.5rem; background: #0f1016; 
                    padding-top: 1rem; padding-bottom: 0; margin-top: 1rem; border-top: 1px solid var(--border-dim);
                }
                
                .pulse-indicator {
                    width: 8px; height: 8px; background: var(--danger);
                    border-radius: 50%; box-shadow: 0 0 10px var(--danger);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

                .gold-text { color: #ffd700 !important; opacity: 1 !important; }
                .silver-text { color: #c0c0c0 !important; opacity: 1 !important; }
                .bronze-text { color: #cd7f32 !important; opacity: 1 !important; }
                .text-danger { color: var(--danger); }
                .text-primary { color: var(--primary); }
            `}</style>
        </div>
    );
};
