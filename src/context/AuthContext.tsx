import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { formatNeuralCurrency } from '../utils/formatters';


import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

import { onAuthStateChanged, signOut } from 'firebase/auth';

import { Timestamp } from 'firebase/firestore';

export interface Possession {
    id: string;
    name: string;
    category: string;
    price: number;
    image: string;
    purchasedAt: Date | Timestamp;
}

export interface UserData {
    id: string;
    username: string;
    balance: number;
    color: string;
    ownedCompanies?: any[];
    ownedWeapons?: any[];
    weapons?: any[]; // For backward compatibility/consistency
    territories?: any[];
    loans?: any[];
    resources?: Record<string, number>;
    possessions?: Possession[];
    photoUrl?: string | null;
    lastEarningsCheck?: any;
    lastResourceClaim?: any;
    gameStats?: Record<string, any>;
    language?: 'en' | 'fr' | 'ar';
    defenseScore?: number;
    defenseUnits?: number;
    recentWeapons?: any[];
    activeWars?: number;
    defensePower?: string;
    dailyProduction?: string;
    exportReady?: boolean;
    assetsValue?: number;
    rank?: number;
    maxLoan?: number;
    currentDebt?: number;
    creditScore?: number;
    recentTransfers?: any[];
}



interface AuthContextType {
    user: UserData | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await syncUserData(firebaseUser.uid);
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const syncUserData = async (userId: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            const snap = await getDoc(userRef);

            if (snap.exists()) {
                const data = snap.data();
                let freshUser = { id: snap.id, ...data } as UserData;

                // Ensure weapons is synonymous with ownedWeapons
                freshUser.weapons = data.ownedWeapons || [];

                // 1. Earnings Logic
                const lastCheck = data.lastEarningsCheck?.toDate() ? data.lastEarningsCheck.toDate() : new Date();
                const now = new Date();
                const diffMs = now.getTime() - lastCheck.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays > 0 && data.ownedCompanies && data.ownedCompanies.length > 0) {
                    let totalEarned = 0;
                    data.ownedCompanies.forEach((c: any) => {
                        totalEarned += (parseFloat(c.dailyValue) || 0) * diffDays;
                    });

                    if (totalEarned > 0) {
                        const newBalance = (data.balance || 0) + totalEarned;
                        await updateDoc(userRef, {
                            balance: newBalance,
                            lastEarningsCheck: serverTimestamp()
                        });
                        freshUser.balance = newBalance;
                        console.log(`Corporate Earnings: $${formatNeuralCurrency(totalEarned)}`);
                    }
                }

                // 2. Territories Logic
                const qTiles = query(collection(db, "game_map"), where("ownerId", "==", userId));
                const tilesSnap = await getDocs(qTiles);
                const territories = tilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                freshUser.territories = territories;

                // 3. Resource Generation Logic (+1 per tile per day)
                const lastResourceClaim = data.lastResourceClaim?.toDate() || data.createdAt?.toDate() || new Date();
                const diffDaysRes = Math.floor((now.getTime() - lastResourceClaim.getTime()) / 86400000);

                if (diffDaysRes > 0) {
                    const tileCount = tilesSnap.size;

                    if (tileCount > 0) {
                        const amountToAdd = tileCount * diffDaysRes;
                        const currentRes = data.resources || {};
                        const updatedRes = { ...currentRes };
                        Object.keys(updatedRes).forEach(k => {
                            updatedRes[k] = (updatedRes[k] || 0) + amountToAdd;
                        });

                        await updateDoc(userRef, {
                            resources: updatedRes,
                            lastResourceClaim: serverTimestamp()
                        });
                        freshUser.resources = updatedRes;
                    } else {
                        await updateDoc(userRef, { lastResourceClaim: serverTimestamp() });
                    }
                }

                // 4. Loans Logic
                const qLoans = query(collection(db, "loans"), where("borrowerId", "==", userId));
                const loansSnap = await getDocs(qLoans);
                const allLoans = loansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                freshUser.loans = allLoans;

                let hasOverdue = false;
                for (const loanDoc of loansSnap.docs) {
                    const loan = loanDoc.data();
                    if (loan.status === 'active') {
                        const deadline = loan.deadline?.toDate();
                        if (deadline && now > deadline) {
                            hasOverdue = true;
                            await updateDoc(doc(db, "loans", loanDoc.id), { status: 'overdue' });
                        }
                    }
                }

                if (hasOverdue && (freshUser.balance || 0) > 0) {
                    await updateDoc(userRef, { balance: 0 });
                    freshUser.balance = 0;
                }

                setUser(freshUser);
            }

        } catch (e) {
            console.error("Critical Uplink Error:", e);
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const refreshUser = async () => {
        if (auth.currentUser) await syncUserData(auth.currentUser.uid);
    };

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
