import { Lock, Unlock, Zap } from 'lucide-react';
import { formatNeuralCurrency } from '../../../utils/formatters';
import type { Agent, AgentState } from '../types';

interface AgentCardProps {
    agent: Agent;
    state?: AgentState;
    onClick: () => void;
}

export const AgentCard = ({ agent, state, onClick }: AgentCardProps) => {
    const isOwned = !!state?.ownerId;
    const price = state?.currentPrice || agent.basePrice;

    return (
        <div 
            className={`agent-card agent-card--${agent.rarity} v-clip`}
            onClick={onClick}
        >
            <div className="agent-card__glow" style={{ backgroundColor: agent.color }} />
            
            <div className="agent-card__header">
                <span className="agent-card__rarity v-clip-sm">
                    {agent.rarityName}
                </span>
                <span className={`agent-card__owner-badge ${
                    isOwned ? 'agent-card__owner-badge--locked' : 'agent-card__owner-badge--available'
                }`}>
                    {isOwned ? <><Lock size={10} /> {state?.ownerName}</> : <><Unlock size={10} /> متاح</>}
                </span>
            </div>

            <div className="agent-card__image">
                <img src={agent.image} alt={agent.name} loading="lazy" />
                <div className="agent-card__image-overlay" />
            </div>

            <div className="agent-card__body">
                <h3 className="agent-card__name">{agent.name}</h3>
                <p className="agent-card__title" style={{ color: agent.color }}>
                    {agent.title}
                </p>
            </div>

            <div className="agent-card__footer">
                <div className="agent-card__price">
                    <span className="agent-card__price-label">القيمة</span>
                    <span className="agent-card__price-value mono">
                        ${formatNeuralCurrency(price)}
                    </span>
                </div>
                <div className="agent-card__action-icon v-clip-sm">
                    <Zap size={18} />
                </div>
            </div>
        </div>
    );
};