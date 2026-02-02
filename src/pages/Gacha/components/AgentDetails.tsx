import { 
    ArrowLeft, Target, Shield, Ghost, Clock, 
    TrendingUp, MessageSquare, X, Unlock 
} from 'lucide-react';
import { formatNeuralCurrency } from '../../../utils/formatters';
import type { Agent, AgentState, ContractStatus } from '../types';

interface AgentDetailsProps {
    agent: Agent;
    state?: AgentState;
    isOwner: boolean;
    contractStatus: ContractStatus | null;
    onBack: () => void;
    onPurchase: () => void;
    onSteal: () => void;
    onRenew: () => void;
    onAbandon: () => void;
    onChat: () => void;
}

export const AgentDetails = ({
    agent,
    state,
    isOwner,
    contractStatus,
    onBack,
    onPurchase,
    onSteal,
    onRenew,
    onAbandon,
    onChat
}: AgentDetailsProps) => {
    const price = state?.currentPrice || agent.basePrice;
    const stealCost = price * 2;
    const hasOwner = !!state?.ownerId;

    return (
        <div className="agent-details fade-in">
            <button className="agent-details__back" onClick={onBack}>
                <ArrowLeft size={18} />
                العودة للرادار
            </button>

            <div className="agent-details__layout">
                {/* Visual Column */}
                <div className="agent-details__visual">
                    <div className="agent-details__poster v-clip">
                        <img src={agent.image} alt={agent.name} />
                        <div className="agent-details__poster-overlay" />
                        <span 
                            className="agent-details__poster-rarity v-clip-sm"
                            style={{ backgroundColor: agent.color }}
                        >
                            {agent.rarityName}
                        </span>
                    </div>

                    <div className="agent-details__specs">
                        <div className="agent-details__spec v-clip-sm">
                            <Target className="agent-details__spec-icon" size={20} color="#ff4655" />
                            <div className="agent-details__spec-content">
                                <span className="agent-details__spec-label">هجوم عصبي</span>
                                <div className="agent-details__spec-bar">
                                    <div 
                                        className="agent-details__spec-fill" 
                                        style={{ 
                                            width: `${agent.attack}%`, 
                                            backgroundColor: agent.color 
                                        }} 
                                    />
                                </div>
                            </div>
                            <span className="agent-details__spec-value mono">{agent.attack}</span>
                        </div>

                        <div className="agent-details__spec v-clip-sm">
                            <Shield className="agent-details__spec-icon" size={20} color="#3b82f6" />
                            <div className="agent-details__spec-content">
                                <span className="agent-details__spec-label">درع تشفير</span>
                                <div className="agent-details__spec-bar">
                                    <div 
                                        className="agent-details__spec-fill" 
                                        style={{ 
                                            width: `${agent.defense}%`, 
                                            backgroundColor: '#3b82f6' 
                                        }} 
                                    />
                                </div>
                            </div>
                            <span className="agent-details__spec-value mono">{agent.defense}</span>
                        </div>
                    </div>
                </div>

                {/* Intel Column */}
                <div className="agent-details__intel">
                    <h1 className="agent-details__name">{agent.name}</h1>
                    <p className="agent-details__title" style={{ color: agent.color }}>
                        {agent.title}
                    </p>

                    <div className="agent-details__bio">
                        <h4 className="agent-details__bio-label">
                            <Ghost size={14} />
                            سجل العمليات الاستخباراتية
                        </h4>
                        <p className="agent-details__bio-text">{agent.desc}</p>
                    </div>

                    <div className="agent-details__prices">
                        <div className="agent-details__price-card v-clip-sm">
                            <span className="agent-details__price-card-label">السعر الحالي</span>
                            <span className="agent-details__price-card-value text-gradient mono">
                                ${formatNeuralCurrency(price)}
                            </span>
                        </div>
                        <div className="agent-details__price-card v-clip-sm">
                            <span className="agent-details__price-card-label">الربح اليومي</span>
                            <span className="agent-details__price-card-value agent-details__price-card-value--yield mono">
                                +${formatNeuralCurrency(agent.dailyYield)}
                            </span>
                        </div>
                    </div>

                    <div className="agent-details__ownership v-clip-sm">
                        <div className="agent-details__ownership-row">
                            <span className="agent-details__ownership-label">المالك الحالي:</span>
                            <span className="agent-details__ownership-value mono">
                                {state?.ownerName || "النظام السيادي"}
                            </span>
                        </div>
                        <div className="agent-details__ownership-row">
                            <span className="agent-details__ownership-label">عدد التحويلات:</span>
                            <span className="agent-details__ownership-value mono">
                                {state?.transfers || 0}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="agent-details__actions">
                        {!hasOwner ? (
                            <button className="btn btn--primary btn--full v-clip" onClick={onPurchase}>
                                <Unlock size={18} />
                                بدء بروتوكول الاستحواذ
                            </button>
                        ) : isOwner ? (
                            <>
                                <div className={`agent-details__contract v-clip-sm ${
                                    contractStatus?.urgent ? 'agent-details__contract--urgent' : ''
                                }`}>
                                    <Clock size={18} className="agent-details__contract-icon" />
                                    <span className="agent-details__contract-text mono">
                                        {contractStatus?.text}
                                    </span>
                                </div>
                                <div className="agent-details__action-grid">
                                    <button className="btn btn--secondary v-clip" onClick={onRenew}>
                                        <TrendingUp size={16} />
                                        تجديد العقد
                                    </button>
                                    <button className="btn btn--chat v-clip" onClick={onChat}>
                                        <MessageSquare size={16} />
                                        ارتباط عصبي
                                    </button>
                                    <button className="btn btn--danger v-clip" onClick={onAbandon}>
                                        <X size={16} />
                                        إنهاء الخدمة
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button className="btn btn--steal btn--full v-clip" onClick={onSteal}>
                                <Target size={18} />
                                اختطاف الوكيل (${formatNeuralCurrency(stealCost)})
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
