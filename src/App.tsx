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
import { GachaSystem } from './pages/Gacha/GachaSystem';
import { Multiverse } from './pages/uni';
import {
  LayoutDashboard, MapIcon, TrendingUp, Building2, Sword, ArrowRightLeft, Users, MessageSquare, LogOut,
  Pickaxe, Landmark, Store, Trophy, Gem, Zap, Crown, ShieldAlert, Newspaper, Menu, X, Target, Globe
} from 'lucide-react';

const EMERGENCY_MODE = false;
const EMERGENCY_MSG = "تم اكتشاف تهديد خطير: أوقف العمليات فوراً. اتصل بالإدارة.";


import React, { useState } from 'react';

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
  { path: '/gacha', icon: <Target size={18} />, label: 'بروتوكول الوكلاء' },
  { path: '/multiverse', icon: <Globe size={18} />, label: 'التصنيف الكوني' },
  { path: '/chat', icon: <MessageSquare size={18} />, label: 'الاتصالات' },
];

const Sidebar = ({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={toggle}></div>
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-box">
              <Zap size={20} className="logo-spark" />
            </div>
            <span className="sidebar-logo text-gradient">K2_SOV</span>
          </div>
          <button className="sidebar-mobile-toggle" onClick={toggle}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <p className="micro-label nav-label">العمليات السيادية</p>
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={() => { if (window.innerWidth < 1024) toggle(); }}
              >
                <span className="link-icon">{link.icon}</span>
                <span className="link-text">{link.label}</span>
                {location.pathname === link.path && <div className="active-glow"></div>}
              </Link>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
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
        <button className="menu-trigger" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div className="system-status">
          <div className="status-dot pulse"></div>
          <span className="status-text mono">SYSTEM_ONLINE</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label micro-label">NET_WORTH</span>
            <span className="stat-value mono">${formatNeuralCurrency(user?.balance || 0)}</span>
          </div>
        </div>

        <Link to="/accounts" className="header-profile">
          <div className="profile-info">
            <span className="profile-name mono">{user?.username}</span>
            <span className="profile-rank micro-label">ELITE_OPERATIVE</span>
          </div>
          <div className="avatar-frame" style={{ borderColor: user?.color }}>
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="user-avatar" />
            ) : (
              <div className="user-avatar placeholder" style={{ backgroundColor: user?.color }}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
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
        <p className="micro-label" style={{ marginTop: '2rem', letterSpacing: '0.1em', color: 'var(--primary)' }}>INITIALIZING NEURAL LINK...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return children;
};

const Layout = ({ children }: { children: React.ReactElement }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <PrivateRoute>
      <div className={`app-layout ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <Sidebar isOpen={isSidebarOpen} toggle={() => setSidebarOpen(!isSidebarOpen)} />
        <div className="app-main-container">
          <Header onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
          <main className="app-content content-fade-in">
            {children}
          </main>
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
            <Route path="/gacha" element={<Layout><GachaSystem /></Layout>} />
            <Route path="/multiverse" element={<Layout><Multiverse /></Layout>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>

        <style>{`
        :root {
            --sidebar-width: 280px;
            --sidebar-collapsed-width: 0px;
            --header-height: 70px;
            --sidebar-bg: rgba(6, 7, 12, 0.95);
            --sidebar-border: rgba(255, 255, 255, 0.08);
            --primary-glow: rgba(99, 102, 241, 0.2);
        }

        .app-layout {
          display: flex;
          min-height: 100vh;
          background: #03040b;
          color: white;
          overflow-x: hidden;
        }

        /* SIDEBAR PROFESSIONAL RAIL */
        .app-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: var(--sidebar-width);
          background: var(--sidebar-bg);
          backdrop-filter: blur(25px);
          border-right: 1px solid var(--sidebar-border);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 20px 0 50px rgba(0,0,0,0.5);
        }

        .sidebar-expanded .app-sidebar { transform: translateX(0); }
        .sidebar-collapsed .app-sidebar { transform: translateX(-100%); }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--sidebar-border);
        }

        .logo-section { display: flex; align-items: center; gap: 0.75rem; }
        .logo-box {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--primary), #4338ca);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px var(--primary-glow);
        }
        .sidebar-logo { font-size: 1.2rem; font-weight: 900; letter-spacing: 2px; }

        .sidebar-mobile-toggle { display: none; background: transparent; border: none; color: var(--text-muted); }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .sidebar-nav::-webkit-scrollbar { display: none; }

        .nav-label { padding: 0 1rem; margin-bottom: 1rem; opacity: 0.5; letter-spacing: 1px; }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          margin-bottom: 0.4rem;
          text-decoration: none;
          color: var(--text-muted);
          border-radius: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .sidebar-link:hover {
          background: rgba(255,255,255,0.03);
          color: white;
          padding-left: 1.25rem;
        }

        .sidebar-link.active {
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.15), transparent);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .active-glow {
          position: absolute;
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          background: var(--primary);
          filter: blur(15px);
          opacity: 0.5;
        }

        .sidebar-footer {
          padding: 1.5rem 1rem;
          border-top: 1px solid var(--sidebar-border);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.85rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          transition: 0.3s;
        }
        .logout-btn:hover { background: #ef4444; color: white; }

        /* MAIN CONTAINER */
        .app-main-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          transition: padding 0.4s ease;
        }

        .sidebar-expanded .app-main-container { padding-left: var(--sidebar-width); }
        .sidebar-collapsed .app-main-container { padding-left: 0; }

        /* HEADER */
        .app-header {
          height: var(--header-height);
          background: rgba(3, 4, 11, 0.8);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid var(--sidebar-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          position: sticky;
          top: 0;
          z-index: 900;
        }

        .menu-trigger {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--sidebar-border);
          color: white;
          padding: 0.5rem;
          border-radius: 10px;
          cursor: pointer;
        }

        .system-status { display: flex; align-items: center; gap: 0.75rem; margin-left: 1.5rem; }
        .status-text { font-size: 0.65rem; color: var(--primary); letter-spacing: 1px; }

        .header-stats { display: flex; gap: 2rem; margin-right: 2rem; }
        .stat-item { display: flex; flex-direction: column; align-items: flex-end; }
        .stat-label { font-size: 0.5rem; opacity: 0.5; }
        .stat-value { font-size: 1.1rem; font-weight: 900; color: white; }

        .header-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
          color: white;
          padding: 0.4rem;
          background: rgba(255,255,255,0.03);
          border-radius: 14px;
          border: 1px solid var(--sidebar-border);
        }

        .profile-info { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.8rem; }
        .profile-name { font-weight: 700; }
        .profile-rank { font-size: 0.55rem; color: var(--primary); }

        .avatar-frame {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 2px solid var(--primary);
          padding: 2px;
          overflow: hidden;
        }
        .user-avatar { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
        .user-avatar.placeholder { display: flex; align-items: center; justify-content: center; font-weight: 900; }

        .app-content { padding: 2rem; flex: 1; }

        .sidebar-overlay { display: none; }

        /* RESPONSIVE OVERRIDES */
        @media (max-width: 1024px) {
          .app-main-container { padding-left: 0 !important; }
          .app-sidebar { transform: translateX(-100%); width: 280px; }
          .app-sidebar.open { transform: translateX(0); }
          .sidebar-mobile-toggle { display: block; }
          .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 999; opacity: 0; visibility: hidden; transition: 0.3s; }
          .sidebar-overlay.active { opacity: 1; visibility: visible; }
          .header-stats, .profile-info { display: none; }
          .app-header { padding: 0 1rem; }
          .app-content { padding: 1rem; }
        }

        .content-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .loading-screen {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #03040b;
        }
      `}</style>
      </TerminalProvider>
    </AuthProvider>
  );
}

export default App;
