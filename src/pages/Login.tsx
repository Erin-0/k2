import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { Upload, ShieldCheck, Cpu } from 'lucide-react';

const colors = ["#6366f1", "#a855f7", "#06b6d4", "#f43f5e", "#10b981", "#f59e0b"];

export const Login = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '', color: '' });
    const [language, setLanguage] = useState<'en' | 'fr' | 'ar'>('en');
    const [profileImg, setProfileImg] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirection protocol: ensures user is moved to the dashboard once authenticated
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleImageUpload = async (event: any) => {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const options = { maxSizeMB: 0.1, maxWidthOrHeight: 400, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onloadend = () => setProfileImg(reader.result as string);
        } catch (error) {
            setError("BIOMETRIC_DATA_ERROR");
        }
    };

    const handleAuth = async () => {
        if (loading) return;
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                if (formData.password !== formData.confirmPassword) throw new Error("VERIFICATION_FAILED: PASSWORDS_MISMATCH");
                if (formData.password.length < 6) throw new Error("SECURITY_BREACH: KEY_LENGTH_MIN_6");
                if (!formData.color) throw new Error("IDENTITY_CONFLICT: THEME_COLOR_REQUIRED");
                if (!formData.username) throw new Error("DESIGNATION_REQUIRED");

                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const userId = userCredential.user.uid;

                const newUser = {
                    username: formData.username,
                    color: formData.color,
                    photoUrl: profileImg || null,
                    balance: 99000000000,
                    createdAt: serverTimestamp(),
                    ownedCompanies: [],
                    ownedWeapons: [],
                    lastEarningsCheck: serverTimestamp(),
                    resources: {
                        "Gold": 0, "Iron": 0, "Coal": 0, "Oil": 0, "Copper": 0, "Silver": 0, "Uranium": 0, "Wood": 0, "Stone": 0, "Food": 0, "Water": 0, "Steel": 0, "Plastic": 0, "Glass": 0, "Paper": 0, "Cloth": 0, "Leather": 0, "Rubber": 0, "Silicon": 0, "Aluminum": 0
                    },
                    language: language
                };

                await setDoc(doc(db, "users", userId), newUser);
                // Redirection is handled by the useEffect above
            } else {
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
                // Redirection is handled by the useEffect above
            }
        } catch (e: any) {
            let msg = e.message;
            if (e.code === 'auth/email-already-in-use') msg = "IDENTITY_EXISTS: UPLINK_CONFLICT";
            if (e.code === 'auth/invalid-credential') msg = "ACCESS_DENIED: INVALID_CREDENTIALS";
            setError(msg || "NETWORK_UPLINK_FAILURE");
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>

            <div className="login-container fade-in">
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div className="login-icon-box">
                        <Cpu size={40} color="var(--primary)" />
                    </div>
                    <p className="micro-label" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Global Access Terminal</p>
                    <h1 className="text-gradient" style={{ fontSize: '2.2rem' }}>
                        {isRegister ? 'New Identity' : 'Sovereign Login'}
                    </h1>
                </div>

                <div className="card card-glow" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        <div>
                            <p className="micro-label" style={{ marginBottom: '0.5rem' }}>Link Identity (Email)</p>
                            <input
                                placeholder="IDENTITY@NETWORK.SOV"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="mono"
                            />
                        </div>

                        {isRegister && (
                            <div>
                                <p className="micro-label" style={{ marginBottom: '0.5rem' }}>Designation (Username)</p>
                                <input
                                    placeholder="ENTER_NAME"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="mono"
                                />
                            </div>
                        )}

                        <div>
                            <p className="micro-label" style={{ marginBottom: '0.5rem' }}>Access Key (Password)</p>
                            <input
                                type="password"
                                placeholder="******"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="mono"
                            />
                        </div>

                        {isRegister && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <p className="micro-label" style={{ marginBottom: '0.5rem' }}>Verify Access Key</p>
                                    <input
                                        type="password"
                                        placeholder="******"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="mono"
                                    />
                                </div>

                                <div>
                                    <p className="micro-label" style={{ marginBottom: '0.5rem' }}>Neural Snapshot</p>
                                    <label className="upload-btn">
                                        {profileImg ? (
                                            <img src={profileImg} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                                        ) : <Upload size={20} />}
                                        <span className="micro-label">{profileImg ? 'IDENTITY CAPTURED' : 'UPLOAD BIOMETRIC'}</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>

                                <div>
                                    <p className="micro-label" style={{ marginBottom: '0.75rem' }}>Aura Frequency</p>
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                        {colors.map(c => (
                                            <div
                                                key={c}
                                                onClick={() => setFormData({ ...formData, color: c })}
                                                style={{
                                                    backgroundColor: c,
                                                    border: formData.color === c ? '2px solid white' : '1px solid transparent',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    boxShadow: formData.color === c ? `0 0 15px ${c}` : 'none',
                                                    transition: 'var(--transition)'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="micro-label" style={{ marginBottom: '0.75rem' }}>Interface Language</p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['en', 'fr', 'ar'].map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => setLanguage(lang as any)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.5rem',
                                                    background: language === lang ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    border: language === lang ? '1px solid var(--primary)' : '1px solid var(--border-dim)',
                                                    color: language === lang ? 'white' : 'var(--text-muted)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                {lang.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}



                        {error && (
                            <div className="error-alert">
                                <ShieldCheck size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleAuth}
                            disabled={loading}
                            className="primary"
                            style={{ margin: '1rem 0', padding: '1.2rem' }}
                        >
                            {loading ? 'INITIALIZING...' : (isRegister ? 'ESTABLISH IDENTITY' : 'RESTORE ACCESS')}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <p className="micro-label" style={{ marginBottom: '0.5rem' }}>
                                {isRegister ? 'Protocol exists?' : 'Protocol missing?'}
                            </p>
                            <button
                                onClick={() => setIsRegister(!isRegister)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', padding: 0 }}
                            >
                                <span className="micro-label" style={{ color: 'var(--primary)', cursor: 'pointer' }}>
                                    {isRegister ? '» RETURN TO GATE' : '» INITIATE NEW IDENTITY'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg);
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }
                .orb {
                    position: absolute;
                    width: 400px;
                    height: 400px;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.15;
                    z-index: 0;
                }
                .orb-1 { top: -10%; left: -10%; background: var(--primary); }
                .orb-2 { bottom: -10%; right: -10%; background: var(--accent); }
                
                .login-container {
                    width: 100%;
                    max-width: 450px;
                    position: relative;
                    z-index: 1;
                }
                .login-icon-box {
                    width: 80px;
                    height: 80px;
                    background: var(--surface);
                    border: 1px solid var(--border-bright);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    box-shadow: 0 0 30px var(--primary-glow);
                }
                .upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: var(--surface);
                    border: 1px solid var(--border-bright);
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: var(--transition);
                }
                .upload-btn:hover {
                    border-color: var(--primary);
                    background: var(--surface-soft);
                }
                .error-alert {
                    background: rgba(239, 68, 68, 0.1);
                    border-left: 3px solid var(--danger);
                    padding: 1rem;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--danger);
                    font-size: 0.85rem;
                    font-weight: 600;
                    font-family: 'JetBrains Mono', monospace;
                }
                @media (max-width: 480px) {
                    .login-page { padding: 1rem; }
                }
            `}</style>
        </div>
    );
};
