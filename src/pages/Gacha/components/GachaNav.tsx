import { Search, Shield, Target } from 'lucide-react';
import { formatNeuralCurrency } from '../../../utils/formatters';
import type { TabType } from '../types';

interface GachaNavProps {
    activeTab: TabType;
    userBalance: number;
    viewingUser: any | null;
    onTabChange: (tab: TabType) => void;
    onLogoClick: () => void;
}

export const GachaNav = ({ 
    activeTab, 
    userBalance, 
    viewingUser,
    onTabChange, 
    onLogoClick 
}: GachaNavProps) => {
    return (
        <nav className="gacha-nav">
            <div className="gacha-container gacha-nav__inner">
                <div className="gacha-nav__logo" onClick={onLogoClick}>
                    <div className="gacha-nav__logo-icon">
                        <Target size={20} />
                    </div>
                    <div className="gacha-nav__logo-text">
                        <span className="gacha-nav__logo-main">GACHA</span>
                        <span className="gacha-nav__logo-sub">PROTOCOL</span>
                    </div>
                </div>

                <div className="gacha-nav__links">
                    <button
                        className={`gacha-nav__link ${activeTab === 'home' ? 'gacha-nav__link--active' : ''}`}
                        onClick={() => onTabChange('home')}
                    >
                        <Search size={16} />
                        <span>الميدان</span>
                    </button>
                    <button
                        className={`gacha-nav__link ${activeTab === 'inventory' && !viewingUser ? 'gacha-nav__link--active' : ''}`}
                        onClick={() => onTabChange('inventory')}
                    >
                        <Shield size={16} />
                        <span>حقيبتي</span>
                    </button>
                </div>

                <div className="gacha-nav__balance">
                    <span className="gacha-nav__balance-label">الأصول السائلة</span>
                    <span className="gacha-nav__balance-value mono">
                        ${formatNeuralCurrency(userBalance)}
                    </span>
                </div>
            </div>
        </nav>
    );
};