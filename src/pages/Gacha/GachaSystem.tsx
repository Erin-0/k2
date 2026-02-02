import React, { useState, useEffect, useRef } from 'react';
import Groq from 'groq-sdk';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import {
    collection, doc, getDoc, getDocs, updateDoc, setDoc,
    query, orderBy, limit, onSnapshot, serverTimestamp,
    increment, arrayUnion, arrayRemove, Timestamp, runTransaction
} from 'firebase/firestore';
import {
    Shield, Zap, MessageSquare, TrendingUp,
    Clock, Lock, Unlock, ArrowLeft, Target,
    Ghost, Search, X, Send, Terminal
} from 'lucide-react';
import agentsData from '../../data/agents.json';
import { formatNeuralCurrency } from '../../utils/formatters';

// Types
interface Agent {
    id: string;
    name: string;
    title: string;
    rarity: string;
    rarityName: string;
    basePrice: number;
    dailyYield: number;
    attack: number;
    defense: number;
    image: string;
    desc: string;
    personality: string;
    color: string;
}

interface AgentState {
    ownerId: string | null;
    ownerName: string | null;
    currentPrice: number;
    transfers: number;
    lastPurchasedAt: Timestamp | null;
    contractDays: number;
}

interface ChatMessage {
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

const GROQ_API_KEY = "REPLACE_WITH_YOUR_KEY_HERE"; // 

export const GachaSystem = () => {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'home' | 'details' | 'inventory' | 'chat'>('home');
    const [agents] = useState<Agent[]>(agentsData);
    const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Modal / Alert State
    const [alert, setAlert] = useState<{ show: boolean, title: string, msg: string, onConfirm?: () => void, type: 'confirm' | 'alert' }>({
        show: false, title: '', msg: '', type: 'alert'
    });

    // Init Data Sync
    useEffect(() => {
        // 1. Listen for Agent States
        const unsubAgents = onSnapshot(collection(db, 'agents_state'), (snap) => {
            const states: Record<string, AgentState> = {};
            snap.docs.forEach(doc => {
                states[doc.id] = doc.data() as AgentState;
            });
            setAgentStates(states);
            setLoading(false);
        });

        // 2. Fetch Top Users
        const fetchTopUsers = async () => {
            const q = query(collection(db, 'users'), orderBy('balance', 'desc'), limit(3));
            const snap = await getDocs(q);
            setTopUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchTopUsers();

        return () => unsubAgents();
    }, []);

    // Scroll Chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const showAlert = (title: string, msg: string, onConfirm?: () => void, type: 'confirm' | 'alert' = 'alert') => {
        setAlert({ show: true, title, msg, onConfirm, type });
    };

    const closeAlert = () => setAlert(prev => ({ ...prev, show: false }));

    const handlePurchase = async (agent: Agent) => {
        if (!user) return;
        const state = agentStates[agent.id];
        const price = state?.currentPrice || agent.basePrice;

        if (user.balance < price) {
            showAlert("فشل الاستحواذ", "رصيدك غير كافٍ لإتمام عملية الارتباط العصبي.");
            return;
        }

        showAlert("تأكيد الاستحواذ", `هل أنت متأكد من دفع ${formatNeuralCurrency(price)}$ مقابل الوكيل ${agent.name}؟`, async () => {
            try {
                const userRef = doc(db, 'users', user.id);
                const agentStateRef = doc(db, 'agents_state', agent.id);

                // Update User
                await updateDoc(userRef, {
                    balance: increment(-price),
                    ownedAgents: arrayUnion({
                        id: agent.id,
                        purchasedAt: serverTimestamp(),
                        contractDays: 3
                    })
                });

                // Update Agent State
                await setDoc(agentStateRef, {
                    ownerId: user.id,
                    ownerName: user.username,
                    currentPrice: price,
                    transfers: increment(1),
                    lastPurchasedAt: serverTimestamp(),
                    contractDays: 3
                }, { merge: true });

                showAlert("اكتمل الارتباط", `تمت مزامنة الوكيل ${agent.name} مع المركز العصبي الخاص بك بنجاح.`, undefined, 'alert');
                refreshUser();
            } catch (e) {
                console.error(e);
                showAlert("خطأ تقني", "فشلت عملية المزامنة. حاول مرة أخرى.");
            }
        }, 'confirm');
    };

    const handleSteal = async (agent: Agent) => {
        if (!user) return;
        const state = agentStates[agent.id];
        if (!state || !state.ownerId) return;

        const stealCost = state.currentPrice * 2;

        if (user.balance < stealCost) {
            showAlert("فشل الاختطاف", "التكلفة تبلغ ضعف القيمة الحالية. رصيدك غير كافٍ.");
            return;
        }

        showAlert("تحذير اختطاف", `سرقة ${agent.name} من ${state.ownerName} ستكلفك ${formatNeuralCurrency(stealCost)}$. هل تريد المتابعة؟`, async () => {
            try {
                await runTransaction(db, async (transaction) => {
                    const userRef = doc(db, 'users', user.id);
                    const agentStateRef = doc(db, 'agents_state', agent.id);

                    // 1. Reads
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) throw "User not found";
                    const userData = userDoc.data();

                    const agentStateDoc = await transaction.get(agentStateRef);
                    const currentAgentState = agentStateDoc.data() as AgentState;

                    if (!currentAgentState || !currentAgentState.ownerId) throw "Agent not owned";
                    const victimId = currentAgentState.ownerId;
                    const victimRef = doc(db, 'users', victimId);
                    const victimDoc = await transaction.get(victimRef);

                    // 2. Checks
                    if (userData.balance < stealCost) throw "Insufficient funds";

                    // 3. Writes
                    // Update Thief
                    transaction.update(userRef, {
                        balance: increment(-stealCost),
                        ownedAgents: arrayUnion({
                            id: agent.id,
                            purchasedAt: serverTimestamp(),
                            contractDays: 3
                        })
                    });

                    // Update Victim
                    if (victimDoc.exists()) {
                        const vData = victimDoc.data();
                        // Robust removal: Handle if victim has multiple (unlikely but safe)
                        const vAgents = vData.ownedAgents || [];
                        const updatedVAgents = vAgents.filter((a: any) => a.id !== agent.id);
                        transaction.update(victimRef, {
                            balance: increment(currentAgentState.currentPrice * 0.5),
                            ownedAgents: updatedVAgents
                        });
                    }

                    // Update Agent
                    transaction.update(agentStateRef, {
                        ownerId: user.id,
                        ownerName: user.username,
                        currentPrice: stealCost,
                        transfers: increment(1),
                        lastPurchasedAt: serverTimestamp(),
                        contractDays: 3
                    });
                });

                showAlert("تم الاختطاف", "تم نقل السيطرة العصبية للوكيل إليك بنجاح.", undefined, 'alert');
                refreshUser();
            } catch (e) {
                console.error(e);
                showAlert("خطأ تقني", typeof e === 'string' ? e : "فشلت عملية الاختطاف.");
            }
        }, 'confirm');
    };

    const handleRenew = async (agent: Agent) => {
        if (!user) return;
        const price = agentStates[agent.id]?.currentPrice || agent.basePrice;
        const renewCost = Math.floor(price * 0.6);

        if (user.balance < renewCost) {
            showAlert("رصيد غير كافٍ", "تحتاج لـ 60% من القيمة الاسمية لتجديد العقد.");
            return;
        }

        showAlert("تجديد العقد", `تكلفة التجديد لـ 3 أيام إضافية هي ${formatNeuralCurrency(renewCost)}$.`, async () => {
            try {
                await runTransaction(db, async (transaction) => {
                    const userRef = doc(db, 'users', user.id);
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) throw "User not found";

                    const userData = userDoc.data();
                    if (userData.balance < renewCost) throw "Insufficient funds";

                    const updatedAgents = (userData.ownedAgents || []).map((a: any) => {
                        if (a.id === agent.id) return { ...a, contractDays: (a.contractDays || 3) + 3 };
                        return a;
                    });

                    transaction.update(userRef, {
                        balance: increment(-renewCost),
                        ownedAgents: updatedAgents
                    });
                });

                showAlert("تم التجديد", "تم تمديد فترة الولاء للوكيل.", undefined, 'alert');
                refreshUser();

            } catch (e) {
                console.error(e);
                showAlert("خطأ", "فشل تجديد العقد.");
            }
        }, 'confirm');
    };

    const handleAbandon = async (agent: Agent) => {
        if (!user) return;
        const price = agentStates[agent.id]?.currentPrice || agent.basePrice;
        const refund = Math.floor(price * 0.5);

        showAlert("تأكيد التخلي", `التخلي عن الوكيل يعيد لك نصف قيمته (${formatNeuralCurrency(refund)}$). هل أنت متأكد؟`, async () => {
            try {
                const userRef = doc(db, 'users', user.id);
                const agentStateRef = doc(db, 'agents_state', agent.id);

                const updatedAgents = user.ownedAgents?.filter(a => a.id !== agent.id);

                await updateDoc(userRef, {
                    balance: increment(refund),
                    ownedAgents: updatedAgents
                });

                await updateDoc(agentStateRef, {
                    ownerId: null,
                    ownerName: null,
                    lastPurchasedAt: null
                });

                showAlert("تم التخلي", "تمت إزالة الوكيل من مواردك العصبية.", undefined, 'alert');
                setActiveTab('home');
                refreshUser();
            } catch (e) {
                showAlert("خطأ", "فشلت العملية.");
            }
        }, 'confirm');
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !selectedAgentId) return;

        const selectedAgent = agents.find(a => a.id === selectedAgentId);
        if (!selectedAgent) return;

        const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: new Date() };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsTyping(true);

        try {
            const client = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

            const completion = await client.chat.completions.create({
                model: "openai/gpt-oss-120b", // Custom model as requested
                messages: [
                    {
                        role: "system",
                        content: `You are ${selectedAgent.name}, also known as ${selectedAgent.title}. 
                        Your personality: ${selectedAgent.personality}.
                        Your background: ${selectedAgent.desc}.
                        Respond to the user as this character. Keep responses concise and immersive.`
                    },
                    {
                        role: "user",
                        content: userMsg.content
                    }
                ],
                temperature: 1,
                max_tokens: 8192,
                top_p: 1,
                stream: true,
                stop: null
            });

            let fullResponse = "";
            const botMsg: ChatMessage = { role: 'agent', content: '', timestamp: new Date() };
            setChatMessages(prev => [...prev, botMsg]);

            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content || "";
                fullResponse += content;
                setChatMessages(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].content = fullResponse;
                    return newHistory;
                });
            }
        } catch (e) {
            console.error("AI Error:", e);
            setChatMessages(prev => [...prev, {
                role: 'agent',
                content: "*خطأ في الاتصال العصبي... إعادة التوجيه*",
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const getContractStatus = (agentId: string) => {
        const owned = user?.ownedAgents?.find(a => a.id === agentId);
        if (!owned) return null;

        const purchasedAt = owned.purchasedAt instanceof Timestamp ? owned.purchasedAt.toDate() : (owned.purchasedAt || new Date());
        const days = owned.contractDays || 3;
        const expiry = new Date(purchasedAt.getTime() + (days * 86400000));
        const remainingMs = expiry.getTime() - Date.now();
        const remainingHours = Math.floor(remainingMs / 3600000);

        return {
            expired: remainingMs < 0,
            urgent: remainingHours < 24 && remainingHours > 0,
            text: remainingMs < 0 ? "عقد منتهي" : `متبقي ${Math.floor(remainingHours / 24)} يوم و ${remainingHours % 24} ساعة`
        };
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="neural-loader"></div>
        </div>
    );

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="gacha-system fade-in">
            {/* TOP NAVIGATION (VALORANT STYLE) */}
            <nav className="gacha-nav">
                <div className="nav-container">
                    <div className="nav-links">
                        <button className={`nav-link ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>رادار الشبكة</button>
                        <button className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>محفظة الأصول</button>
                    </div>
                    <div className="nav-logo">
                        <Target size={24} className="text-red-500" />
                        <span className="mono">GACHA_PROTOCOL_88</span>
                    </div>
                    <div className="nav-currency">
                        <span className="micro-label">رصيد_الجمجمة</span>
                        <span className="balance mono">${formatNeuralCurrency(user?.balance || 0)}</span>
                    </div>
                </div>
            </nav>

            {/* HOME VIEW */}
            {activeTab === 'home' && (
                <div className="gacha-home pt-8">
                    {/* TOP 3 WEALTHY */}
                    <section className="top-operatives mb-12">
                        <div className="section-header">
                            <Terminal size={18} className="text-red-500" />
                            <h2 className="section-title">منصة_الأباطرة_S3</h2>
                        </div>
                        <div className="top-grid">
                            {topUsers.map((u, i) => (
                                <div key={u.id} className={`top-card rank-${i + 1}`}>
                                    <div className="rank-indicator">{i + 1}</div>
                                    <div className="agent-glow"></div>
                                    <div className="user-info">
                                        <div className="avatar-box">
                                            <img src={u.photoUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.username}`} alt="" />
                                        </div>
                                        <div className="meta">
                                            <h3 className="username mono">{u.username}</h3>
                                            <p className="wealth mono text-gradient">${formatNeuralCurrency(u.balance || 0)}</p>
                                        </div>
                                    </div>
                                    <div className="card-stats">
                                        <div className="stat">
                                            <span className="label">أصول</span>
                                            <span className="val">{u.ownedAgents?.length || 0}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="label">شركات</span>
                                            <span className="val">{u.ownedCompanies?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* AGENT FEED */}
                    <section className="agent-feed">
                        <div className="section-header">
                            <Search size={18} className="text-red-500" />
                            <h2 className="section-title">تغذية_الوكلاء_المتصلة</h2>
                        </div>
                        <div className="agent-grid">
                            {agents.map(agent => {
                                const state = agentStates[agent.id];
                                const isOwned = !!state?.ownerId;
                                return (
                                    <div key={agent.id} className={`agent-card rarity-${agent.rarity}`} onClick={() => {
                                        setSelectedAgentId(agent.id);
                                        setActiveTab('details');
                                    }}>
                                        <div className="card-header">
                                            <span className="rarity-label">{agent.rarityName}</span>
                                            {isOwned ? (
                                                <span className="owner-badge mini"><Lock size={10} /> {state.ownerName}</span>
                                            ) : (
                                                <span className="owner-badge mini open"><Unlock size={10} /> متاح</span>
                                            )}
                                        </div>
                                        <div className="agent-name-plate">
                                            <h3 className="name">{agent.name}</h3>
                                            <p className="title">{agent.title}</p>
                                        </div>
                                        <div className="card-footer">
                                            <div className="price-box">
                                                <span className="label">القيمة</span>
                                                <span className="price mono">${formatNeuralCurrency(state?.currentPrice || agent.basePrice)}</span>
                                            </div>
                                            <Zap size={20} className="flash-icon" />
                                        </div>
                                        <div className="border-glow" style={{ backgroundColor: agent.color }}></div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}

            {/* DETAILS VIEW */}
            {activeTab === 'details' && selectedAgent && (
                <div className="agent-details-view pt-8 pb-12">
                    <button className="back-btn" onClick={() => setActiveTab('home')}>
                        <ArrowLeft size={18} /> العودة للرادار
                    </button>

                    <div className="details-layout">
                        {/* LEFT: VISUAL */}
                        <div className="visual-column">
                            <div className="agent-poster">
                                <img src={selectedAgent.image} alt={selectedAgent.name} />
                                <div className="poster-overlay"></div>
                                <div className="rarity-tag" style={{ background: selectedAgent.color }}>{selectedAgent.rarityName}</div>
                            </div>
                            <div className="tech-specs">
                                <div className="spec-stat">
                                    <Target className="text-red-500" size={16} />
                                    <div className="bar-container">
                                        <span className="label">هجوم عصبـي</span>
                                        <div className="bar"><div className="fill" style={{ width: `${selectedAgent.attack}%`, backgroundColor: selectedAgent.color }}></div></div>
                                    </div>
                                    <span className="val mono">{selectedAgent.attack}</span>
                                </div>
                                <div className="spec-stat">
                                    <Shield className="text-blue-500" size={16} />
                                    <div className="bar-container">
                                        <span className="label">درع تشفيـر</span>
                                        <div className="bar"><div className="fill" style={{ width: `${selectedAgent.defense}%`, backgroundColor: selectedAgent.color }}></div></div>
                                    </div>
                                    <span className="val mono">{selectedAgent.defense}</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: INTEL */}
                        <div className="intel-column">
                            <header className="intel-header">
                                <h1 className="agent-name">{selectedAgent.name}</h1>
                                <p className="agent-title">{selectedAgent.title}</p>
                            </header>

                            <div className="intel-block bio">
                                <h4 className="label"><Ghost size={14} /> الملف الاستخباراتي</h4>
                                <p className="desc">{selectedAgent.desc}</p>
                            </div>

                            <div className="intel-prices grid grid-cols-2 gap-4">
                                <div className="price-card">
                                    <span className="label">السعر الحالي</span>
                                    <span className="value mono text-gradient">${formatNeuralCurrency(agentStates[selectedAgent.id]?.currentPrice || selectedAgent.basePrice)}</span>
                                </div>
                                <div className="price-card">
                                    <span className="label">الربح اليومي</span>
                                    <span className="value mono text-green-400">+${formatNeuralCurrency(selectedAgent.dailyYield)}</span>
                                </div>
                            </div>

                            <div className="ownership-intel">
                                <div className="info-row">
                                    <span className="label">المالك الحالي:</span>
                                    <span className="val mono">{agentStates[selectedAgent.id]?.ownerName || "النظام السيادي"}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">عدد التحويلات:</span>
                                    <span className="val mono">{agentStates[selectedAgent.id]?.transfers || 0}</span>
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="action-hub mt-8">
                                {(!agentStates[selectedAgent.id]?.ownerId) ? (
                                    <button className="btn-primary v-clip" onClick={() => handlePurchase(selectedAgent)}>
                                        <Unlock size={18} /> بدء بروتوكول الاستحواذ
                                    </button>
                                ) : agentStates[selectedAgent.id]?.ownerId === user?.id ? (
                                    <div className="owner-actions">
                                        <div className="contract-box">
                                            <Clock size={16} />
                                            <span className="mono">{getContractStatus(selectedAgent.id)?.text}</span>
                                        </div>
                                        <div className="action-grid">
                                            <button className="btn-action v-clip" onClick={() => handleRenew(selectedAgent)}>
                                                <TrendingUp size={16} /> تجديد العقد
                                            </button>
                                            <button className="btn-action chat v-clip" onClick={() => {
                                                setActiveTab('chat');
                                                if (chatMessages.length === 0) {
                                                    setChatMessages([{
                                                        role: 'agent',
                                                        content: `الاتصال مؤمن. أنا ${selectedAgent.name}. كيف يمكنني خدمتك في الميدان اليوم؟`,
                                                        timestamp: new Date()
                                                    }]);
                                                }
                                            }}>
                                                <MessageSquare size={16} /> ارتباط عصبي
                                            </button>
                                            <button className="btn-action danger v-clip" onClick={() => handleAbandon(selectedAgent)}>
                                                <X size={16} /> إنهاء الخدمة
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="btn-steal v-clip pulse-red" onClick={() => handleSteal(selectedAgent)}>
                                        <Target size={18} /> اختطاف الوكيل (${formatNeuralCurrency((agentStates[selectedAgent.id]?.currentPrice || selectedAgent.basePrice) * 2)})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAT VIEW */}
            {activeTab === 'chat' && selectedAgent && (
                <div className="chat-interface-view pt-8">
                    <div className="chat-container">
                        <header className="chat-header">
                            <div className="agent-meta">
                                <div className="indicator active"></div>
                                <img src={selectedAgent.image} alt="" />
                                <div className="text">
                                    <h3 className="mono">{selectedAgent.name}</h3>
                                    <span className="micro-label">ENCRYPTED_LINE_ACTIVE</span>
                                </div>
                            </div>
                            <button className="close-chat" onClick={() => setActiveTab('details')}><X size={20} /></button>
                        </header>
                        <div className="chat-body no-scrollbar">
                            {chatMessages.map((m, i) => (
                                <div key={i} className={`msg-bubble ${m.role}`}>
                                    <p className="content">{m.content}</p>
                                    <span className="time mono">{m.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))}
                            {isTyping && <div className="typing-indicator">جاري التحليل...</div>}
                            <div ref={chatEndRef} />
                        </div>
                        <footer className="chat-footer">
                            <input
                                type="text"
                                placeholder="اكتب رسالتك للمركز العصبي..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                className="mono"
                            />
                            <button className="send-btn" onClick={handleSendMessage} disabled={!chatInput.trim()}>
                                <Send size={18} />
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* INVENTORY VIEW */}
            {activeTab === 'inventory' && (
                <div className="gacha-inventory pt-8 pb-12">
                    <div className="section-header">
                        <Terminal size={18} className="text-yellow-500" />
                        <h2 className="section-title">جرد_الأصول_العصبية</h2>
                    </div>
                    {(!user?.ownedAgents || user.ownedAgents.length === 0) ? (
                        <div className="empty-state">
                            <Ghost size={64} className="opacity-20 mb-4" />
                            <h3 className="mono">لا توجد أصول نشطة</h3>
                            <p className="text-muted">قم بزيارة الرادار للاستحواذ على وكلاء جدد.</p>
                            <button className="btn-primary mt-6 v-clip" onClick={() => setActiveTab('home')}>الذهاب للرادار</button>
                        </div>
                    ) : (
                        <div className="agent-grid">
                            {user.ownedAgents.map(owned => {
                                const agent = agents.find(a => a.id === owned.id);
                                if (!agent) return null;
                                const status = getContractStatus(agent.id);
                                return (
                                    <div key={agent.id} className={`agent-card owned rarity-${agent.rarity} ${status?.urgent ? 'urgent' : ''}`} onClick={() => {
                                        setSelectedAgentId(agent.id);
                                        setActiveTab('details');
                                    }}>
                                        <div className="card-header">
                                            <span className="rarity-label">{agent.rarityName}</span>
                                            <div className="status-pill mono">
                                                {status?.urgent && <div className="pulse-dot"></div>}
                                                {status?.text}
                                            </div>
                                        </div>
                                        <div className="agent-pic">
                                            <img src={agent.image} alt="" />
                                        </div>
                                        <div className="agent-name-plate">
                                            <h3 className="name">{agent.name}</h3>
                                            <div className="yield mono">+${formatNeuralCurrency(agent.dailyYield)}/يوم</div>
                                        </div>
                                        <div className="border-glow" style={{ backgroundColor: agent.color }}></div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* CUSTOM ALERT MODAL */}
            {alert.show && (
                <div className="gacha-modal-overlay" onClick={closeAlert}>
                    <div className="gacha-modal v-clip" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <Shield className="text-red-500" size={20} />
                            <h3 className="mono">{alert.title}</h3>
                        </div>
                        <div className="modal-body">
                            <p>{alert.msg}</p>
                        </div>
                        <div className="modal-footer">
                            {alert.type === 'confirm' ? (
                                <>
                                    <button className="btn-confirm v-clip" onClick={() => { alert.onConfirm?.(); closeAlert(); }}>تأكيد التنفيذ</button>
                                    <button className="btn-cancel v-clip" onClick={closeAlert}>إلغاء</button>
                                </>
                            ) : (
                                <button className="btn-confirm v-clip" onClick={closeAlert}>فهمت</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* STYLES (VALORANT / CYBERPUNK MIX) */}
            <style>{`
            .gacha-system {
                --valorant-red: #ff4655;
                --valorant-dark: #0f1923;
                --valorant-gray: #1f2731;
                --valorant-border: rgba(255, 255, 255, 0.1);
                --bg-pattern: radial-gradient(circle at 50% 50%, rgba(255, 70, 85, 0.05) 0%, transparent 80%);
                color: #ece8e1;
                min-height: 100vh;
                font-family: 'Cairo', sans-serif;
            }

            .v-clip {
                clip-path: polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%);
            }

            .gacha-nav {
                background: rgba(15, 25, 35, 0.95);
                border-bottom: 1px solid var(--valorant-border);
                position: sticky;
                top: 0;
                z-index: 100;
                backdrop-filter: blur(10px);
            }

            .nav-container {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 1.5rem;
                height: 70px;
            }

            .nav-links { display: flex; gap: 1.5rem; }
            .nav-link {
                color: #888;
                font-size: 0.9rem;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                transition: 0.3s;
                position: relative;
                padding: 0.5rem 0;
            }
            .nav-link:hover, .nav-link.active { color: #fff; }
            .nav-link.active::after {
                content: '';
                position: absolute;
                bottom: -24px;
                left: 0;
                width: 100%;
                height: 3px;
                background: var(--valorant-red);
                box-shadow: 0 0 10px var(--valorant-red);
            }

            .nav-logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 900; letter-spacing: 2px; }
            .nav-currency { 
                display: flex; 
                flex-direction: column; 
                align-items: flex-end;
                background: rgba(255,255,255,0.03);
                padding: 0.4rem 1rem;
                border-radius: 8px;
                border: 1px solid var(--valorant-border);
            }
            .nav-currency .balance { color: #ffd700; font-size: 1.1rem; font-weight: 900; }

            /* HOME */
            .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; }
            .section-title { font-size: 1.5rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }

            .top-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
            @media (min-width: 768px) { .top-grid { grid-template-columns: repeat(3, 1fr); } }

            .top-card {
                background: var(--valorant-gray);
                border: 1px solid var(--valorant-border);
                padding: 1.5rem;
                position: relative;
                overflow: hidden;
                transition: 0.4s;
            }
            .top-card:hover { border-color: var(--valorant-red); transform: translateY(-5px); }
            .rank-indicator {
                position: absolute;
                top: 0;
                left: 0;
                background: var(--valorant-red);
                color: white;
                font-weight: 900;
                padding: 0.2rem 0.6rem;
                font-size: 1.2rem;
                z-index: 2;
                clip-path: polygon(0 0, 100% 0, 70% 100%, 0 100%);
            }
            .agent-glow {
                position: absolute;
                top: -50%;
                right: -30%;
                width: 200px;
                height: 200px;
                background: var(--valorant-red);
                filter: blur(80px);
                opacity: 0.1;
                pointer-events: none;
            }
            .user-info { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; position: relative; z-index: 1; }
            .avatar-box { width: 60px; height: 60px; border: 2px solid var(--valorant-red); padding: 2px; }
            .avatar-box img { width: 100%; height: 100%; object-fit: cover; }
            .username { font-size: 1.1rem; font-weight: 800; }
            .wealth { font-size: 1.3rem; font-weight: 900; }

            .card-stats { display: flex; gap: 1.5rem; }
            .stat { display: flex; flex-direction: column; }
            .stat .label { font-size: 0.6rem; opacity: 0.5; text-transform: uppercase; }
            .stat .val { font-weight: 700; font-size: 0.9rem; }

            /* AGENT FEED */
            .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem; }
            .agent-card {
                background: #111;
                border: 1px solid var(--valorant-border);
                padding: 1.25rem;
                position: relative;
                cursor: pointer;
                transition: 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
                overflow: hidden;
            }
            .agent-card:hover { transform: scale(1.05) rotate(1deg); z-index: 10; border-color: #fff; }
            .agent-card.owned.urgent { border-color: #ef4444; animation: pulse-border 2s infinite; }
            @keyframes pulse-border { 0%, 100% { border-color: #ef4444; } 50% { border-color: transparent; } }

            .rarity-label { 
                font-size: 0.6rem; 
                font-weight: 900; 
                text-transform: uppercase; 
                background: rgba(255,255,255,0.1); 
                padding: 2px 6px; 
                border-radius: 4px;
            }
            .rarity-legendary .rarity-label { color: #f59e0b; background: rgba(245, 158, 11, 0.2); }
            .rarity-epic .rarity-label { color: #a855f7; background: rgba(168, 85, 247, 0.2); }
            .rarity-rare .rarity-label { color: #3b82f6; background: rgba(59, 130, 246, 0.2); }

            .owner-badge { 
                float: right; 
                display: flex; 
                align-items: center; 
                gap: 4px; 
                font-size: 0.65rem; 
                opacity: 0.6; 
                font-weight: 700;
            }
            .owner-badge.open { color: #10b981; opacity: 1; }

            .agent-name-plate { margin-top: 2rem; margin-bottom: 2rem; }
            .agent-name-plate .name { font-size: 2rem; font-weight: 900; line-height: 1; letter-spacing: -1px; margin-bottom: 4px; }
            .agent-name-plate .title { font-size: 0.75rem; opacity: 0.5; font-weight: 700; text-transform: uppercase; }

            .card-footer { display: flex; justify-content: space-between; align-items: flex-end; }
            .price-box { display: flex; flex-direction: column; }
            .price-box .label { font-size: 0.6rem; opacity: 0.5; }
            .price-box .price { font-size: 1.1rem; font-weight: 900; color: var(--valorant-red); }

            .border-glow {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 4px;
                opacity: 0.3;
            }

            /* DETAILS */
            .details-layout { 
                display: grid; 
                grid-template-columns: 1fr; 
                gap: 3rem; 
                margin-top: 2rem; 
            }
            @media (min-width: 1024px) { .details-layout { grid-template-columns: 400px 1fr; } }

            .visual-column { position: sticky; top: 100px; }
            .agent-poster {
                aspect-ratio: 4/5;
                background: #000;
                position: relative;
                border: 1px solid var(--valorant-border);
                overflow: hidden;
            }
            .agent-poster img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(0.5); }
            .poster-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(0deg, rgba(15, 25, 35, 1) 10%, transparent 50%);
            }
            .rarity-tag {
                position: absolute;
                top: 20px;
                right: -40px;
                transform: rotate(45deg);
                width: 150px;
                text-align: center;
                padding: 4px 0;
                font-weight: 900;
                font-size: 0.8rem;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
            }

            .tech-specs { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
            .spec-stat { display: flex; align-items: center; gap: 1rem; }
            .spec-stat .bar-container { flex: 1; }
            .spec-stat .label { font-size: 0.6rem; opacity: 0.5; display: block; margin-bottom: 2px; }
            .spec-stat .bar { height: 4px; background: rgba(255,255,255,0.05); }
            .spec-stat .fill { height: 100%; box-shadow: 0 0 10px currentColor; }
            .spec-stat .val { font-size: 0.9rem; font-weight: 900; min-width: 25px; }

            .intel-column { padding: 1rem; }
            .agent-name { font-size: 4.5rem; font-weight: 950; letter-spacing: -4px; line-height: 0.9; margin-bottom: 0.5rem; color: #fff; }
            .agent-title { font-size: 1.2rem; font-weight: 700; color: var(--valorant-red); letter-spacing: 2px; text-transform: uppercase; }

            .intel-block { margin-top: 2.5rem; border-left: 2px solid var(--valorant-red); padding-left: 1.5rem; }
            .intel-block .label { font-size: 0.75rem; font-weight: 900; opacity: 0.4; letter-spacing: 1px; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
            .intel-block .desc { font-size: 1.1rem; line-height: 1.6; color: #ccc; }

            .price-card { background: rgba(255,255,255,0.02); padding: 1.5rem; border: 1px solid var(--valorant-border); }
            .price-card .label { font-size: 0.7rem; opacity: 0.5; display: block; }
            .price-card .value { font-size: 1.8rem; font-weight: 900; }

            .ownership-intel { margin-top: 2rem; border-top: 1px dashed var(--valorant-border); pt-4; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
            .info-row .label { opacity: 0.5; font-size: 0.9rem; }
            .info-row .val { color: #ffd700; font-weight: 700; }

            .btn-primary, .btn-steal {
                width: 100%;
                padding: 1.25rem;
                font-weight: 900;
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                transition: 0.3s;
            }
            .btn-primary { background: var(--valorant-red); color: #fff; }
            .btn-steal { background: transparent; border: 2px solid var(--valorant-red); color: var(--valorant-red); }
            .pulse-red { animation: pulse-red-glow 2s infinite; }
            @keyframes pulse-red-glow {
                0%, 100% { box-shadow: 0 0 0px var(--valorant-red); }
                50% { box-shadow: 0 0 20px var(--valorant-red); }
            }

            .owner-actions { background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px; }
            .contract-box { 
                display: flex; align-items: center; gap: 0.75rem; 
                background: #ff465522; color: #ff4655; padding: 0.75rem; 
                border-radius: 8px; font-weight: 700; margin-bottom: 1.5rem;
            }
            .action-grid { display: flex; flex-direction: column; gap: 0.75rem; }
            .btn-action {
                padding: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                background: var(--valorant-gray); border: 1px solid var(--valorant-border); color: #fff;
            }
            .btn-action:hover { border-color: #fff; }
            .btn-action.chat { background: #3b82f622; color: #3b82f6; border-color: #3b82f644; }
            .btn-action.danger { background: #ef444411; color: #ef4444; border-color: #ef444433; }

            /* CHAT INTERFACE */
            .chat-container {
                max-width: 800px;
                margin: 0 auto;
                height: 70vh;
                background: #0f1923;
                border: 1px solid var(--valorant-border);
                display: flex;
                flex-direction: column;
                clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%);
            }
            .chat-header {
                padding: 1rem 1.5rem;
                background: #1f2731;
                border-bottom: 1px solid var(--valorant-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .agent-meta { display: flex; align-items: center; gap: 1rem; }
            .agent-meta img { width: 40px; height: 40px; border-radius: 8px; border: 1px solid var(--valorant-red); }
            .indicator.active { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; }

            .chat-body { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
            .msg-bubble { max-width: 80%; padding: 1rem 1.5rem; position: relative; }
            .msg-bubble.agent { 
                align-self: flex-start; 
                background: #1f2731; 
                border-left: 2px solid var(--valorant-red);
                clip-path: polygon(0 0, 100% 0, 100% 100%, 15px 100%, 0 calc(100% - 15px));
            }
            .msg-bubble.user { 
                align-self: flex-end; 
                background: var(--valorant-red); 
                color: #fff;
                clip-path: polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
            }
            .time { font-size: 0.6rem; opacity: 0.4; margin-top: 5px; display: block; }

            .chat-footer { padding: 1.5rem; background: #0a0f14; display: flex; gap: 1rem; }
            .chat-footer input { 
                flex: 1; background: #1f2731; border: 1px solid var(--valorant-border); 
                padding: 1rem; color: #fff; outline: none; 
            }
            .chat-footer input:focus { border-color: var(--valorant-red); }
            .send-btn { background: var(--valorant-red); padding: 0 1.5rem; font-weight: 900; }

            /* INVENTORY */
            .empty-state { text-align: center; padding: 5rem 0; opacity: 0.8; }

            /* MODAL */
            .gacha-modal-overlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.8);
                backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000;
            }
            .gacha-modal {
                background: var(--valorant-dark);
                width: 450px; border: 1px solid var(--valorant-red);
                padding: 2.5rem; box-shadow: 0 0 50px rgba(255, 70, 85, 0.3);
            }
            .modal-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
            .modal-header h3 { font-size: 1.3rem; font-weight: 900; }
            .modal-body { color: #ccc; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; }
            .modal-footer { display: flex; gap: 1rem; }
            .btn-confirm { flex: 1; padding: 1rem; background: var(--valorant-red); font-weight: 900; }
            .btn-cancel { flex: 1; padding: 1rem; background: var(--valorant-gray); font-weight: 900; }

            .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
        </div>
    );
};
