import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, doc, getDocs, query, orderBy, limit, onSnapshot, getDoc } from 'firebase/firestore';
import agentsData from '../../data/agents.json';

// Components
import { GachaNav } from './components/GachaNav';
import { TopOperatives } from './components/TopOperatives';
import { AgentCard } from './components/AgentCard';
import { AgentDetails } from './components/AgentDetails';
import { ChatInterface } from './components/ChatInterface';
import { Inventory } from './components/Inventory';
import { AlertModal } from './components/AlertModal';
import { LoadingScreen } from './components/LoadingScreen';

// Hooks
import { useAgentActions } from './hooks/useAgentActions';
import { useChat } from './hooks/useChat';

// Types & Styles
import type { Agent, AgentState, TabType, AlertState } from './types';
import './styles/gacha.css';

export const GachaSystem = () => {
    const { user, refreshUser } = useAuth();

    // Navigation & Selection
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [viewingUser, setViewingUser] = useState<any | null>(null);

    // Data
    const [agents] = useState<Agent[]>(agentsData as Agent[]);
    const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Alert State
    const [alert, setAlert] = useState<AlertState>({
        show: false,
        title: '',
        message: '',
        type: 'alert'
    });

    // Selected Agent
    const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

    // Custom Hooks
    const { handlePurchase, handleSteal, handleRenew, handleAbandon, getContractStatus } = useAgentActions({
        user,
        agentStates,
        refreshUser,
        showAlert: (title, message, onConfirm, type = 'alert') => {
            setAlert({ show: true, title, message, onConfirm, type });
        }
    });

    const {
        chatMessages,
        chatInput,
        isTyping,
        isExpanded,
        setIsExpanded,
        sendMessage,
        initializeChat,
        setChatInput
    } = useChat(selectedAgent);

    // Initialize Data
    useEffect(() => {
        const unsubAgents = onSnapshot(collection(db, 'agents_state'), (snap) => {
            const states: Record<string, AgentState> = {};
            snap.docs.forEach(doc => {
                states[doc.id] = doc.data() as AgentState;
            });
            setAgentStates(states);
            setLoading(false);
        });

        const fetchTopUsers = async () => {
            const q = query(collection(db, 'users'), orderBy('balance', 'desc'), limit(3));
            const snap = await getDocs(q);
            setTopUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchTopUsers();

        return () => unsubAgents();
    }, []);

    // Handlers
    const handleViewUser = async (userId: string) => {
        try {
            const uDoc = await getDoc(doc(db, 'users', userId));
            if (uDoc.exists()) {
                setViewingUser({ id: uDoc.id, ...uDoc.data() });
                setActiveTab('inventory');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectAgent = useCallback((agentId: string) => {
        setSelectedAgentId(agentId);
        setActiveTab('details');
    }, []);

    const handleOpenChat = useCallback(() => {
        if (selectedAgent) {
            initializeChat();
            setActiveTab('chat');
        }
    }, [selectedAgent, initializeChat]);

    const handleBackToHome = useCallback(() => {
        setActiveTab('home');
        setViewingUser(null);
    }, []);

    const closeAlert = useCallback(() => {
        setAlert(prev => ({ ...prev, show: false }));
    }, []);

    if (loading) {
        return (
            <div className="gacha-root">
                <LoadingScreen />
            </div>
        );
    }

    return (
        <div className="gacha-root">
            <GachaNav
                activeTab={activeTab}
                userBalance={user?.balance || 0}
                onTabChange={setActiveTab}
                onLogoClick={handleBackToHome}
                viewingUser={viewingUser}
            />

            <main className="gacha-container">
                {/* HOME VIEW */}
                {activeTab === 'home' && (
                    <div className="fade-in" style={{ paddingTop: '2rem' }}>
                        <TopOperatives
                            users={topUsers}
                            onUserClick={handleViewUser}
                        />

                        <section>
                            <div className="section-header">
                                <span className="section-header__icon">🔍</span>
                                <h2 className="section-header__title">تغذية الوكلاء المتصلة</h2>
                            </div>
                            <div className="agents-grid">
                                {agents.map(agent => (
                                    <AgentCard
                                        key={agent.id}
                                        agent={agent}
                                        state={agentStates[agent.id]}
                                        onClick={() => handleSelectAgent(agent.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* DETAILS VIEW */}
                {activeTab === 'details' && selectedAgent && (
                    <AgentDetails
                        agent={selectedAgent}
                        state={agentStates[selectedAgent.id]}
                        isOwner={agentStates[selectedAgent.id]?.ownerId === user?.id}
                        contractStatus={getContractStatus(selectedAgent.id)}
                        onBack={handleBackToHome}
                        onPurchase={() => handlePurchase(selectedAgent)}
                        onSteal={() => handleSteal(selectedAgent)}
                        onRenew={() => handleRenew(selectedAgent)}
                        onAbandon={() => handleAbandon(selectedAgent)}
                        onChat={handleOpenChat}
                    />
                )}

                {/* CHAT VIEW */}
                {activeTab === 'chat' && selectedAgent && (
                    <ChatInterface
                        agent={selectedAgent}
                        messages={chatMessages}
                        input={chatInput}
                        isTyping={isTyping}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setIsExpanded(!isExpanded)}
                        onInputChange={setChatInput}
                        onSend={sendMessage}
                        onClose={() => setActiveTab('details')}
                    />
                )}

                {/* INVENTORY VIEW */}
                {activeTab === 'inventory' && (
                    <Inventory
                        ownedAgents={(viewingUser?.ownedAgents || user?.ownedAgents) ?? []}
                        allAgents={agents}
                        isViewingOther={!!viewingUser}
                        viewingUsername={viewingUser?.username}
                        getContractStatus={viewingUser ? undefined : getContractStatus}
                        onAgentClick={handleSelectAgent}
                        onBack={handleBackToHome}
                        onBrowse={() => setActiveTab('home')}
                    />
                )}
            </main>

            {/* ALERT MODAL */}
            <AlertModal
                show={alert.show}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={() => {
                    alert.onConfirm?.();
                    closeAlert();
                }}
                onClose={closeAlert}
            />
        </div>
    );
};
