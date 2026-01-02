# 🔥 K2 Platform - Firebase Setup Guide

## 📋 Table of Contents
1. [Firebase Project Setup](#1-firebase-project-setup)
2. [Environment Configuration](#2-environment-configuration)
3. [Firestore Security Rules](#3-firestore-security-rules)
4. [Data Structure Reference](#4-data-structure-reference)
5. [Project Summary](#5-project-summary)
6. [Areas Needing Expansion](#6-areas-needing-expansion)

---

## 1. Firebase Project Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name (e.g., "k2-economy-game")
4. Disable Google Analytics (optional for games)
5. Click "Create Project"

### Step 2: Enable Firestore
1. In Firebase Console → Build → Firestore Database
2. Click "Create Database"
3. Choose **Production Mode**
4. Select your region (e.g., `europe-west1`)
5. Click "Enable"

### Step 3: Add Web App
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" → Click Web icon (`</>`)
3. Register app name (e.g., "k2-web")
4. Copy the config object

---

## 2. Environment Configuration

### Create `src/firebase.ts`
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Install Dependencies
```bash
npm install firebase lightweight-charts browser-image-compression lucide-react
```

---

## 3. Firestore Security Rules

**Copy and paste these rules in Firebase Console → Firestore → Rules:**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========== USERS ==========
    match /users/{userId} {
      // Anyone can read user profiles (for leaderboards, accounts page)
      allow read: if true;
      
      // Users can only write to their own document
      allow write: if request.auth == null || userId == request.resource.data.id;
      
      // For this demo without Firebase Auth, we allow writes with ID match
      allow create: if true;
      allow update: if true;
    }
    
    // ========== ACTIVITIES ==========
    match /activities/{activityId} {
      allow read: if true;
      allow create: if true;
    }
    
    // ========== CHAT ==========
    match /chats/{chatId} {
      allow read: if true;
      allow create: if true;
    }
    
    // ========== GAME MAP ==========
    match /game_map/{tileId} {
      allow read: if true;
      allow write: if true;
    }
    
    // ========== LOANS ==========
    match /loans/{loanId} {
      allow read: if true;
      allow write: if true;
    }
    
    match /loan_offers/{offerId} {
      allow read: if true;
      allow write: if true;
    }
    
    // ========== STORES ==========
    match /stores/{storeId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> ⚠️ **Note**: These rules are permissive for development. For production, implement proper Firebase Authentication and restrict writes to authenticated users.

---

## 4. Data Structure Reference

### `users` Collection
```typescript
{
  id: string;                    // Document ID
  username: string;
  password: string;              // In production, use Firebase Auth!
  color: string;                 // Hex color
  photoUrl?: string;             // Base64 encoded image
  balance: number;
  
  ownedCompanies: [{
    id: string;
    name: string;
    dailyValue: number;
    purchasedAt: Timestamp;
  }];
  
  ownedWeapons: [{
    id: string;
    name: string;
    type: 'Attack' | 'Defense';
    power: number;
    quantity: number;
  }];
  
  possessions: [{                // Luxury items from Marketplace
    id: string;
    name: string;
    category: string;
    price: number;
    image: string;
  }];
  
  resources: {                    // From Loot page
    "Gold": number;
    "Iron": number;
    // ... 20 resource types
  };
  
  lastEarningsCheck: Timestamp;
  lastResourceClaim: Timestamp;
  createdAt: Timestamp;
}
```

### `activities` Collection
```typescript
{
  userId: string;
  message: string;
  type: 'transfer' | 'purchase' | 'trade' | 'win' | 'export' | 'loan' | 'sale';
  timestamp: Timestamp;
}
```

### `chats` Collection
```typescript
{
  uid: string;
  username: string;
  photoUrl: string;
  color: string;
  text: string;
  createdAt: Timestamp;
}
```

### `game_map` Collection
```typescript
{
  id: string;          // "row_col" format (e.g., "5_10")
  row: number;
  col: number;
  ownerId: string | null;
  ownerColor: string | null;
  points: number;
}
```

### `loans` Collection
```typescript
{
  borrowerId: string;
  lenderId: string;           // 'CENTRAL_BANK' or user ID
  lenderName?: string;
  originalAmount: number;
  remainingAmount: number;
  totalDue: number;
  interestRate: number;
  deadline: Timestamp;
  status: 'active' | 'repaid' | 'overdue';
  createdAt: Timestamp;
}
```

### `loan_offers` Collection
```typescript
{
  lenderId: string;
  lenderName: string;
  maxAmount: number;
  interestRate: number;
  durationHours: number;
  createdAt: Timestamp;
}
```

### `stores` Collection
```typescript
{
  ownerId: string;
  name: string;
  createdAt: Timestamp;
  items: [{
    id: string;
    templateId: number;
    name: string;
    imageUrl: string;
    basePrice: number;
    quantity: number;
    sellingPrice?: number;
    status: 'storage' | 'for_sale';
  }];
}
```

---

## 5. Project Summary

### ✅ Implemented Pages (14 Total)

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Dashboard with balance, leaderboard, activities |
| **Login** | `/login` | Registration & authentication |
| **Map** | `/map` | 20x20 territory war game |
| **Loot** | `/loot` | Resource collection & manufacturing |
| **Marketplace** | `/marketplace` | Luxury items (billions) |
| **Loans** | `/loans` | Central bank & P2P lending |
| **Store** | `/store` | Personal retail business |
| **Games** | `/games` | Mini-games with prizes |
| **Companies** | `/companies` | Income-generating assets |
| **Weapons** | `/weapons` | Attack/Defense equipment |
| **Transfers** | `/transfers` | Send money to users |
| **Trading** | `/trading` | Crypto-style trading |
| **Accounts** | `/accounts` | User profiles & possessions |
| **Chat** | `/chat` | Global real-time chat |

### 🔧 Data Layer
- `src/data/storeRepo.ts` - Store operations

### 🎨 Styling
- `src/index.css` - Global styles with mobile responsiveness

---

## 6. Areas Needing Expansion

### 🔴 High Priority

1. **Companies Page (`Companies.tsx`)**
   - Currently has basic company data
   - **TODO**: Add more companies (10-20 total)
   - **TODO**: Add company categories (Tech, Energy, Finance, etc.)

2. **Weapons Page (`Weapons.tsx`)**
   - Has basic weapon types
   - **TODO**: Add more weapon variety (10-15 total)
   - **TODO**: Consider weapon upgrades

3. **Store Page - Wholesale Market (`storeRepo.ts`)**
   - Currently has 10 products across 5 categories
   - **TODO**: Add 5-10 products per category
   - Comment in code: `// Add more products following this pattern`

4. **Firebase Authentication**
   - Current: Custom username/password in Firestore
   - **TODO**: Implement Firebase Auth for security

### 🟡 Medium Priority

5. **Games Page (`Games.tsx`)**
   - Quiz currently uses mocked data
   - **TODO**: Integrate Gemini API for dynamic questions
   - **TODO**: Add more game modes

6. **Loan Penalties**
   - Logic exists but not enforced automatically
   - **TODO**: Add Cloud Function to apply +45% daily penalty

7. **Map Tile Initialization**
   - Tiles are created on first interaction
   - **TODO**: Pre-populate 400 tiles on game start

### 🟢 Nice to Have

8. **Notifications System**
   - No push notifications
   - **TODO**: Add in-app notification center

9. **Leaderboard Categories**
   - Only shows wealth
   - **TODO**: Add "Most Tiles", "Top Traders", etc.

10. **Trading Chart**
    - Real-time simulation
    - **TODO**: Add price updates on interval

---

## 📁 File Structure

```
src/
├── App.tsx                 # Main router & navbar
├── index.css               # Global styles
├── firebase.ts             # Firebase config
├── context/
│   └── AuthContext.tsx     # User state management
├── data/
│   └── storeRepo.ts        # Store operations
└── pages/
    ├── Accounts.tsx
    ├── Chat.tsx
    ├── Companies.tsx        # ⚠️ Needs more content
    ├── Games.tsx
    ├── Home.tsx
    ├── Loans.tsx
    ├── Login.tsx
    ├── Loot.tsx
    ├── Map.tsx
    ├── Marketplace.tsx
    ├── Store.tsx            # ⚠️ Needs more products
    ├── Trading.tsx
    ├── Transfers.tsx
    └── Weapons.tsx          # ⚠️ Needs more content
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure Firebase (src/firebase.ts)
# Add your Firebase config

# 3. Deploy Firestore rules
# Copy rules from Section 3 to Firebase Console

# 4. Start development
npm run dev
```

---

**Last Updated**: December 27, 2025