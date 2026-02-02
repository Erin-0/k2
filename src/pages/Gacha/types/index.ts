import { Timestamp } from 'firebase/firestore';

export interface Agent {
    id: string;
    name: string;
    title: string;
    rarity: 'legendary' | 'epic' | 'rare' | 'common';
    rarityName: string;
    basePrice: number;
    dailyYield: number;
    attack: number;
    defense: number;
    image: string;
    desc: string;
    personality: string;
    color: string;
}

export interface AgentState {
    ownerId: string | null;
    ownerName: string | null;
    currentPrice: number;
    transfers: number;
    lastPurchasedAt: Timestamp | null;
    contractDays: number;
}

export interface OwnedAgent {
    id: string;
    purchasedAt: Timestamp;
    contractDays: number;
}

export interface ChatMessage {
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

export interface AlertState {
    show: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert';
    onConfirm?: () => void;
}

export interface ContractStatus {
    expired: boolean;
    urgent: boolean;
    text: string;
    remainingHours: number;
}

export type TabType = 'home' | 'details' | 'inventory' | 'chat';