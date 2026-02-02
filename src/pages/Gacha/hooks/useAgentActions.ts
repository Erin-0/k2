import { useCallback } from 'react';
import { db } from '../../../firebase';
import {
    doc, updateDoc, setDoc, increment,
    arrayUnion, serverTimestamp, runTransaction, Timestamp
} from 'firebase/firestore';
import { formatNeuralCurrency } from '../../../utils/formatters';
import type { Agent, AgentState, ContractStatus } from '../types';

interface UseAgentActionsProps {
    user: any;
    agentStates: Record<string, AgentState>;
    refreshUser: () => void;
    showAlert: (title: string, message: string, onConfirm?: () => void, type?: 'confirm' | 'alert') => void;
}

export const useAgentActions = ({ user, agentStates, refreshUser, showAlert }: UseAgentActionsProps) => {

    const getContractStatus = useCallback((agentId: string): ContractStatus | null => {
        const owned = user?.ownedAgents?.find((a: any) => a.id === agentId);
        if (!owned) return null;

        const purchasedAt = owned.purchasedAt instanceof Timestamp
            ? owned.purchasedAt.toDate()
            : (owned.purchasedAt || new Date());
        const days = owned.contractDays || 3;
        const expiry = new Date(purchasedAt.getTime() + (days * 86400000));
        const remainingMs = expiry.getTime() - Date.now();
        const remainingHours = Math.floor(remainingMs / 3600000);

        return {
            expired: remainingMs < 0,
            urgent: remainingHours < 24 && remainingHours > 0,
            remainingHours,
            text: remainingMs < 0
                ? "عقد منتهي"
                : `متبقي ${Math.floor(remainingHours / 24)} يوم و ${remainingHours % 24} ساعة`
        };
    }, [user]);

    const handlePurchase = useCallback(async (agent: Agent) => {
        if (!user) return;

        const state = agentStates[agent.id];
        const price = state?.currentPrice || agent.basePrice;

        if (user.balance < price) {
            showAlert("فشل الاستحواذ", "رصيدك غير كافٍ لإتمام عملية الارتباط العصبي.");
            return;
        }

        showAlert(
            "تأكيد الاستحواذ",
            `هل أنت متأكد من دفع ${formatNeuralCurrency(price)}$ مقابل الوكيل ${agent.name}؟`,
            async () => {
                try {
                    const userRef = doc(db, 'users', user.id);
                    const agentStateRef = doc(db, 'agents_state', agent.id);

                    await updateDoc(userRef, {
                        balance: increment(-price),
                        ownedAgents: arrayUnion({
                            id: agent.id,
                            purchasedAt: Timestamp.now(),
                            contractDays: 3
                        })
                    });

                    await setDoc(agentStateRef, {
                        ownerId: user.id,
                        ownerName: user.username,
                        currentPrice: price,
                        transfers: increment(1),
                        lastPurchasedAt: serverTimestamp(),
                        contractDays: 3
                    }, { merge: true });

                    showAlert("اكتمل الارتباط", `تمت مزامنة الوكيل ${agent.name} مع المركز العصبي الخاص بك بنجاح.`);
                    refreshUser();
                } catch (e) {
                    console.error(e);
                    showAlert("خطأ تقني", "فشلت عملية المزامنة. حاول مرة أخرى.");
                }
            },
            'confirm'
        );
    }, [user, agentStates, showAlert, refreshUser]);

    const handleSteal = useCallback(async (agent: Agent) => {
        if (!user) return;

        const state = agentStates[agent.id];
        if (!state?.ownerId) return;

        const stealCost = state.currentPrice * 2;

        if (user.balance < stealCost) {
            showAlert("فشل الاختطاف", "التكلفة تبلغ ضعف القيمة الحالية. رصيدك غير كافٍ.");
            return;
        }

        showAlert(
            "تحذير اختطاف",
            `سرقة ${agent.name} من ${state.ownerName} ستكلفك ${formatNeuralCurrency(stealCost)}$. هل تريد المتابعة؟`,
            async () => {
                try {
                    await runTransaction(db, async (transaction) => {
                        const userRef = doc(db, 'users', user.id);
                        const agentStateRef = doc(db, 'agents_state', agent.id);
                        const victimRef = doc(db, 'users', state.ownerId!);

                        const userDoc = await transaction.get(userRef);
                        const victimDoc = await transaction.get(victimRef);
                        const agentStateDoc = await transaction.get(agentStateRef);

                        if (!userDoc.exists()) throw "User not found";
                        const userData = userDoc.data();
                        if (userData.balance < stealCost) throw "Insufficient funds";

                        const currentAgentState = agentStateDoc.data() as AgentState;

                        // Update thief
                        transaction.update(userRef, {
                            balance: increment(-stealCost),
                            ownedAgents: arrayUnion({
                                id: agent.id,
                                purchasedAt: Timestamp.now(),
                                contractDays: 3
                            })
                        });

                        // Update victim
                        if (victimDoc.exists()) {
                            const vData = victimDoc.data();
                            const updatedAgents = (vData.ownedAgents || []).filter((a: any) => a.id !== agent.id);
                            transaction.update(victimRef, {
                                balance: increment(currentAgentState.currentPrice * 0.5),
                                ownedAgents: updatedAgents
                            });
                        }

                        // Update agent
                        transaction.update(agentStateRef, {
                            ownerId: user.id,
                            ownerName: user.username,
                            currentPrice: stealCost,
                            transfers: increment(1),
                            lastPurchasedAt: serverTimestamp(),
                            contractDays: 3
                        });
                    });

                    showAlert("تم الاختطاف", "تم نقل السيطرة العصبية للوكيل إليك بنجاح.");
                    refreshUser();
                } catch (e) {
                    console.error(e);
                    showAlert("خطأ تقني", typeof e === 'string' ? e : "فشلت عملية الاختطاف.");
                }
            },
            'confirm'
        );
    }, [user, agentStates, showAlert, refreshUser]);

    const handleRenew = useCallback(async (agent: Agent) => {
        if (!user) return;

        const price = agentStates[agent.id]?.currentPrice || agent.basePrice;
        const renewCost = Math.floor(price * 0.6);

        if (user.balance < renewCost) {
            showAlert("رصيد غير كافٍ", "تحتاج لـ 60% من القيمة الاسمية لتجديد العقد.");
            return;
        }

        showAlert(
            "تجديد العقد",
            `تكلفة التجديد لـ 3 أيام إضافية هي ${formatNeuralCurrency(renewCost)}$.`,
            async () => {
                try {
                    await runTransaction(db, async (transaction) => {
                        const userRef = doc(db, 'users', user.id);
                        const userDoc = await transaction.get(userRef);

                        if (!userDoc.exists()) throw "User not found";
                        const userData = userDoc.data();
                        if (userData.balance < renewCost) throw "Insufficient funds";

                        const updatedAgents = (userData.ownedAgents || []).map((a: any) => {
                            if (a.id === agent.id) {
                                return { ...a, contractDays: (a.contractDays || 3) + 3 };
                            }
                            return a;
                        });

                        transaction.update(userRef, {
                            balance: increment(-renewCost),
                            ownedAgents: updatedAgents
                        });
                    });

                    showAlert("تم التجديد", "تم تمديد فترة الولاء للوكيل.");
                    refreshUser();
                } catch (e) {
                    console.error(e);
                    showAlert("خطأ", "فشل تجديد العقد.");
                }
            },
            'confirm'
        );
    }, [user, agentStates, showAlert, refreshUser]);

    const handleAbandon = useCallback(async (agent: Agent) => {
        if (!user) return;

        const price = agentStates[agent.id]?.currentPrice || agent.basePrice;
        const refund = Math.floor(price * 0.5);

        showAlert(
            "تأكيد التخلي",
            `التخلي عن الوكيل يعيد لك نصف قيمته (${formatNeuralCurrency(refund)}$). هل أنت متأكد؟`,
            async () => {
                try {
                    const userRef = doc(db, 'users', user.id);
                    const agentStateRef = doc(db, 'agents_state', agent.id);

                    const updatedAgents = user.ownedAgents?.filter((a: any) => a.id !== agent.id);

                    await updateDoc(userRef, {
                        balance: increment(refund),
                        ownedAgents: updatedAgents
                    });

                    await updateDoc(agentStateRef, {
                        ownerId: null,
                        ownerName: null,
                        lastPurchasedAt: null
                    });

                    showAlert("تم التخلي", "تمت إزالة الوكيل من مواردك العصبية.");
                    refreshUser();
                } catch (e) {
                    showAlert("خطأ", "فشلت العملية.");
                }
            },
            'confirm'
        );
    }, [user, agentStates, showAlert, refreshUser]);

    return {
        handlePurchase,
        handleSteal,
        handleRenew,
        handleAbandon,
        getContractStatus
    };
};
