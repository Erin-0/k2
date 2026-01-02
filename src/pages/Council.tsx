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
            const updatedMessages = [...messages, newUserMsg].slice(-10); // Keep last 10 locally first

            // Optimistic update
            setMessages(updatedMessages);

            // AI Generation
            if (!apiKey) throw new Error("API_KEY_MISSING");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const historyText = messages.map(m => `${m.role === 'user' ? 'Sovereign' : 'Minister'}: ${m.text}`).join('\n');
            const systemPrompt = `أنت ${selectedMinister.name}، الوزير المخلص المسؤول عن ${selectedMinister.domain} وتخدم الحاكم السيادي ${user.username || 'User'}. خاطبه بلقب 'جلالتك'. قدم نصائح خبيرة حول ${selectedMinister.domain}. كن موجزًا واستراتيجيًا وانغمس في طابع إمبراطورية السايبربانك السيادية. استخدم مصطلحات اللعبة (مثل 'الارتباط العصبي'، 'الرصيد السيادي'). اجعل ردودك باللغة العربية الفصحى وفي حدود 200 كلمة.`;

            const fullPrompt = `${systemPrompt}

HISTORY:
${historyText}

Sovereign: ${userMsg}
Minister:`;

            const result = await model.generateContent(fullPrompt);
            const responseText = result.response.text();

            const aiMsg: Message = { role: 'model', text: responseText, timestamp: new Date() };

            // Save to Firestore with transaction-like update
            const finalMessages = [...updatedMessages, aiMsg].slice(-10); // Enforce limit

            await setDoc(chatRef, {
                userId: user.id,
                ministerId: selectedMinister.id,
                messages: finalMessages,
                dailyUsage: { date: today, count: dailyCount + 1 },
                lastUpdated: Timestamp.now()
            }, { merge: true });
        } catch (error: any) {
            console.error(error);

            // قائمة مرحة ومتنوعة من رسائل الخطأ بالعربية مع لمسة سايبربانك فخمة وكوميدية 😎
            const cyberpunkErrorMessages = [
                "فشل الارتباط العصبي: الوزير غارق في المصفوفة... حاول لاحقاً يا صاحب الجلالة!",
                "NEURAL_OVERLOAD: الوزير يعاني من هجوم بيانات! يحتاج إعادة تشغيل سريعة 🔄",
                "BLACK_ICE_DETECTED: جدار حماية الوزير صد الهجوم... لكن الاتصال انقطع مؤقتاً 🧊",
                "SYSTEM_MALFUNCTION: الوزير يقول 'أنا مش عارف أفكر الحين، السيرفرات سخنة زي الشمس!' 🔥",
                "QUANTUM_FLUX_DISRUPTION: الوزير ضاع في بعد آخر... انتظر عودته يا إمبراطور!",
                "ADVISOR_OFFLINE: الوزير راح يشرب قهوة نيون، يرجع بعد شوي ☕✨",
                "ERROR_404: حكمة الوزير غير موجودة حالياً... جرب تسأل سؤال أسهل؟ 😏",
                "NEURAL_LINK_DISRUPTED: الوزير يهمس 'الإشارة ضعيفة... زيد الطاقة يا مولاي!' ⚡",
                "GLITCH_IN_THE_MATRIX: الوزير شاف قطة سوداء مرتين... الاتصال معطل مؤقتاً 🐱‍💻",
                "IMMINENT_SYSTEM_FAILURE: لا لا، بس مزحة! الوزير بخير، بس الـ API نايم 😴"
            ];

            // اختيار رسالة عشوائية عشان كل مرة تكون مختلفة وممتعة
            const randomError = cyberpunkErrorMessages[Math.floor(Math.random() * cyberpunkErrorMessages.length)];

            showAlert(randomError);

            // إضافة رسالة خطأ مرحة داخل الشات نفسه عشان اللاعب يشوفها ويضحك (بدل الرجوع للرسائل القديمة فقط)
            const errorMsg: Message = {
                role: 'model',
                text: "⚠️ [فشل في الاتصال] الوزير يواجه اضطراباً عصبياً مؤقتاً... أعد المحاولة، يا صاحب الجلالة. ربما الشبكة تحت هجوم من آراساكا! 😈",
                timestamp: new Date()
            };
            setMessages(prev => [...prev.slice(-9), errorMsg]); // نحافظ على الحد الأقصى 10 رسائل

            // خيار: إعادة الرسالة الأخيرة للمستخدم إذا كانت موجودة (optimistic revert جزئي)
            setMessages(prev => prev.slice(0, -1)); // لو تبي تحذف الرسالة الأخيرة اللي فشلت
        }

        setLoading(false);
    };

    if (selectedMinister) {
        return (
            <div className="page-container fade-in">
                <button
                    onClick={() => setSelectedMinister(null)}
                    className="micro-label"
                    style={{ background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', border: 'none', color: 'var(--primary)', cursor: 'pointer', letterSpacing: '2px' }}
                >
                    <ArrowLeft size={16} /> RETURN_TO_COUNCIL
                </button>

                <div className="card card-glow" style={{ height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

                    {/* Header */}
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-dim)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="login-icon-box" style={{ width: '50px', height: '50px', margin: 0 }}>
                            {selectedMinister.icon}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{selectedMinister.name.toUpperCase()}</h2>
                            <p className="micro-label" style={{ opacity: 0.6 }}>{selectedMinister.domain}</p>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="custom-scrollbar" style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {initializing && (
                            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                                <div className="neural-loader sm"></div>
                                <p className="micro-label" style={{ marginTop: '1rem' }}>ESTABLISHING_SECURE_LINK...</p>
                            </div>
                        )}

                        {messages.length === 0 && !initializing && (
                            <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.3 }}>
                                <Bot size={48} />
                                <p className="micro-label" style={{ marginTop: '1rem' }}>AWAITING_INQUIRY</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '1rem 1.5rem',
                                    borderRadius: '16px',
                                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-soft)',
                                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-dim)',
                                    color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                                    boxShadow: msg.role === 'user' ? '0 4px 15px var(--primary-glow)' : 'none',
                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                    borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                                }}>
                                    <p style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>{msg.text}</p>
                                </div>
                                <span className="micro-label" style={{ marginTop: '0.5rem', opacity: 0.4, fontSize: '0.6rem' }}>
                                    {msg.role === 'user' ? 'SOVEREIGN' : 'ADVISOR'} // {new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border-dim)' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                                placeholder="Transmit orders or query..."
                                disabled={loading}
                                style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)' }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="primary"
                                style={{ width: '60px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
        <div className="page-container fade-in">
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '4px' }}>ROYAL_CHAMBER</p>
                    <h1 className="text-gradient" style={{ fontSize: '3rem' }}>Advisory Council</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: 0.6 }}>
                    <Bot size={18} color="var(--primary)" />
                    <span className="micro-label">14_ACTIVE_NODES</span>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {MINISTERS.map((m) => (
                    <div
                        key={m.id}
                        className="card card-glow hover-trigger"
                        onClick={() => setSelectedMinister(m)}
                        style={{ padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1.5rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="login-icon-box" style={{ width: '60px', height: '60px', margin: 0, background: 'rgba(255,255,255,0.03)' }}>
                                {m.icon}
                            </div>
                            <div className="icon-action" style={{ background: 'var(--primary-glow)' }}>
                                <Zap size={16} color="var(--primary)" />
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', color: 'var(--text-main)' }}>{m.name}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{m.domain}</p>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button className="micro-label" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--primary)', letterSpacing: '2px' }}>
                                INITIATE_UPLINK
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};