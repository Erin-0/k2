import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Briefcase, ShieldAlert, PackageOpen, Upload, Fingerprint, Globe, Cpu, Activity, Zap, Gem } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../context/AuthContext';
import { formatNeuralCurrency } from '../utils/formatters';

const IdentityPulseDisk = ({ url, name, size = 140, color = 'gray' }: any) => (
    <div className="pulse-disk-container" style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="disk-ring-base" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${color}33` }}></div>
        <div className="disk-ring-outer" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px dashed ${color}66`, animation: 'spin 30s linear infinite' }}></div>
        <div className="disk-ring-inner" style={{ position: 'absolute', inset: '5px', borderRadius: '50%', border: `2px solid ${color}`, opacity: 0.5 }}></div>
        <div className="disk-core" style={{ width: 'calc(100% - 20px)', height: 'calc(100% - 20px)', borderRadius: '50%', overflow: 'hidden', border: `3px solid rgba(0,0,0,0.5)`, background: 'var(--surface-soft)', zIndex: 5 }}>
            {url ? (
                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color, color: 'white', fontWeight: '900', fontSize: size / 3 }}>
                    {name?.charAt(0).toUpperCase()}
                </div>
            )}
        </div>
        <div className="status-indicator" style={{ position: 'absolute', bottom: '10%', right: '10%', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #000', zIndex: 10, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}></div>
    </div>
);

export const Accounts = () => {
    const { user: authUser, refreshUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#6366f1');
    const [editLanguage, setEditLanguage] = useState<'en' | 'fr' | 'ar'>('en');
    const [editPhoto, setEditPhoto] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            const snap = await getDocs(collection(db, "users"));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(list);
            if (!selectedId && list.length > 0) {
                const initialUser = list.find(u => u.id === authUser?.id) || list[0];
                setSelectedId(initialUser.id);
            }
            setLoading(false);
        };
        fetchUsers();
    }, [authUser, selectedId]);

    const activeUser = users.find(u => u.id === selectedId);
    const isMe = authUser?.id === activeUser?.id;

    useEffect(() => {
        if (activeUser && isMe) {
            setEditName(activeUser.username || '');
            setEditColor(activeUser.color || '#6366f1');
            setEditLanguage(activeUser.language || 'en');
            setEditPhoto(activeUser.photoUrl || null);
        }
    }, [activeUser, isMe]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 400 });
            const reader = new FileReader();
            reader.readAsDataURL(compressed);
            reader.onloadend = () => setEditPhoto(reader.result as string);
        } catch (err) { console.error(err); }
    };

    const handleSave = async () => {
        if (!authUser || !isMe) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "users", authUser.id), {
                username: editName,
                color: editColor,
                language: editLanguage,
                photoUrl: editPhoto
            });
            await refreshUser();
            const snap = await getDocs(collection(db, "users"));
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            alert("تم حفظ الهوية العصبية: اكتملت مزامنة البروتوكول.");
        } catch (err) { alert("خطأ في الارتباط: رفض الإطار الرئيسي تحديث الهوية."); }
        setIsSaving(false);
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="neural-loader"></div>
            <p className="micro-label" style={{ marginLeft: '1rem', letterSpacing: '2px' }}>جاري مزامنة شبكة الهويات...</p>
        </div>
    );

    return (
        <div className="page-container fade-in" style={{ padding: '1rem' }}>
            <div className="accounts-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Network identities - Top scroll on mobile */}
                <div className="network-directory-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Globe size={16} color="var(--primary)" />
                        <p className="micro-label" style={{ color: 'var(--primary)', letterSpacing: '1px' }}>دليل الشبكة العصبية</p>
                    </div>
                    <div className="card custom-scrollbar" style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        overflowX: 'auto', 
                        gap: '0.75rem', 
                        padding: '0.75rem', 
                        background: 'rgba(10,11,19,0.5)',
                        border: '1px solid var(--border-dim)' 
                    }}>
                        {users.map(u => (
                            <div
                                key={u.id}
                                onClick={() => setSelectedId(u.id)}
                                style={{
                                    cursor: 'pointer',
                                    minWidth: '60px',
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    borderRadius: '12px',
                                    background: selectedId === u.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                    border: `1px solid ${selectedId === u.id ? 'var(--primary)' : 'transparent'}`,
                                    transition: '0.2s'
                                }}
                            >
                                <div style={{ width: '45px', height: '45px', margin: '0 auto', borderRadius: '10px', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', overflow: 'hidden', fontSize: '14px' }}>
                                    {u.photoUrl ? <img src={u.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : u.username?.charAt(0).toUpperCase()}
                                </div>
                                <span className="mono" style={{ fontSize: '0.6rem', display: 'block', marginTop: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Identity Detailed View */}
                <div className="identity-detail-section">
                    <div className="card card-glow" style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px', border: '1px solid var(--border-bright)', paddingBottom: '2rem' }}>
                        <div className="scanline"></div>
                        <div style={{ height: '120px', background: `linear-gradient(to bottom, ${activeUser?.color}22, transparent)`, position: 'absolute', top: 0, left: 0, right: 0 }}></div>
                        
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Activity size={12} color={activeUser?.color} className="pulse" />
                            <p className="micro-label" style={{ color: activeUser?.color, fontSize: '0.6rem' }}>المحطة_نشطة</p>
                        </div>

                        <div style={{ padding: '3rem 1.25rem 1rem', position: 'relative' }}>
                            {/* Profile Header */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2.5rem' }}>
                                <IdentityPulseDisk url={isMe ? editPhoto : activeUser.photoUrl} name={activeUser.username} size={130} color={isMe ? editColor : activeUser.color} />
                                <div style={{ marginTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                        <Fingerprint size={14} color="var(--primary)" />
                                        <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.6rem' }}>نمط التعرف الإدراكي</p>
                                    </div>
                                    <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', wordBreak: 'break-all' }}>{activeUser.username.toUpperCase()}</h1>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                                        <div>
                                            <p className="micro-label" style={{ opacity: 0.4, fontSize: '0.55rem' }}>قطاع_الاتصال</p>
                                            <p className="mono" style={{ fontSize: '0.7rem' }}>REGION_01_SOL</p>
                                        </div>
                                        <div style={{ width: '1px', background: 'var(--border-dim)', height: '20px' }}></div>
                                        <div>
                                            <p className="micro-label" style={{ opacity: 0.4, fontSize: '0.55rem' }}>معرف_المصادقة</p>
                                            <p className="mono" style={{ fontSize: '0.7rem' }}>{activeUser.id.substring(0, 8).toUpperCase()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isMe ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', padding: '1.25rem' }}>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                                <Cpu size={12} color="var(--primary)" />
                                                <p className="micro-label">تعديل مفتاح الهوية</p>
                                            </div>
                                            <input
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="mono"
                                                style={{ fontSize: '1rem', padding: '0.8rem', width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-bright)', borderRadius: '8px', color: 'white' }}
                                            />
                                        </div>
                                        
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                                <Zap size={12} color="var(--warning)" />
                                                <p className="micro-label">طيف تردد الهالة</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <input
                                                    type="color"
                                                    value={editColor}
                                                    onChange={e => setEditColor(e.target.value)}
                                                    style={{ height: '45px', width: '45px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                                />
                                                <span className="mono" style={{ fontSize: '0.9rem', opacity: 0.6 }}>{editColor.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', padding: '1.5rem', textAlign: 'center' }}>
                                        <label style={{ cursor: 'pointer' }}>
                                            <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                                <Upload size={24} />
                                            </div>
                                            <p className="micro-label" style={{ fontSize: '0.65rem' }}>رفع بيانات بيومترية جديدة</p>
                                            <p className="mono" style={{ fontSize: '0.6rem', opacity: 0.4 }}>الحجم الأقصى: 100KB</p>
                                            <input type="file" hidden onChange={handlePhotoUpload} accept="image/*" />
                                        </label>
                                    </div>

                                    <button onClick={handleSave} disabled={isSaving} className="primary" style={{ padding: '1.25rem', fontSize: '0.9rem', width: '100%' }}>
                                        {isSaving ? 'جاري أرشفة الحالة...' : 'تأفيذ بروتوكول مزامنة الهوية'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-dim)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <Briefcase size={16} color="var(--primary)" />
                                            <p className="micro-label" style={{ fontSize: '0.65rem' }}>محفظة الأسهم</p>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {activeUser.ownedCompanies?.length > 0 ? activeUser.ownedCompanies.map((c: any) => (
                                                <div key={c.id} style={{ padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: '6px' }}>
                                                    <span className="mono" style={{ fontSize: '0.65rem' }}>{c.name.toUpperCase()}</span>
                                                </div>
                                            )) : <p className="mono" style={{ fontSize: '0.7rem', opacity: 0.3 }}>لا توجد أصول مكتشفة</p>}
                                        </div>
                                    </div>

                                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-dim)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <ShieldAlert size={16} color="var(--danger)" />
                                            <p className="micro-label" style={{ fontSize: '0.65rem' }}>مخزون الذخيرة</p>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {activeUser.ownedWeapons?.length > 0 ? activeUser.ownedWeapons.map((w: any, idx: number) => (
                                                <div key={idx} style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}>
                                                    <span className="mono" style={{ color: 'var(--danger)', fontSize: '0.65rem' }}>{w.name} (x{w.quantity})</span>
                                                </div>
                                            )) : <p className="mono" style={{ fontSize: '0.7rem', opacity: 0.3 }}>لا توجد أسلحة</p>}
                                        </div>
                                    </div>

                                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-dim)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <PackageOpen size={16} color="var(--warning)" />
                                            <p className="micro-label" style={{ fontSize: '0.65rem' }}>مستودع الموارد</p>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {activeUser.resources ? Object.entries(activeUser.resources).map(([res, qty]: any) => (
                                                <div key={res} style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}>
                                                    <p className="micro-label" style={{ opacity: 0.5, fontSize: '0.55rem' }}>{res.toUpperCase()}</p>
                                                    <p className="mono" style={{ fontSize: '0.85rem', fontWeight: '900' }}>{formatNeuralCurrency(Number(qty))}</p>
                                                </div>
                                            )) : <p className="mono" style={{ fontSize: '0.7rem', opacity: 0.3 }}>المستودع فارغ</p>}
                                        </div>
                                    </div>

                                    {/* Sovereign Assets - Mobile Optimized */}
                                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-dim)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <Gem size={16} color="var(--primary)" />
                                            <p className="micro-label" style={{ fontSize: '0.65rem' }}>الأصول السيادية</p>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {activeUser?.possessions?.length > 0 ? activeUser.possessions.map((p: any, i: number) => (
                                                <div key={i} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-bright)', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                    <img src={p.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <p className="mono" style={{ fontSize: '0.75rem', margin: 0, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                                                        <p className="micro-label" style={{ fontSize: '0.55rem', opacity: 0.5 }}>{p.category}</p>
                                                    </div>
                                                </div>
                                            )) : <p className="mono" style={{ fontSize: '0.7rem', opacity: 0.3 }}>لا توجد أصول سيادية</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .custom-scrollbar::-webkit-scrollbar { height: 3px; width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; }
                
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 100px !important; }
                }
            `}</style>
        </div>
    );
};