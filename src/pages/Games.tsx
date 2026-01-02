import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, runTransaction, serverTimestamp, getDocs, updateDoc } from 'firebase/firestore';
import { Swords, Zap, Brain, Crosshair, ArrowLeft, Activity, Play, AlertTriangle } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { formatNeuralCurrency } from '../utils/formatters';

interface BuckshotState {
    playerHp: number;
    dealerHp: number;
    rounds: ('live' | 'blank')[];
    msg: string;
}

const GAMES = [
    { id: 'xo_med', name: 'إكس أو (عادي)', prizeTier: 'A', icon: <Swords size={20} />, desc: 'محاكاة تكتيكية قياسية' },
    { id: 'xo_hard', name: 'إكس أو (مستحيل)', prizeTier: 'B', icon: <Swords size={20} color="var(--danger)" />, desc: 'قتال تنبؤي عالي المستوى' },
    { id: 'slots', name: 'سلوتس 7 المحظوظ', prizeTier: 'C', icon: <Zap size={20} color="gold" />, desc: 'محاذاة الدوائر العشوائية' },
    { id: 'buckshot', name: 'روليت الطلقات', prizeTier: 'D', icon: <Crosshair size={20} color="var(--danger)" />, desc: 'لعبة احتمالات مرجحة بالمخاطر' },
    { id: 'quiz', name: 'تحدي الذكاء الاصطناعي', prizeTier: 'E', icon: <Brain size={20} />, desc: 'استخراج المعرفة العصبية' }
];

export const Games = () => {
    const { user, refreshUser } = useAuth();
    const [prizes, setPrizes] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0, E: 0 });
    const [activeGame, setActiveGame] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [roundsLeft, setRoundsLeft] = useState(3);
    const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
    const [winner, setWinner] = useState<string | null>(null);
    const [wheels, setWheels] = useState([7, 7, 7]);
    const [spinning, setSpinning] = useState(false);
    const [bsState, setBsState] = useState<BuckshotState>({ playerHp: 0, dealerHp: 0, rounds: [], msg: '' });
    const [quiz, setQuiz] = useState<any>(null);
    const [quizLoading, setQuizLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            const snap = await getDocs(collection(db, "users"));
            let total = 0;
            snap.forEach(d => total += (d.data().balance || 0));
            const avg = total / (snap.size || 1);
            setPrizes({
                A: Math.floor(avg * 0.005),
                B: Math.floor(avg * 0.01),
                C: Math.floor(avg * 0.015),
                D: Math.floor(avg * 0.02),
                E: Math.floor(avg * 0.01),
            });
            setLoading(false);
        };
        init();
    }, []);

    const checkLimit = useCallback((gameId: string) => {
        if (!user?.gameStats || !user.gameStats[gameId]) return false;
        const lastPlayed = user.gameStats[gameId].lastPlayed?.toDate?.() || new Date(user.gameStats[gameId].lastPlayed);
        const now = new Date();
        const diff = now.getTime() - lastPlayed.getTime();
        return diff < 86400000;
    }, [user]);

    const startSession = (gameId: string) => {
        if (checkLimit(gameId)) {
            alert("تم رفض الوصول: تبريد النظام جارٍ. يُسمح بالدخول بعد 24 ساعة.");
            return;
        }
        setActiveGame(gameId);
        setRoundsLeft(3);
        resetGame();
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setWinner(null);
        setBsState({ playerHp: 0, dealerHp: 0, rounds: [], msg: '' });
        setQuiz(null);
    };

    const recordSessionEnd = async (gameId: string) => {
        if (!user) return;
        const userRef = doc(db, 'users', user.id);
        const stats = user.gameStats || {};
        stats[gameId] = { lastPlayed: new Date() };
        await updateDoc(userRef, { gameStats: stats });
        await refreshUser();
        setActiveGame(null);
    };

    const claimPrize = async (tier: string, gameName: string) => {
        const amount = prizes[tier];
        try {
            await runTransaction(db, async (t) => {
                const uRef = doc(db, 'users', user!.id);
                const uSnap = await t.get(uRef);
                t.update(uRef, { balance: (uSnap.data()?.balance || 0) + amount });
                t.set(doc(collection(db, "activities")), { userId: user!.id, type: 'win', message: `تم استخراج النصر: $${formatNeuralCurrency(amount)} من ${gameName}`, timestamp: serverTimestamp() });
            });
            await refreshUser();

            const nextRounds = roundsLeft - 1;
            setRoundsLeft(nextRounds);
            if (nextRounds <= 0) {
                alert(`اكتملت الجلسة: تم الحصول على $${formatNeuralCurrency(amount)}. سيتم قفل النظام لمدة 24 ساعة.`);
                recordSessionEnd(activeGame!);
            } else {
                alert(`فوز بالجولة: تم كسب $${formatNeuralCurrency(amount)}. متبقي ${nextRounds} جولات.`);
                resetGame();
            }
        } catch (e) { alert("فشل الارتباط: لم تكتمل العملية."); }
    };

    const handleLoss = () => {
        const nextRounds = roundsLeft - 1;
        setRoundsLeft(nextRounds);
        if (nextRounds <= 0) {
            alert("انتهت الجلسة: نفدت الجولات. سيتم قفل النظام لمدة 24 ساعة.");
            recordSessionEnd(activeGame!);
        } else {
            alert(`فشلت الجولة: متبقي ${nextRounds} جولات.`);
            resetGame();
        }
    };

    const checkWinner = (squares: (string | null)[]) => {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of lines) if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
        return squares.includes(null) ? null : 'تعادل';
    };

    const minimax = (squares: (string | null)[], depth: number, isMaximizing: boolean): number => {
        const result = checkWinner(squares);
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        if (result === 'تعادل') return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (squares[i] === null) {
                    squares[i] = 'O';
                    const score = minimax(squares, depth + 1, false);
                    squares[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (squares[i] === null) {
                    squares[i] = 'X';
                    const score = minimax(squares, depth + 1, true);
                    squares[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    };

    const handleXO = (i: number) => {
        if (board[i] || winner) return;
        const next = [...board]; next[i] = 'X'; setBoard(next);
        const w = checkWinner(next);
        if (w) {
            setWinner(w);
            if (w === 'X') claimPrize(activeGame === 'xo_hard' ? 'B' : 'A', 'إكس أو');
            else handleLoss();
            return;
        }

        setTimeout(() => {
            const currentBoard = [...next];
            let bestMove = -1;

            if (activeGame === 'xo_hard') {
                let bestScore = -Infinity;
                for (let j = 0; j < 9; j++) {
                    if (currentBoard[j] === null) {
                        currentBoard[j] = 'O';
                        const score = minimax(currentBoard, 0, false);
                        currentBoard[j] = null;
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = j;
                        }
                    }
                }
            } else {
                const empty = currentBoard.map((v, idx) => v === null ? idx : null).filter(v => v !== null) as number[];
                bestMove = empty[Math.floor(Math.random() * empty.length)];
            }

            if (bestMove !== -1) {
                currentBoard[bestMove] = 'O';
                setBoard(currentBoard);
                const w2 = checkWinner(currentBoard);
                if (w2) {
                    setWinner(w2);
                    if (w2 === 'O' || w2 === 'تعادل') handleLoss();
                }
            }
        }, 500);
    };

    const spinSlots = () => {
        if (spinning) return;
        setSpinning(true);
        let count = 0;
        const interval = setInterval(() => {
            setWheels([Math.floor(Math.random() * 10), Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)]);
            count++;
            if (count > 20) {
                clearInterval(interval);
                const symbols = [7, 7, 7, 7, 1, 2, 3, 4, 5, 6];
                const final = [symbols[Math.floor(Math.random() * 10)], symbols[Math.floor(Math.random() * 10)], symbols[Math.floor(Math.random() * 10)]];
                setWheels(final);
                setSpinning(false);
                if (final[0] === 7 && final[1] === 7 && final[2] === 7) claimPrize('C', 'سلوتس 7');
                else handleLoss();
            }
        }, 80);
    };

    const initBuckshot = () => {
        const liveCount = Math.floor(Math.random() * 3) + 1;
        const blankCount = Math.floor(Math.random() * 3) + 1;
        const rounds: ('live' | 'blank')[] = [];
        for (let i = 0; i < liveCount; i++) rounds.push('live');
        for (let i = 0; i < blankCount; i++) rounds.push('blank');
        for (let i = rounds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
        }
        setBsState({ playerHp: 3, dealerHp: 3, rounds, msg: `حالة الغرفة: ${liveCount} حية / ${blankCount} فارغة تم تحميلها.` });
    };

    const handleShoot = (target: 'self' | 'dealer') => {
        const round = bsState.rounds[0];
        const nextR = bsState.rounds.slice(1);
        let pHP = bsState.playerHp, dHP = bsState.dealerHp, msg = "";

        if (round === 'live') {
            msg = `إطلاق: إصابة حية على ${target === 'self' ? 'الذات' : 'الخصم'}.`;
            if (target === 'self') pHP--; else dHP--;
        } else {
            msg = `نقرة: طلقة فارغة.`;
        }

        if (pHP <= 0) {
            setBsState(p => ({ ...p, playerHp: 0, msg: "فشل النظام: تم تصفية المستخدم." }));
            setTimeout(() => handleLoss(), 1500);
            return;
        }
        if (dHP <= 0) {
            setBsState(p => ({ ...p, dealerHp: 0, msg: "تم حذف الهدف. اكتمل الاستخراج." }));
            setTimeout(() => claimPrize('D', "روليت الطلقات"), 1500);
            return;
        }

        if (target === 'dealer' || (target === 'self' && round === 'live')) {
            setTimeout(() => {
                if (nextR.length === 0) {
                    setBsState(p => ({ ...p, rounds: [], msg: "المخزن فارغ. إعادة التحميل..." }));
                    setTimeout(() => initBuckshot(), 1000);
                    return;
                }
                const dr = nextR[0], nR2 = nextR.slice(1);
                let newPHP = pHP;
                let drMsg = dr === 'live' ? "طلقة الخصم: إصابة حية." : "طلقة الخصم: طلقة فارغة.";
                if (dr === 'live') newPHP--;
                setBsState(p => ({ ...p, playerHp: newPHP, rounds: nR2, msg: drMsg }));
                if (newPHP <= 0) setTimeout(() => handleLoss(), 1500);
            }, 1000);
            setBsState({ playerHp: pHP, dealerHp: dHP, rounds: nextR, msg });
        } else {
            setBsState({ playerHp: pHP, dealerHp: dHP, rounds: nextR, msg: msg + " دور إضافي للمستخدم." });
            if (nextR.length === 0) setTimeout(() => initBuckshot(), 1000);
        }
    };

    const initQuiz = async () => {
        setQuizLoading(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AI_KEY";
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent("أعطني سؤالاً واحداً عن الاقتصاد أو الموارد بتنسيق JSON: {question, options[], correct, article} باللغة العربية");
            const text = (await result.response).text().replace(/```json|```/g, "").trim();
            setQuiz(JSON.parse(text));
        } catch (e) { alert("فشل الرابط العصبي: انقطع الاتصال."); } finally { setQuizLoading(false); }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="neural-loader"></div>
            <p className="micro-label" style={{ marginLeft: '1rem', letterSpacing: '2px' }}>جاري تهيئة محطة الألعاب...</p>
        </div>
    );

    return (
        <div className="page-container fade-in" style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.6rem' }}>القطاع_07: شبكة_الترفيه</p>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>محطة الألعاب</h1>
                </div>
                <div className="card card-glow" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', borderRadius: '10px' }}>
                     <Activity size={12} color="var(--primary)" className="pulse" />
                </div>
            </div>

            {activeGame ? (
                <div className="card card-glow fade-in" style={{ margin: '0 auto', border: '1px solid var(--border-bright)', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
                    <div className="scanline"></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                        <button onClick={() => { if (window.confirm("إلغاء البروتوكول: ستفقد الجولات المتبقية. هل تؤكد؟")) recordSessionEnd(activeGame); }} className="micro-label" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--danger)', fontSize: '0.6rem' }}>
                            <ArrowLeft size={10} /> إنهاء الجلسة
                        </button>
                        <div style={{ textAlign: 'right' }}>
                            <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.55rem' }}>الجولات المتبقية</p>
                            <h3 className="mono" style={{ fontSize: '1rem', margin: 0 }}>0{roundsLeft}_SDR</h3>
                        </div>
                    </div>

                    {activeGame.startsWith('xo') && (
                        <div style={{ textAlign: 'center' }}>
                            {winner ? (
                                <div className="fade-in">
                                    <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                                        {winner === 'X' ? 'تم تأكيد النصر' : winner === 'تعادل' ? 'تعادل تكتيكي' : 'فشل المهمة'}
                                    </h2>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxWidth: '280px', margin: '20px auto' }}>
                                    {board.map((cell, i) => (
                                        <button key={i} onClick={() => handleXO(i)} className="card" style={{ height: '85px', fontSize: '2rem', fontWeight: '900', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', color: cell === 'X' ? 'var(--primary)' : 'var(--danger)', boxShadow: cell ? `0 0 15px ${cell === 'X' ? 'var(--primary-glow)' : 'rgba(239, 68, 68, 0.2)'}` : 'none' }}>
                                            {cell}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeGame === 'slots' && (
                        <div style={{ textAlign: 'center' }}>
                            <div className="card" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-bright)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                    {wheels.map((w, i) => (
                                        <div key={i} className={`slot-reel ${spinning ? 'spinning' : ''}`} style={{ width: '70px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: '900', border: '1.5px solid var(--border-bright)', background: 'linear-gradient(to bottom, #111, #222, #111)', color: w === 7 ? 'gold' : 'white', borderRadius: '8px' }}>
                                            {w}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={spinSlots} disabled={spinning} className="primary" style={{ padding: '1rem', fontSize: '1rem', width: '100%' }}>
                                {spinning ? 'جاري الموازنة...' : 'تشغيل الجهاز'}
                            </button>
                        </div>
                    )}

                    {activeGame === 'buckshot' && (
                        <div style={{ textAlign: 'center' }}>
                            {!bsState.playerHp ? (
                                <div style={{ padding: '2rem 0' }}>
                                    <Crosshair size={40} color="var(--danger)" style={{ marginBottom: '1rem' }} />
                                    <button onClick={initBuckshot} className="primary" style={{ width: '100%', padding: '1rem' }}>تحميل المخزن</button>
                                </div>
                            ) : (
                                <div className="fade-in">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)', padding: '0.75rem' }}>
                                            <p className="micro-label" style={{ fontSize: '0.5rem' }}>سلامة المستخدم</p>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', margin: '0.5rem 0' }}>
                                                {[...Array(3)].map((_, i) => <div key={i} className={`hp-pip ${i < bsState.playerHp ? 'active' : ''}`} style={{ width: '15px', height: '5px', borderRadius: '1px', background: i < bsState.playerHp ? 'var(--success)' : 'rgba(255,255,255,0.05)' }}></div>)}
                                            </div>
                                        </div>
                                        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--danger)', padding: '0.75rem' }}>
                                            <p className="micro-label" style={{ fontSize: '0.5rem' }}>نظام الخصم</p>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', margin: '0.5rem 0' }}>
                                                {[...Array(3)].map((_, i) => <div key={i} className={`hp-pip ${i < bsState.dealerHp ? 'active-red' : ''}`} style={{ width: '15px', height: '5px', borderRadius: '1px', background: i < bsState.dealerHp ? 'var(--danger)' : 'rgba(255,255,255,0.05)' }}></div>)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card" style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', marginBottom: '1.5rem', border: '1px solid var(--border-bright)' }}>
                                        <p className="mono" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{bsState.msg}</p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button onClick={() => handleShoot('dealer')} className="primary" style={{ flex: 1, background: 'var(--danger)', padding: '1rem', fontSize: '0.8rem' }}>إطلاق على الهدف</button>
                                        <button onClick={() => handleShoot('self')} className="primary" style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-bright)', padding: '1rem', fontSize: '0.8rem' }}>إطلاق على النفس</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeGame === 'quiz' && (
                        <div className="fade-in">
                            {quizLoading ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <div className="neural-loader"></div>
                                    <p className="micro-label" style={{ marginTop: '1.5rem' }}>جاري استخراج البيانات...</p>
                                </div>
                            ) : !quiz ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <Brain size={40} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                                    <button onClick={initQuiz} className="primary" style={{ width: '100%', padding: '1rem' }}>إنشاء اتصال</button>
                                </div>
                            ) : (
                                <div>
                                    <div className="card" style={{ background: 'rgba(99, 102, 241, 0.05)', borderLeft: '3px solid var(--primary)', marginBottom: '1.5rem', padding: '1rem' }}>
                                        <p className="mono" style={{ fontSize: '0.8rem', opacity: 0.8 }}>{quiz.article}</p>
                                    </div>
                                    <h3 className="mono" style={{ fontSize: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>{quiz.question}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {quiz.options.map((o: string, i: number) => (
                                            <button key={i} onClick={() => { if (i === quiz.correct) claimPrize('E', 'اختبار الذكاء'); else handleLoss(); }} className="card card-glow" style={{ padding: '1rem', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                                <span className="mono" style={{ fontSize: '0.85rem' }}>{o}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {GAMES.map(g => {
                        const locked = checkLimit(g.id);
                        return (
                            <div key={g.id} className={`card card-glow ${locked ? 'locked' : ''}`} onClick={() => !locked && startSession(g.id)} style={{ padding: '1.25rem', position: 'relative', border: locked ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-dim)' }}>
                                {locked && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(3px)', borderRadius: '16px' }}>
                                        <AlertTriangle size={24} color="var(--danger)" />
                                        <p className="micro-label" style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>تبريد الأنظمة نشط</p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>{g.icon}</div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p className="micro-label" style={{ fontSize: '0.5rem', opacity: 0.5 }}>فئة العائد</p>
                                        <span className="mono" style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '0.8rem' }}>RANK_{g.prizeTier}</span>
                                    </div>
                                </div>
                                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>{g.name}</h3>
                                <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.65rem', marginBottom: '1.25rem' }}>{g.desc}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                                    <div>
                                        <p className="micro-label" style={{ color: 'var(--success)', fontSize: '0.5rem' }}>الجائزة القصوى</p>
                                        <p className="mono" style={{ color: 'var(--success)', fontWeight: '900', fontSize: '1.2rem' }}>${(prizes[g.prizeTier] || 0).toLocaleString()}</p>
                                    </div>
                                    <Play size={16} color="var(--primary)" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
                .slot-reel.spinning { animation: reel-blur 0.1s linear infinite; }
                @keyframes reel-blur { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); filter: blur(2px); } }
                .hp-pip.active { box-shadow: 0 0 8px var(--success); }
                .hp-pip.active-red { box-shadow: 0 0 8px var(--danger); }
                @media (max-width: 768px) { .page-container { padding-bottom: 110px !important; } }
            `}</style>
        </div>
    );
};