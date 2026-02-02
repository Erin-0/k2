import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { Radio, TrendingUp, Sword, Home, Landmark, ArrowRightLeft, Calendar, Plus, Trophy, Clock, Image as ImageIcon, Users, CheckCircle, ShieldAlert } from 'lucide-react';
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
        case 'acquisition': return <Home size={18} color="var(--primary)" />;
        case 'conflict': return <Sword size={18} color="var(--danger)" />;
        case 'uplink': return <ArrowRightLeft size={18} color="#a855f7" />;
        case 'loan': return <Landmark size={18} color="var(--warning)" />;
        case 'commerce': return <TrendingUp size={18} color="var(--success)" />;
        default: return <Radio size={18} color="var(--primary)" />;
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

        if (diff < 0) return "انتهى الحدث";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days} يوم و ${hours} ساعة`;
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="neural-loader"></div>
        </div>
    );

    return (
        <div className="page-container fade-in" style={{ padding: '1rem' }}>
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div className="pulse-indicator" style={{ background: 'var(--danger)', width: '6px', height: '6px' }}></div>
                        <p className="micro-label" style={{ color: 'var(--danger)', fontSize: '0.6rem', letterSpacing: '2px' }}>نظام_الأحداث_العالمي</p>
                    </div>
                    <div className="flex gap-4 mt-2">
                        <button
                            className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`}
                            onClick={() => setActiveTab('news')}
                        >
                            البث المباشر
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                            onClick={() => setActiveTab('events')}
                        >
                            الأحداث الكبرى
                        </button>
                    </div>
                </div>
                {activeTab === 'events' && (
                    <button className="btn-icon" onClick={() => setShowAuthModal(true)}>
                        <Plus size={20} /> إضافة حدث جديد
                    </button>
                )}
            </header>

            {/* NEWS FEED */}
            {activeTab === 'news' && (
                <div className="news-feed flex flex-col gap-4">
                    {news.map((item) => (
                        <div key={item.id} className="card card-glow news-card relative overflow-hidden p-4 rounded-xl"
                            style={{ borderLeft: `3px solid ${item.userColor || 'var(--primary)'}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div className="scanline opacity-5"></div>
                            <div className="flex gap-4 items-start">
                                <div className="news-icon-box bg-black/30 p-3 rounded-lg border border-white/10 shrink-0">
                                    <NewsIcon type={item.type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="mono font-bold text-sm" style={{ color: item.userColor }}>@{item.username.toUpperCase()}</span>
                                        <span className="mono text-xs opacity-40">{item.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm opacity-90 leading-relaxed mb-2 text-right">{item.content}</p>
                                    {item.value && (
                                        <span className="status-badge connected text-xs px-2 py-1 inline-block">
                                            {typeof item.value === 'number' ? `$${formatNeuralCurrency(item.value)}` : item.value}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {news.length === 0 && (
                        <div className="text-center py-16 opacity-30">
                            <Radio size={40} className="mx-auto mb-4" />
                            <p className="micro-label">لا توجد إشارات بث حالية...</p>
                        </div>
                    )}
                </div>
            )}

            {/* EVENTS FEED */}
            {activeTab === 'events' && (
                <div className="events-feed grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    {events.map(event => (
                        <div key={event.id} className="event-card group relative rounded-2xl overflow-hidden border border-purple-500/20 bg-black/40 hover:border-purple-500 transition-all shadow-lg hover:shadow-purple-500/20">
                            {/* Background Image */}
                            <div className="absolute inset-0 z-0">
                                <img src={event.cardImage} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity transform group-hover:scale-105 duration-1000" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                            </div>

                            {/* Content */}
                            <div className="relative z-10 p-6 h-full flex flex-col min-h-[400px]">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                                        حدث رسمي
                                    </span>
                                    <div className="flex flex-col items-end bg-black/40 p-2 rounded backdrop-blur">
                                        <span className="text-xs text-purple-200 mb-1 flex items-center gap-1 font-mono"><Clock size={12} /> {getTimeLeft(event.startTime)}</span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={12} /> {event.participants?.length || 0} مشارك</span>
                                    </div>
                                </div>

                                <h2 className="text-3xl font-black uppercase text-white mb-2 leading-tight drop-shadow-xl font-['Cairo']">{event.title}</h2>
                                <p className="text-gray-300 text-sm line-clamp-3 mb-6 bg-black/30 p-3 rounded backdrop-blur-sm border-r-2 border-purple-500">{event.description}</p>

                                <div className="mt-auto space-y-4">
                                    {/* Prizes */}
                                    <div className="prizes grid grid-cols-3 gap-2 text-center my-4">
                                        <div className="prize-box bg-gradient-to-b from-yellow-500/10 to-transparent border border-yellow-500/20 rounded p-2">
                                            <Trophy size={16} className="mx-auto text-yellow-400 mb-1" />
                                            <span className="block text-xs text-yellow-200 font-mono font-bold">{event.prizes.first}</span>
                                        </div>
                                        <div className="prize-box bg-gradient-to-b from-gray-400/10 to-transparent border border-gray-400/20 rounded p-2 pt-4">
                                            <span className="block text-[10px] text-gray-500 font-bold mb-1">المركز 2</span>
                                            <span className="block text-xs text-gray-300 font-mono">{event.prizes.second}</span>
                                        </div>
                                        <div className="prize-box bg-gradient-to-b from-orange-700/10 to-transparent border border-orange-700/20 rounded p-2 pt-4">
                                            <span className="block text-[10px] text-orange-500 font-bold mb-1">المركز 3</span>
                                            <span className="block text-xs text-orange-300 font-mono">{event.prizes.third}</span>
                                        </div>
                                    </div>

                                    <button
                                        className={`w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${event.participants?.includes(user?.id || '')
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-600/40'
                                            }`}
                                        onClick={() => handleJoinEvent(event.id)}
                                        disabled={event.participants?.includes(user?.id || '')}
                                    >
                                        {event.participants?.includes(user?.id || '') ? (
                                            <><CheckCircle size={18} /> تم تسجيلك بنجاح</>
                                        ) : (
                                            <><Calendar size={18} /> الاشتراك في التحدي</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="col-span-full text-center py-20 opacity-30 border-2 border-dashed border-gray-700 rounded-xl">
                            <Calendar size={64} className="mx-auto mb-4 text-purple-500" />
                            <p className="text-xl">لا توجد أحداث كبرى نشطة حالياً</p>
                            <p className="text-sm mt-2">ترقب التحديثات القادمة من الإدارة العليا</p>
                        </div>
                    )}
                </div>
            )}

            {/* AUTH MODAL */}
            {showAuthModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="auth-modal bg-[#0f0f0f] border border-purple-500/30 p-8 rounded-2xl w-full max-w-sm relative overflow-hidden shadow-2xl shadow-purple-900/20">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"></div>
                        <ShieldAlert size={48} className="mx-auto text-purple-500 mb-4 opacity-80" />
                        <h3 className="text-xl font-bold mb-2 text-center text-white">
                            {authStep === 'code' ? 'بروتوكول المسؤولين' : 'سؤال الأمان الإضافي'}
                        </h3>
                        <p className="text-center text-xs text-gray-500 mb-6">مطلوب تصريح أمني من المستوى 5</p>

                        {authStep === 'code' && (
                            <input
                                type="password"
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 mb-4 text-center font-mono tracking-[0.5em] text-xl focus:border-purple-500 focus:outline-none transition-colors text-white"
                                placeholder="******"
                                value={authCode}
                                onChange={e => setAuthCode(e.target.value)}
                                autoFocus
                            />
                        )}
                        {authStep === 'question' && (
                            <div className="mb-4">
                                <p className="mb-3 text-sm text-purple-300 font-bold text-center bg-purple-900/20 p-2 rounded">"ايه اقوى شخصية؟"</p>
                                <input
                                    type="text"
                                    className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors text-center text-white"
                                    placeholder="الإجابة..."
                                    value={authCode}
                                    onChange={e => setAuthCode(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}
                        <div className="flex flex-col gap-2 mt-4">
                            <button className="w-full py-3 bg-purple-600 rounded-lg font-bold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/30 text-white" onClick={handleAuthSubmit}>
                                التحقق من الهوية
                            </button>
                            <button className="w-full py-2 text-gray-500 hover:text-white transition-colors text-sm" onClick={() => { setShowAuthModal(false); setAuthStep('code'); setAuthCode(''); }}>
                                إلغاء العملية
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE EVENT MODAL */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-[#0f0f0f] border border-purple-500/30 p-6 rounded-2xl w-full max-w-2xl my-8 shadow-2xl relative">
                        <button className="absolute top-4 left-4 text-gray-500 hover:text-white" onClick={() => setShowEventModal(false)}><Plus className="rotate-45" /></button>

                        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                            <div className="p-2 bg-purple-600/20 rounded-lg"><Calendar className="text-purple-400" /></div>
                            <div>
                                <h2 className="text-xl font-bold text-white">إنشاء حدث جديد</h2>
                                <p className="text-xs text-gray-500">نشر حدث عالمي لجميع المستخدمين</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="col-span-full">
                                <label className="text-xs text-gray-400 mb-1 block font-bold">عنوان الحدث</label>
                                <input type="text" className="modal-input w-full" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="مثال: بطولة القمة - الموسم الأول" />
                            </div>

                            <div className="col-span-full">
                                <label className="text-xs text-gray-400 mb-1 block font-bold">الوصف</label>
                                <textarea className="modal-input w-full h-24 resize-none" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="تفاصيل الحدث والقصة الخلفية..." />
                            </div>

                            <div className="col-span-full">
                                <label className="text-xs text-gray-400 mb-1 block font-bold">القواعد والشروط (اختياري)</label>
                                <textarea className="modal-input w-full h-20 resize-none" value={newEvent.rules} onChange={e => setNewEvent({ ...newEvent, rules: e.target.value })} placeholder="قواعد المشاركة، الممنوعات، طريقة الفوز..." />
                            </div>

                            <div className="col-span-full">
                                <label className="text-xs text-gray-400 mb-1 block font-bold">موعد البدء</label>
                                <input type="datetime-local" className="modal-input w-full" value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} />
                            </div>
                        </div>

                        <div className="mb-6 bg-purple-900/10 p-4 rounded-xl border border-purple-500/10">
                            <label className="text-xs text-purple-400 mb-3 block font-bold flex items-center gap-2"><Trophy size={14} /> الجوائز والمكافآت</label>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <span className="text-[10px] text-yellow-500 block mb-1">المركز الأول</span>
                                    <input type="text" className="modal-input w-full text-center" placeholder="$1,000,000" value={newEvent.prize1} onChange={e => setNewEvent({ ...newEvent, prize1: e.target.value })} />
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block mb-1">المركز الثاني</span>
                                    <input type="text" className="modal-input w-full text-center" placeholder="$500,000" value={newEvent.prize2} onChange={e => setNewEvent({ ...newEvent, prize2: e.target.value })} />
                                </div>
                                <div>
                                    <span className="text-[10px] text-orange-400 block mb-1">المركز الثالث</span>
                                    <input type="text" className="modal-input w-full text-center" placeholder="$250,000" value={newEvent.prize3} onChange={e => setNewEvent({ ...newEvent, prize3: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="text-xs text-gray-400 mb-2 block font-bold flex items-center gap-2"><ImageIcon size={14} /> روابط الصور (URL)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" className="modal-input" placeholder="رابط صورة البطاقة (عريض)" value={newEvent.cardImage} onChange={e => setNewEvent({ ...newEvent, cardImage: e.target.value })} />
                                <input type="text" className="modal-input" placeholder="رابط صورة التفاصيل (اختياري)" value={newEvent.detailImage} onChange={e => setNewEvent({ ...newEvent, detailImage: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button className="px-6 py-3 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-400" onClick={() => setShowEventModal(false)}>إلغاء الأمر</button>
                            <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-600/20 transition-all text-white flex items-center gap-2" onClick={handleCreateEvent}>
                                <Radio size={16} className="animate-pulse" /> نشر الحدث الآن
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .tab-btn {
                    padding: 0.6rem 1.2rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    color: rgba(255,255,255,0.5);
                    transition: all 0.3s ease;
                    border: 1px solid transparent;
                }
                .tab-btn.active {
                    background: rgba(147, 51, 234, 0.1);
                    color: #d8b4fe;
                    font-weight: bold;
                    border-color: rgba(147, 51, 234, 0.3);
                }
                .tab-btn:hover:not(.active) {
                    background: rgba(255,255,255,0.05);
                    color: rgba(255,255,255,0.8);
                }
                .btn-icon {
                    background: rgba(147, 51, 234, 0.1);
                    color: #d8b4fe;
                    border: 1px solid rgba(147, 51, 234, 0.3);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    transition: all 0.3s;
                    font-weight: 600;
                }
                .btn-icon:hover {
                    background: rgba(147, 51, 234, 0.3);
                    color: white;
                    border-color: rgba(147, 51, 234, 0.6);
                    box-shadow: 0 0 15px rgba(147, 51, 234, 0.2);
                }
                .modal-input {
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 0.8rem;
                    color: white;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                    outline: none;
                }
                .modal-input:focus {
                    border-color: #9333ea;
                    background: rgba(0,0,0,0.6);
                    box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.2);
                }
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
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
                    .page-container { padding-bottom: 90px !important; }
                    .events-feed { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};
