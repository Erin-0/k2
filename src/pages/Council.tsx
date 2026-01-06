import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc, Timestamp } from 'firebase/firestore';

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    Cpu, Landmark, Sword, Factory, Target, ArrowRightLeft,
    Building2, Users, Briefcase, Gamepad2, Coins, Gem,
    MessageSquare, Zap, Send, ArrowLeft, Bot
} from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';

const MINISTERS = [
    { id: 'home', name: 'وزير الدولة', domain: 'لوحة القيادة الرئيسية، صافي الثروة، قائمة المتصدرين، الأنشطة، عدد الأراضي.', icon: <Cpu size={32} /> },
    { id: 'loans', name: 'وزير المالية', domain: 'نظام القروض، الإقراض المركزي/بين الأقران، أسعار الفائدة، السداد.', icon: <Landmark size={32} /> },
    { id: 'weapons', name: 'وزير الدفاع', domain: 'شراء الأسلحة، استراتيجيات الهجوم/الدفاع لغزو الخريطة.', icon: <Sword size={32} /> },
    { id: 'loot', name: 'وزير الموارد', domain: 'إدارة الغنائم، جمع الموارد، تصدير المنتجات للربح.', icon: <Factory size={32} /> },
    { id: 'map', name: 'وزير الحرب', domain: 'أراضي الخريطة، تكتيكات الغزو، اشتباكات وضع الحرب.', icon: <Target size={32} /> },
    { id: 'transfers', name: 'وزير العلاقات الخارجية', domain: 'إرسال الأموال بين الأقران، التحالفات عبر التمويل.', icon: <ArrowRightLeft size={32} /> },
    { id: 'store', name: 'وزير التجارة', domain: 'عمليات المتجر، الشراء بالجملة، البيع بالتجزئة، مبيعات الروبوتات.', icon: <Building2 size={32} /> },
    { id: 'accounts', name: 'وزير الملفات الشخصية', domain: 'عرض/تعديل الحسابات، التجسس على إحصائيات الآخرين.', icon: <Users size={32} /> },
    { id: 'companies', name: 'وزير المشاريع', domain: 'الاستحواذ على الشركات، استراتيجيات الدخل السلبي.', icon: <Briefcase size={32} /> },
    { id: 'games', name: 'وزير الاحتمالات', domain: 'استراتيجيات الألعاب، تقييم المخاطر، عوائد الترفيه.', icon: <Gamepad2 size={32} /> },
    { id: 'trading', name: 'وزير التداول', domain: 'اتجاهات السوق، أسعار الصرف، فرص المراجحة.', icon: <Coins size={32} /> },
    { id: 'marketplace', name: 'وزير الأصول', domain: 'الاستحواذ على الأصول السيادية، تقييم العناصر النادرة.', icon: <Gem size={32} /> },
    { id: 'chat', name: 'وزير الإشارات', domain: 'آداب التواصل، بروتوكولات الدردشة العالمية، الدبلوماسية.', icon: <MessageSquare size={32} /> },
    { id: 'tech', name: 'وزير الابتكار', domain: 'تحديثات المنصة، علم التحكم الآلي، تكامل تكنولوجيا المستقبل.', icon: <Zap size={32} /> },
];

interface Message {
    role: 'user' | 'model';
    text: string;
    timestamp: any;
}

export const Council = () => {
    const { user } = useAuth();
    const { showAlert } = useTerminal();


    const [selectedMinister, setSelectedMinister] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load messages when a minister is selected
    useEffect(() => {
        if (!selectedMinister || !user) return;

        setInitializing(true);
        const chatId = `${user.id}_${selectedMinister.id}`;
        const unsub = onSnapshot(doc(db, "council_chats", chatId), (docSnap) => {
            if (docSnap.exists()) {
                setMessages(docSnap.data().messages || []);
            } else {
                setMessages([]);
            }
            setInitializing(false);
        });

        return () => unsub();
    }, [selectedMinister, user]);

    const handleSend = async () => {
        if (!input.trim() || !selectedMinister || !user) return;

        const userMsg = input.trim();
        setInput('');
        setLoading(true);

        const chatId = `${user.id}_${selectedMinister.id}`;
        const chatRef = doc(db, "council_chats", chatId);

        try {
            // Check Rate Limit
            const docSnap = await getDoc(chatRef);
            let dailyCount = 0;
            const today = new Date().toDateString();

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.dailyUsage && data.dailyUsage.date === today) {
                    dailyCount = data.dailyUsage.count;
                }
            }

            if (dailyCount >= 10) {
                showAlert("RATE_LIMIT_EXCEEDED: Minister capacity reached for today. Try again tomorrow.");
                setLoading(false);
                return;
            }

            // User Message Object
            const newUserMsg: Message = { role: 'user', text: userMsg, timestamp: new Date() };
            // Keep more history (50 messages)
            const updatedMessages = [...messages, newUserMsg].slice(-50);

            // Optimistic update
            setMessages(updatedMessages);

            // AI Generation
            if (!apiKey) throw new Error("API_KEY_MISSING");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const historyText = messages.slice(-10).map(m => `${m.role === 'user' ? 'Sovereign' : 'Minister'}: ${m.text}`).join('\n');
            const systemPrompt = `أنت ${selectedMinister.name}، المستشار والوزير المسؤول عن ${selectedMinister.domain}. تخدم الحاكم ${user.username || 'User'}.
            الشخصية: سايبربانك، غامض، ذكي جداً، وموالي للإمبراطورية.
            المهمة: تقديم نصيحة استراتيجية واضحة ومختصرة (أقل من 150 كلمة).
            استخدم مصطلحات النظام: (الشبكة العصبية، الرصيد، البروتوكولات، التشفير).
            اللغة: عربية فصحى مع مصطلحات تقنية.`;

            const fullPrompt = `${systemPrompt}

History:
${historyText}

Sovereign: ${userMsg}
Minister:`;

            const result = await model.generateContent(fullPrompt);
            const responseText = result.response.text();

            const aiMsg: Message = { role: 'model', text: responseText, timestamp: new Date() };

            // Save to Firestore with transaction-like update
            const finalMessages = [...updatedMessages, aiMsg].slice(-50);

            await setDoc(chatRef, {
                userId: user.id,
                ministerId: selectedMinister.id,
                messages: finalMessages,
                dailyUsage: { date: today, count: dailyCount + 1 },
                lastUpdated: Timestamp.now()
            }, { merge: true });
        } catch (error: any) {
            console.error("Council Error:", error);

            // Show actual error if it's permission related, otherwise show flavor text
            if (error.code === 'permission-denied') {
                showAlert("SYSTEM_ERROR: Permission Denied. Please check Firebase Rules.");
            } else {
                const cyberpunkErrorMessages = [
                    "فشل الارتباط العصبي: الوزير غارق في المصفوفة... حاول لاحقاً يا صاحب الجلالة!",
                    "NEURAL_OVERLOAD: الوزير يعاني من هجوم بيانات! يحتاج إعادة تشغيل سريعة 🔄",
                    "GLITCH_IN_THE_MATRIX: الوزير شاف قطة سوداء مرتين... الاتصال معطل مؤقتاً 🐱‍💻",
                ];
                const randomError = cyberpunkErrorMessages[Math.floor(Math.random() * cyberpunkErrorMessages.length)];
                showAlert(randomError);
            }


            const errorMsg: Message = {
                role: 'model',
                text: "⚠️ [فشل في الاتصال] حدث خطأ في النظام العصبي. تأكد من إعدادات (Firebase Rules) أو عاول لاحقاً.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev.slice(-49), errorMsg]);
        }

        setLoading(false);
    };

    if (selectedMinister) {
        return (
            <div className="page-container fade-in" style={{ padding: '0.5rem' }}>
                <button
                    onClick={() => setSelectedMinister(null)}
                    className="micro-label"
                    style={{ background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', border: 'none', color: 'var(--primary)', cursor: 'pointer', letterSpacing: '2px' }}
                >
                    <ArrowLeft size={16} /> RETURN
                </button>

                <div className="card card-glow" style={{
                    height: 'calc(100vh - 120px)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: '16px'
                }}>

                    {/* Header */}
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-dim)', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="login-icon-box" style={{ width: '40px', height: '40px', margin: 0, minWidth: '40px' }}>
                            {selectedMinister.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h2 style={{ fontSize: '1rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedMinister.name.toUpperCase()}</h2>
                            <p className="micro-label" style={{ opacity: 0.6, fontSize: '0.6rem' }}>{selectedMinister.domain}</p>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="custom-scrollbar" style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {initializing && (
                            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                                <div className="neural-loader sm"></div>
                                <p className="micro-label" style={{ marginTop: '1rem' }}>CONNECTING...</p>
                            </div>
                        )}

                        {messages.length === 0 && !initializing && (
                            <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.3 }}>
                                <Bot size={48} />
                                <p className="micro-label" style={{ marginTop: '1rem' }}>INITIATE_CONVERSATION</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '90%',
                                    padding: '0.8rem 1rem',
                                    borderRadius: '16px',
                                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-soft)',
                                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-dim)',
                                    color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                                    boxShadow: msg.role === 'user' ? '0 4px 15px var(--primary-glow)' : 'none',
                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                    borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                                    fontSize: '0.9rem'
                                }}>
                                    <p style={{ lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                </div>
                                <span className="micro-label" style={{ marginTop: '0.3rem', opacity: 0.4, fontSize: '0.5rem' }}>
                                    {msg.role === 'user' ? 'SOVEREIGN' : 'ADVISOR'}
                                </span>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--border-dim)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                                placeholder="Send orders..."
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-dim)',
                                    padding: '0.8rem',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="primary"
                                style={{ width: '50px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                            >
                                {loading ? <div className="neural-loader sm"></div> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in" style={{ padding: '1rem', paddingBottom: '100px' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '4px' }}>ROYAL_CHAMBER</p>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Advisory Council</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: 0.6, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px' }}>
                    <Bot size={18} color="var(--primary)" />
                    <span className="micro-label">14_NODES</span>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {MINISTERS.map((m) => (
                    <div
                        key={m.id}
                        className="card card-glow hover-trigger"
                        onClick={() => setSelectedMinister(m)}
                        style={{ padding: '1.2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="login-icon-box" style={{ width: '45px', height: '45px', margin: 0, background: 'rgba(255,255,255,0.03)' }}>
                                {m.icon}
                            </div>
                            <div className="icon-action" style={{ background: 'var(--primary-glow)', padding: '4px', borderRadius: '4px' }}>
                                <Zap size={14} color="var(--primary)" />
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '1rem', margin: '0 0 0.3rem', color: 'var(--text-main)' }}>{m.name}</h3>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.domain}</p>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button className="micro-label" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--primary)', letterSpacing: '1px', fontSize: '0.6rem', padding: '0.5rem' }}>
                                INITIATE
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                @media (max-width: 600px) {
                    .grid { grid-template-columns: 1fr 1fr !important; }
                    h1 { fontSize: 2rem !important; }
                }
            `}</style>
        </div>
    );
};
