import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TerminalProvider } from './context/TerminalContext';
import { formatNeuralCurrency } from './utils/formatters';

import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Transfers } from './pages/Transfers';
import { Companies } from './pages/Companies';
import { Weapons } from './pages/Weapons';
import { Accounts } from './pages/Accounts';
import { Chat } from './pages/Chat';
import { Trading } from './pages/Trading';
import { Map } from './pages/Map';
import { Loot } from './pages/Loot';
import { Loans } from './pages/Loans';
import { StorePage } from './pages/Store';
import { Games } from './pages/Games';
import { Marketplace } from './pages/Marketplace';
import { Council } from './pages/Council';
import { News } from './pages/News';


import {
  LayoutDashboard, ArrowRightLeft, Building2, LogOut, Sword,
  Users, MessageSquare, TrendingUp, Map as MapIcon,
  Pickaxe, Landmark, Store, Trophy, Gem, Zap, Crown, ShieldAlert, Newspaper
} from 'lucide-react';

const EMERGENCY_MODE = true;
const EMERGENCY_MSG = "تم اكتشاف عطل داخلي في صفحة تحويلات وباقي صفحات. المرجو انتضار التصحيح ورابط الجديد.";


import React from 'react';

const navLinks = [
  { path: '/', icon: <LayoutDashboard size={18} />, label: 'المركز العصبي' },
  { path: '/council', icon: <Crown size={18} />, label: 'المجلس' },
  { path: '/map', icon: <MapIcon size={18} />, label: 'شبكة الحرب' },
  { path: '/news', icon: <Newspaper size={18} />, label: 'أخبار النظام' },
  { path: '/loot', icon: <Pickaxe size={18} />, label: 'الموارد' },
  { path: '/store', icon: <Store size={18} />, label: 'المؤسسة' },
  { path: '/trading', icon: <TrendingUp size={18} />, label: 'البورصة' },
  { path: '/loans', icon: <Landmark size={18} />, label: 'مركز الائتمان' },
  { path: '/companies', icon: <Building2 size={18} />, label: 'الشركات' },
  { path: '/weapons', icon: <Sword size={18} />, label: 'المخزن' },
  { path: '/marketplace', icon: <Gem size={18} />, label: 'السوق الحر' },
  { path: '/games', icon: <Trophy size={18} />, label: 'المنطقة' },
  { path: '/transfers', icon: <ArrowRightLeft size={18} />, label: 'التحويلات' },
  { path: '/accounts', icon: <Users size={18} />, label: 'الشبكة' },
  { path: '/chat', icon: <MessageSquare size={18} />, label: 'الاتصالات' },
];

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      <aside className={`app-sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-box">
            <Zap size={18} className="logo-spark" />
          </div>
          <Link to="/" className="sidebar-logo text-gradient" onClick={onClose}>K2_SOV</Link>
          <button className="mobile-close-btn" onClick={onClose}>
            <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="micro-label" style={{ padding: '0 1rem', marginBottom: '0.5rem', opacity: 0.4 }}>القائمة الرئيسية</p>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="link-icon">{link.icon}</span>
              <span className="link-text">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => { logout(); onClose(); }} className="logout-btn">
            <LogOut size={14} />
            <span>إنهاء الجلسة</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="mobile-menu-trigger" onClick={onMenuClick}>
          <LayoutDashboard size={18} />
          <span className="micro-label">القائمة</span>
        </button>
        <div className="system-status desktop-only">
          <div className="status-dot pulse"></div>
          <span className="micro-label">النظام_نشط</span>
        </div>
        <button className="desktop-menu-trigger" onClick={onMenuClick}>
          <LayoutDashboard size={16} />
          <span className="micro-label">الأدلة</span>
        </button>
      </div>

      <div className="header-right">
        <div className="wealth-hud">
          <div className="wealth-label micro-label">السيولة_الصافية</div>
          <div className="wealth-value mono">${formatNeuralCurrency(user?.balance || 0)}</div>
        </div>

        <Link to="/accounts" className="avatar-uplink">
          {user?.photoUrl ? (
            <img src={user.photoUrl} className="user-avatar" style={{ borderColor: user.color }} alt="" />
          ) : (
            <div className="user-avatar" style={{ backgroundColor: user?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '12px' }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="avatar-ring" style={{ borderColor: user?.color }}></div>
        </Link>
      </div>
    </header>
  );
};

const BottomNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const location = useLocation();
  const mobileLinks = [
    { path: '/', icon: <LayoutDashboard size={22} /> },
    { path: '/map', icon: <MapIcon size={22} /> },
    { path: '/store', icon: <Store size={22} /> },
    { path: '/chat', icon: <MessageSquare size={22} /> },
  ];

  return (
    <nav className="app-bottom-nav">
      {mobileLinks.map(link => (
        <Link
          key={link.path}
          to={link.path}
          className={`bottom-link ${location.pathname === link.path ? 'active' : ''}`}
        >
          {link.icon}
          <div className="bottom-indicator"></div>
        </Link>
      ))}
      <button className="bottom-link" onClick={onMenuClick}>
        <Users size={22} />
        <span className="micro-label" style={{ fontSize: '7px', marginTop: '2px' }}>المزيد</span>
      </button>
    </nav>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="neural-loader">
          <div className="circuit-1"></div>
          <div className="circuit-2"></div>
        </div>
        <p className="micro-label" style={{ marginTop: '2rem', letterSpacing: '0.1em' }}>جاري الاتصال بالنظام العصبي...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return children;
};

const Layout = ({ children }: { children: React.ReactElement }) => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <PrivateRoute>
      <div className={`app-layout ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
        <div className="bg-glitch"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="app-content-wrapper">
          <Header onMenuClick={toggleSidebar} />
          <main className="app-main">
            {children}
          </main>
          <BottomNav onMenuClick={toggleSidebar} />
        </div>
      </div>
    </PrivateRoute>
  );
};

function App() {
  if (EMERGENCY_MODE) {
  return (
    <div className="emergency-overlay">
      <div className="scanlines"></div>
      
      <div className="warning-bar top">
        {Array(10).fill(" خطأ_حرج // تم_رفض_الوصول // ").map((t, i) => <span key={i}>{t}</span>)}
      </div>

      <div className="emergency-content">
        <div className="glitch-wrapper">
          <ShieldAlert size={100} className="emergency-icon" />
          <h1 className="glitch-text" data-text="توقف_النظام">توقف_النظام</h1>
        </div>

        <div className="terminal-box">
          <div className="terminal-header">
            <div className="dot red"></div>
            <div className="dot yellow"></div>
            <div className="dot green"></div>
            <span className="terminal-title">سجل_تحذير_مشفر</span>
          </div>
          <div className="terminal-body">
            <p className="error-code">رمز الخطأ: 0x000000000F</p>
            <p className="main-msg">{EMERGENCY_MSG}</p>
            <div className="loading-bar-container">
              <div className="loading-bar"></div>
            </div>
            <p className="flicker-text">إعادة إنشاء الرابط العصبي...</p>
          </div>
        </div>
      </div>

      <div className="warning-bar bottom">
        {Array(10).fill(" بروتوكول_88_نشط // مصدر_مجهول // ").map((t, i) => <span key={i}>{t}</span>)}
      </div>

      <style>{`
        .emergency-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #0a0000;
          color: #ff0000;
          font-family: 'JetBrains Mono', monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .scanlines {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06));
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
        }
        .warning-bar {
          position: absolute;
          background: #ff0000;
          color: #000;
          white-space: nowrap;
          padding: 5px 0;
          font-weight: 900;
          font-size: 0.7rem;
          width: 100%;
          overflow: hidden;
          display: flex;
        }
        .top { top: 0; }
        .bottom { bottom: 0; }
        .emergency-content { text-align: center; z-index: 10; padding: 15px; width: 100%; }
        .glitch-text { font-size: 2.5rem; font-weight: 900; position: relative; text-shadow: 2px 0 red, -2px 0 blue; animation: glitch 0.3s infinite; margin-top: 1rem; }
        .terminal-box { background: rgba(40, 0, 0, 0.4); border: 1px solid #ff0000; box-shadow: 0 0 20px rgba(255,0,0,0.2); width: 100%; max-width: 90%; margin: 2rem auto; text-align: left; direction: rtl; }
        .terminal-header { background: #ff0000; padding: 5px 10px; display: flex; align-items: center; gap: 8px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #000; }
        .terminal-title { color: #000; font-size: 0.6rem; font-weight: bold; margin-right: auto; }
        .terminal-body { padding: 1rem; }
        .error-code { font-size: 0.7rem; opacity: 0.7; margin-bottom: 8px; }
        .main-msg { font-size: 1rem; line-height: 1.4; color: #fff; }
        .loading-bar-container { height: 3px; background: rgba(255,0,0,0.2); margin: 15px 0; position: relative; overflow: hidden; }
        .loading-bar { position: absolute; width: 40%; height: 100%; background: #ff0000; animation: loading 2s infinite linear; }
        @keyframes glitch { 0% { transform: translate(0) } 20% { transform: translate(-2px, 2px) } 40% { transform: translate(-2px, -2px) } 60% { transform: translate(2px, 2px) } 80% { transform: translate(2px, -2px) } 100% { transform: translate(0) } }
        @keyframes loading { from { right: -50%; } to { right: 100%; } }
        .flicker-text { font-size: 0.6rem; animation: flicker 0.5s infinite; opacity: 0.5; }
        @keyframes flicker { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.1; } }
      `}</style>
    </div>
  );
}

  return (
    <AuthProvider>
      <TerminalProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/transfers" element={<Layout><Transfers /></Layout>} />
            <Route path="/companies" element={<Layout><Companies /></Layout>} />
            <Route path="/weapons" element={<Layout><Weapons /></Layout>} />
            <Route path="/accounts" element={<Layout><Accounts /></Layout>} />
            <Route path="/chat" element={<Layout><Chat /></Layout>} />
            <Route path="/news" element={<Layout><News /></Layout>} />
            <Route path="/trading" element={<Layout><Trading /></Layout>} />
            <Route path="/map" element={<Layout><Map /></Layout>} />
            <Route path="/loot" element={<Layout><Loot /></Layout>} />
            <Route path="/loans" element={<Layout><Loans /></Layout>} />
            <Route path="/store" element={<Layout><StorePage /></Layout>} />
            <Route path="/games" element={<Layout><Games /></Layout>} />
            <Route path="/council" element={<Layout><Council /></Layout>} />
            <Route path="/marketplace" element={<Layout><Marketplace /></Layout>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>

        <style>{`
        :root {
            --sidebar-width: 260px;
            --header-height: 64px;
        }

        .app-layout {
          display: flex;
          min-height: 100vh;
          background: #03040b;
          overflow-x: hidden;
          width: 100%;
        }
        
        .app-content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding-left: var(--sidebar-width);
          transition: all 0.3s ease;
          position: relative;
        }
        
        .app-layout.sidebar-closed .app-content-wrapper {
          padding-left: 0;
        }
        
        /* SIDEBAR */
        .app-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: rgba(8, 9, 15, 0.98);
          backdrop-filter: blur(20px);
          border-right: 1px solid var(--border-bright);
          display: flex;
          flex-direction: column;
          z-index: 1001;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(4px);
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }

        .sidebar-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        
        .sidebar-header {
          padding: 1.25rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .mobile-close-btn {
            display: none;
            margin-left: auto;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-muted);
            padding: 0.4rem;
            border-radius: 8px;
        }

        .logo-box {
            width: 28px;
            height: 28px;
            background: var(--primary);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 15px var(--primary-glow);
        }
        
        .sidebar-logo {
          font-size: 1rem;
          font-weight: 900;
          text-decoration: none;
          letter-spacing: 0.1em;
          color: #fff;
        }
        
        .sidebar-nav {
          flex: 1;
          padding: 0.75rem 0.5rem;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.75rem;
          text-decoration: none;
          color: var(--text-muted);
          border-radius: 10px;
          margin-bottom: 0.2rem;
          transition: 0.2s;
          font-size: 0.8rem;
        }
        
        .sidebar-link.active {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-dim);
        }
        
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--danger);
          padding: 0.6rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.75rem;
        }
        
        /* HEADER */
        .app-header {
          height: var(--header-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          background: rgba(3, 4, 11, 0.7);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid var(--border-dim);
          position: sticky;
          top: 0;
          z-index: 900;
        }

        .mobile-menu-trigger {
            display: none;
            background: var(--surface-soft);
            border: 1px solid var(--border-bright);
            padding: 0.4rem 0.6rem;
            color: var(--primary);
            gap: 0.4rem;
            border-radius: 10px;
            align-items: center;
        }

        .wealth-label { color: var(--primary); font-size: 0.55rem; }
        .wealth-value { font-size: 1.1rem; font-weight: 900; color: white; }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1.5px solid var(--surface-soft);
          object-fit: cover;
        }

        /* BOTTOM NAV */
        .app-bottom-nav {
          display: none;
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(10, 11, 19, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.4rem;
          border-radius: 20px;
          z-index: 999;
          width: 90%;
          max-width: 400px;
          justify-content: space-around;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }
        
        .bottom-link {
          flex: 1;
          height: 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          position: relative;
          background: transparent;
          border: none;
        }
        
        .bottom-link.active { color: var(--primary); }

        .bottom-indicator {
            position: absolute;
            bottom: 2px;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: var(--primary);
            opacity: 0;
        }

        .bottom-link.active .bottom-indicator { opacity: 1; box-shadow: 0 0 8px var(--primary); }
        
        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .app-sidebar { transform: translateX(-100%); width: 280px; }
          .app-sidebar.mobile-open { transform: translateX(0); }
          .app-content-wrapper { padding-left: 0 !important; }
          .app-bottom-nav { display: flex; }
          .mobile-close-btn { display: flex; }
          .mobile-menu-trigger { display: flex; }
          .desktop-only, .desktop-menu-trigger { display: none !important; }
          .app-main { padding: 1rem; padding-bottom: 90px; }
          .wealth-value { font-size: 0.95rem; }
          .header-right { gap: 0.75rem; }
          .app-header { padding: 0 1rem; height: 56px; }
        }

        @media (max-width: 414px) {
            .wealth-hud { display: flex; flex-direction: column; align-items: flex-end; }
            .sidebar-logo { font-size: 0.9rem; }
            .sidebar-link { padding: 0.55rem 0.6rem; font-size: 0.75rem; }
        }

        .loading-screen {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #03040b;
          text-align: center;
          padding: 20px;
        }
      `}</style>
      </TerminalProvider>
    </AuthProvider>
  );
}

export default App;
