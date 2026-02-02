import { ArrowLeft, Package } from 'lucide-react';
import { AgentCard } from './AgentCard';
import type { Agent, OwnedAgent, ContractStatus } from '../types';

interface InventoryProps {
    ownedAgents: OwnedAgent[];
    allAgents: Agent[];
    isViewingOther: boolean;
    viewingUsername?: string;
    getContractStatus?: (id: string) => ContractStatus | null;
    onAgentClick: (id: string) => void;
    onBack: () => void;
    onBrowse: () => void;
}

export const Inventory = ({
    ownedAgents,
    allAgents,
    isViewingOther,
    viewingUsername,
    getContractStatus,
    onAgentClick,
    onBack,
    onBrowse
}: InventoryProps) => {
    const agents = ownedAgents.map(oa => {
        const agent = allAgents.find(a => a.id === oa.id);
        return agent ? { ...agent, contract: getContractStatus?.(oa.id) } : null;
    }).filter(Boolean) as (Agent & { contract?: ContractStatus | null })[];

    return (
        <div className="inventory fade-in">
            <div className="inventory__header">
                <button className="inventory__back" onClick={onBack}>
                    <ArrowLeft size={18} />
                    العودة
                </button>
                <h2 className="inventory__title">
                    {isViewingOther ? `أصول ${viewingUsername}` : "مركز الأصول الخاصة"}
                </h2>
            </div>

            {agents.length === 0 ? (
                <div className="inventory__empty v-clip">
                    <Package size={48} className="inventory__empty-icon" />
                    <h3>لا توجد أصول نشطة</h3>
                    <p>لم يتم العثور على أي وكلاء مرتبطين بهذا الحساب حالياً.</p>
                    {!isViewingOther && (
                        <button className="btn btn--primary v-clip" onClick={onBrowse}>
                            استكشاف الميدان
                        </button>
                    )}
                </div>
            ) : (
                <div className="agents-grid">
                    {agents.map(agent => (
                        <div key={agent.id} className="inventory__item">
                            <AgentCard
                                agent={agent}
                                onClick={() => onAgentClick(agent.id)}
                            />
                            {agent.contract && (
                                <div className={`inventory__contract-badge ${agent.contract.urgent ? 'urgent' : ''}`}>
                                    {agent.contract.text}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
