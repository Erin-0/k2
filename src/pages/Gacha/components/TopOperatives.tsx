import { formatNeuralCurrency } from '../../../utils/formatters';

interface TopOperativesProps {
    users: any[];
    onUserClick: (id: string) => void;
}

export const TopOperatives = ({ users, onUserClick }: TopOperativesProps) => {
    return (
        <section className="top-operatives">
            <div className="section-header">
                <span className="section-header__icon">🏆</span>
                <h2 className="section-header__title">كبار المتداولين</h2>
            </div>
            <div className="top-operatives__grid">
                {users.map((user, index) => (
                    <div 
                        key={user.id} 
                        className={`top-card top-card--rank-${index + 1} v-clip`}
                        onClick={() => onUserClick(user.id)}
                    >
                        <div className="top-card__rank">{index + 1}</div>
                        <div className="top-card__content">
                            <div className="top-card__avatar v-clip-sm">
                                <img src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`} alt={user.username} />
                                <div className="top-card__avatar-status" />
                            </div>
                            <div className="top-card__info">
                                <h4 className="top-card__username">{user.username}</h4>
                                <div className="top-card__balance text-gradient mono">
                                    ${formatNeuralCurrency(user.balance)}
                                </div>
                            </div>
                        </div>
                        <div className="top-card__stats">
                            <div className="top-card__stat">
                                <span className="top-card__stat-label">الأصول</span>
                                <span className="top-card__stat-value mono">{user.ownedAgents?.length || 0}</span>
                            </div>
                            <div className="top-card__stat">
                                <span className="top-card__stat-label">الرتبة</span>
                                <span className="top-card__stat-value">مفوض</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
