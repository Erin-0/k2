import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, Terminal } from 'lucide-react';

const ChatProfile = ({ url, name, size = 32, color = 'gray' }: any) => (
    <div className="chat-profile-wrapper" style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
        <div className="status-dot" style={{ background: 'var(--success)', border: '1.5px solid var(--surface)', width: '8px', height: '8px', position: 'absolute', top: '-1px', right: '-1px', borderRadius: '50%', zIndex: 2 }}></div>
        {url ? (
            <img src={url} alt={name} style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover', border: `1px solid ${color}` }} />
        ) : (
            <div style={{
                width: '100%', height: '100%', borderRadius: '8px',
                background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.4, fontWeight: '900', color: 'white',
                border: `1px solid ${color}66`
            }}>
                {name?.charAt(0).toUpperCase()}
            </div>
        )}
    </div>
);

export const Chat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const dummyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return unsubscribe;
    }, []);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user) return;
        try {
            await addDoc(collection(db, "chats"), {
                text: input,
                createdAt: serverTimestamp(),
                uid: user.id,
                username: user.username,
                photoUrl: user.photoUrl || null,
                color: user.color
            });
            setInput('');
        } catch (error) {
            console.error("فشل_في_الإرسال", error);
        }
    };

    return (
        <div className="page-container" style={{ 
            height: 'calc(100vh - var(--header-height) - 80px)', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '0.75rem' 
        }}>
            {/* Chat Header - Compact for Mobile */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <div className="pulse-indicator" style={{ background: 'var(--danger)', width: '6px', height: '6px' }}></div>
                        <p className="micro-label" style={{ color: 'var(--danger)', fontSize: '0.55rem', letterSpacing: '1px' }}>تردد_الاتصال_المباشر_142.8</p>
                    </div>
                    <h1 className="text-gradient" style={{ fontSize: '1.4rem', margin: 0 }}>مركز الاتصالات</h1>
                </div>
                <div className="card" style={{ padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Hash size={12} color="var(--primary)" />
                        <span className="micro-label" style={{ fontSize: '0.6rem' }}>البث_العام</span>
                    </div>
                </div>
            </div>

            {/* Chat Messages Area */}
            <div className="card card-glow" style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                padding: 0, 
                overflow: 'hidden', 
                border: '1px solid var(--border-bright)', 
                background: 'rgba(5, 6, 12, 0.8)',
                borderRadius: '20px'
            }}>
                <div className="scanline" style={{ opacity: 0.05 }}></div>

                <div className="custom-scrollbar" style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '1rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1rem' 
                }}>
                    <div style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-dim)', marginBottom: '0.5rem' }}>
                        <p className="micro-label" style={{ opacity: 0.3, letterSpacing: '1px', fontSize: '0.55rem' }}>-- بداية_السجل_المشفر --</p>
                    </div>

                    {messages.map((msg, idx) => {
                        const isMe = msg.uid === user?.id;
                        const prevMsg = messages[idx - 1];
                        const showProfile = !prevMsg || prevMsg.uid !== msg.uid;

                        return (
                            <div key={msg.id} style={{
                                display: 'flex',
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                gap: '0.6rem',
                                marginTop: showProfile ? '0.4rem' : '-0.6rem'
                            }}>
                                {!isMe && showProfile && <ChatProfile url={msg.photoUrl} name={msg.username} size={32} color={msg.color} />}
                                {!isMe && !showProfile && <div style={{ width: '32px' }}></div>}

                                <div style={{ maxWidth: '85%' }}>
                                    {showProfile && !isMe && (
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem', marginLeft: '0.4rem' }}>
                                            <span className="mono" style={{ color: msg.color, fontSize: '0.7rem', fontWeight: '900' }}>{msg.username}</span>
                                            <span className="micro-label" style={{ fontSize: '0.5rem', opacity: 0.3 }}>ID_{msg.uid.substring(0, 4)}</span>
                                        </div>
                                    )}
                                    <div style={{
                                        background: isMe ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                        color: 'white',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '16px',
                                        borderBottomRightRadius: isMe ? 0 : '16px',
                                        borderBottomLeftRadius: !isMe ? 0 : '16px',
                                        border: `1px solid ${isMe ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                        position: 'relative'
                                    }}>
                                        <div style={{ fontSize: '0.85rem', lineHeight: '1.4', opacity: 0.95, wordBreak: 'break-word' }}>
                                            {msg.text}
                                        </div>
                                        <div style={{
                                            textAlign: isMe ? 'right' : 'left',
                                            opacity: 0.3,
                                            fontSize: '0.55rem',
                                            marginTop: '0.3rem',
                                            fontFamily: 'JetBrains Mono'
                                        }}>
                                            {msg.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                {isMe && showProfile && <ChatProfile url={msg.photoUrl} name={msg.username} size={32} color={msg.color} />}
                                {isMe && !showProfile && <div style={{ width: '32px' }}></div>}
                            </div>
                        );
                    })}
                    <div ref={dummyRef}></div>
                </div>

                {/* Input Form - Mobile Friendly */}
                <form onSubmit={sendMessage} style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(10, 11, 20, 0.95)',
                    borderTop: '1px solid var(--border-bright)',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center'
                }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.5 }}>
                        <Terminal size={18} />
                    </div>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="إدخال_رسالة_تشفير_الارتباط..."
                        className="mono"
                        style={{
                            flex: 1,
                            fontSize: '0.85rem',
                            background: 'transparent',
                            border: 'none',
                            padding: '0.4rem 0',
                            color: 'var(--text-main)',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        style={{ 
                            padding: '0.6rem', 
                            borderRadius: '12px', 
                            background: input.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                            border: 'none',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: '0.2s'
                        }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>

            <style>{`
                .chat-profile-wrapper { position: relative; }
                .pulse-indicator { width: 8px; height: 8px; border-radius: 50%; position: relative; }
                .pulse-indicator::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid currentColor; animation: ripple 2s infinite; }
                @keyframes ripple { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                @media (max-width: 768px) {
                    .page-container { height: calc(100vh - var(--header-height) - 100px) !important; }
                }
            `}</style>
        </div>
    );
};