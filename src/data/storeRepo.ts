import { db } from '../firebase';
import { collection, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

// --- Types ---
export interface StoreItem {
    id: string;
    templateId: number;
    name: string;
    imageUrl: string;
    basePrice: number;
    quantity: number;
    sellingPrice?: number;
    status: 'storage' | 'for_sale';
}

export interface Store {
    ownerId: string;
    name: string;
    createdAt: any;
    items: StoreItem[];
}

// --- Wholesale Data ---
export const WHOLESALE_MARKET = [
    // --- ELECTRONICS (20 items) ---
    { id: 'e1', name: 'NVIDIA H100 AI GPU', category: 'Electronics', price: 40000, image: 'https://images.unsplash.com/photo-1591405351990-4726e33df58d?w=400' },
    { id: 'e2', name: 'MacBook Pro M3 Max Bundle', category: 'Electronics', price: 3500, image: 'https://images.unsplash.com/photo-1517336712461-481bf4886578?w=400' },
    { id: 'e3', name: 'Quantum Processor Unit', category: 'Electronics', price: 2500000, image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400' },
    { id: 'e4', name: '5G Base Station Tower', category: 'Electronics', price: 50000, image: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400' },
    { id: 'e5', name: 'Smart Glass AR Lens', category: 'Electronics', price: 1200, image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400' },
    { id: 'e6', name: 'Industrial Mining Rig', category: 'Electronics', price: 15000, image: 'https://images.unsplash.com/photo-1624344565890-48e026521991?w=400' },
    { id: 'e7', name: 'Supercomputer Server Rack', category: 'Electronics', price: 1200000, image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=400' },
    { id: 'e8', name: 'OLED Transparent Display', category: 'Electronics', price: 8000, image: 'https://images.unsplash.com/photo-1585241936939-be4099591252?w=400' },
    { id: 'e9', name: 'Holographic Projector', category: 'Electronics', price: 25000, image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400' },
    { id: 'e10', name: 'Advanced Drone Swarm', category: 'Electronics', price: 45000, image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400' },
    { id: 'e11', name: 'Cybernetic Neural Link', category: 'Electronics', price: 95000, image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400' },
    { id: 'e12', name: 'Global Starlink Terminal', category: 'Electronics', price: 2500, image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400' },
    { id: 'e13', name: 'Crypto Hardware Wallet Bulk', category: 'Electronics', price: 150, image: 'https://images.unsplash.com/photo-1625806782236-07b1d9776077?w=400' },
    { id: 'e14', name: 'Biometric Security Door', category: 'Electronics', price: 3200, image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400' },
    { id: 'e15', name: '8K Broadcast Camera', category: 'Electronics', price: 65000, image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400' },
    { id: 'e16', name: 'Smart City Sensor Kit', category: 'Electronics', price: 12000, image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400' },
    { id: 'e17', name: 'Exoskeleton Battery Pack', category: 'Electronics', price: 5500, image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=400' },
    { id: 'e18', name: 'Silicon Wafer Grade-A', category: 'Electronics', price: 1200, image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400' },
    { id: 'e19', name: 'Nano-Soldering Station', category: 'Electronics', price: 850, image: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=400' },
    { id: 'e20', name: 'AI Edge Computing Hub', category: 'Electronics', price: 18000, image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400' },

    // --- AUTOMOTIVE (20 items) ---
    { id: 'a1', name: 'Tesla Model S Plaid', category: 'Automotive', price: 90000, image: 'https://images.unsplash.com/photo-1617788130012-02ba73443c2e?w=400' },
    { id: 'a2', name: 'Caterpillar Mining Truck', category: 'Automotive', price: 3500000, image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400' },
    { id: 'a3', name: 'Electric Delivery Van', category: 'Automotive', price: 45000, image: 'https://images.unsplash.com/photo-1605152276897-4f618f831968?w=400' },
    { id: 'a4', name: 'Hydrogen Fuel Cell Bus', category: 'Automotive', price: 550000, image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400' },
    { id: 'a5', name: 'Rolls-Royce Spectre', category: 'Automotive', price: 420000, image: 'https://images.unsplash.com/photo-1631214503851-a17144e0078a?w=400' },
    { id: 'a6', name: 'Armored Diplomatic SUV', category: 'Automotive', price: 250000, image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400' },
    { id: 'a7', name: 'Formula 1 Chassis', category: 'Automotive', price: 15000000, image: 'https://images.unsplash.com/photo-1504670073073-6123e39e0754?w=400' },
    { id: 'a8', name: 'Agri-Drone Tractor', category: 'Automotive', price: 85000, image: 'https://images.unsplash.com/photo-1594132176002-393f60a92f02?w=400' },
    { id: 'a9', name: 'Luxury Superyacht Tender', category: 'Automotive', price: 120000, image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ec96a?w=400' },
    { id: 'a10', name: 'EV Battery Chassis Pack', category: 'Automotive', price: 22000, image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400' },
    { id: 'a11', name: 'Autonomous Semi-Truck', category: 'Automotive', price: 180000, image: 'https://images.unsplash.com/photo-1586191121278-2207506bc7b5?w=400' },
    { id: 'a12', name: 'VTOL Personal Air-Cab', category: 'Automotive', price: 350000, image: 'https://images.unsplash.com/photo-1473960104312-bf9e182f33c0?w=400' },
    { id: 'a13', name: 'Jet Ski Carbon Edition', category: 'Automotive', price: 25000, image: 'https://images.unsplash.com/photo-1531641001900-2d93708170c9?w=400' },
    { id: 'a14', name: 'Bullet Train Engine', category: 'Automotive', price: 45000000, image: 'https://images.unsplash.com/photo-1532105956626-ce5e407b5e85?w=400' },
    { id: 'a15', name: 'Military Humvee Replica', category: 'Automotive', price: 150000, image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400' },
    { id: 'a16', name: 'Forklift Industrial 5-Ton', category: 'Automotive', price: 35000, image: 'https://images.unsplash.com/photo-1519074063912-ad2a0522ed22?w=400' },
    { id: 'a17', name: 'Vintage 1967 Mustang', category: 'Automotive', price: 110000, image: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=400' },
    { id: 'a18', name: 'Snowmobile Pro', category: 'Automotive', price: 18000, image: 'https://images.unsplash.com/photo-1551944296-c894c2f49430?w=400' },
    { id: 'a19', name: 'Garbage Truck EV', category: 'Automotive', price: 320000, image: 'https://images.unsplash.com/photo-1543167423-34612e226a42?w=400' },
    { id: 'a20', name: 'SpaceX Merlin Engine', category: 'Automotive', price: 1000000, image: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?w=400' },

    // --- FASHION (20 items) ---
    { id: 'f1', name: 'Hermès Birkin Bag', category: 'Fashion', price: 25000, image: 'https://images.unsplash.com/photo-1584917033904-491a3482a61b?w=400' },
    { id: 'f2', name: 'Rolex Daytona Gold', category: 'Fashion', price: 45000, image: 'https://images.unsplash.com/photo-1587836374828-4dbaba94cf0e?w=400' },
    { id: 'f3', name: 'Limited Edition Sneaker Bulk', category: 'Fashion', price: 5000, image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=400' },
    { id: 'f4', name: 'Bulletproof Silk Suit', category: 'Fashion', price: 12000, image: 'https://images.unsplash.com/photo-1594932224011-00104899279b?w=400' },
    { id: 'f5', name: 'Diamond Encrusted Watch', category: 'Fashion', price: 150000, image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400' },
    { id: 'f6', name: 'Designer Handbag Lot', category: 'Fashion', price: 10000, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400' },
    { id: 'f7', name: 'Smart Fitness Ring', category: 'Fashion', price: 300, image: 'https://images.unsplash.com/photo-1610940882244-18ac607d7c71?w=400' },
    { id: 'f8', name: 'E-Ink Smart T-Shirt', category: 'Fashion', price: 450, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
    { id: 'f9', name: 'Space Suit Replica', category: 'Fashion', price: 15000, image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400' },
    { id: 'f10', name: 'Italian Leather Boots', category: 'Fashion', price: 850, image: 'https://images.unsplash.com/photo-1520639889313-7272a74b1c69?w=400' },
    { id: 'f11', name: 'Cashmere Wool Roll (100m)', category: 'Fashion', price: 25000, image: 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=400' },
    { id: 'f12', name: 'Gold Necklace Set', category: 'Fashion', price: 3500, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400' },
    { id: 'f13', name: 'Luxury Sunglasses Pack', category: 'Fashion', price: 2000, image: 'https://images.unsplash.com/photo-1511499767390-903390e6fbc1?w=400' },
    { id: 'f14', name: 'Cyberpunk Jacket', category: 'Fashion', price: 1200, image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400' },
    { id: 'f15', name: 'Royal Velvet Cape', category: 'Fashion', price: 7500, image: 'https://images.unsplash.com/photo-1584559582128-b8be739912e1?w=400' },
    { id: 'f16', name: 'Heated Winter Coat', category: 'Fashion', price: 600, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400' },
    { id: 'f17', name: 'Silk Scarf Collection', category: 'Fashion', price: 1500, image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400' },
    { id: 'f18', name: 'Custom Tuxedo Service', category: 'Fashion', price: 5000, image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400' },
    { id: 'f19', name: 'Eco-Leather Tote', category: 'Fashion', price: 350, image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400' },
    { id: 'f20', name: 'High-Fashion Fedora', category: 'Fashion', price: 250, image: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=400' },

    // --- FURNITURE (20 items) ---
    { id: 'u1', name: 'Herman Miller Aeron Chair', category: 'Furniture', price: 1200, image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400' },
    { id: 'u2', name: 'Soundproof Office Pod', category: 'Furniture', price: 15000, image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400' },
    { id: 'u3', name: 'Smart Glass Dining Table', category: 'Furniture', price: 4500, image: 'https://images.unsplash.com/photo-1577146333195-bc6013a94828?w=400' },
    { id: 'u4', name: 'Anti-Gravity Bed', category: 'Furniture', price: 12000, image: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=400' },
    { id: 'u5', name: 'Modular Sofa System', category: 'Furniture', price: 8000, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400' },
    { id: 'u6', name: 'Industrial Shelving Unit', category: 'Furniture', price: 3500, image: 'https://images.unsplash.com/photo-1594420489714-257a050d2681?w=400' },
    { id: 'u7', name: 'Mahogany CEO Desk', category: 'Furniture', price: 5500, image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400' },
    { id: 'u8', name: 'Eames Lounge Chair', category: 'Furniture', price: 6000, image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400' },
    { id: 'u9', name: 'Hydroponic Indoor Farm', category: 'Furniture', price: 4200, image: 'https://images.unsplash.com/photo-1530836361253-efad5cb2f6de?w=400' },
    { id: 'u10', name: 'Fireproof Safe (Large)', category: 'Furniture', price: 2500, image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400' },
    { id: 'u11', name: 'Home Cinema Seating (10)', category: 'Furniture', price: 22000, image: 'https://images.unsplash.com/photo-1595944187418-5394463910b0?w=400' },
    { id: 'u12', name: 'Antique Persian Rug', category: 'Furniture', price: 35000, image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400' },
    { id: 'u13', name: 'Smart Mirror Wardrobe', category: 'Furniture', price: 5800, image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400' },
    { id: 'u14', name: 'Outdoor Garden Gazebo', category: 'Furniture', price: 12000, image: 'https://images.unsplash.com/photo-1582281227099-c399622a6b03?w=400' },
    { id: 'u15', name: 'Standing Desk Pro-Series', category: 'Furniture', price: 950, image: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400' },
    { id: 'u16', name: 'Crystal Chandelier', category: 'Furniture', price: 15000, image: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=400' },
    { id: 'u17', name: 'Minimalist Bookcase', category: 'Furniture', price: 1200, image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400' },
    { id: 'u18', name: 'Ergonomic Gaming Station', category: 'Furniture', price: 4500, image: 'https://images.unsplash.com/photo-1598550476439-6847785fce6e?w=400' },
    { id: 'u19', name: 'Solid Oak Bar Counter', category: 'Furniture', price: 7200, image: 'https://images.unsplash.com/photo-1551133990-79860b240509?w=400' },
    { id: 'u20', name: 'Bean Bag Cloud XL', category: 'Furniture', price: 400, image: 'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=400' },

    // --- FOOD (20 items) ---
    { id: 'o1', name: '1 Ton Wagyu Beef A5', category: 'Food', price: 50000, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' },
    { id: 'o2', name: 'Saffron Grade-A (1kg)', category: 'Food', price: 6500, image: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400' },
    { id: 'o3', name: 'Bluefin Tuna (Whole)', category: 'Food', price: 30000, image: 'https://images.unsplash.com/photo-1534120247760-c44c3e4a62f1?w=400' },
    { id: 'o4', name: 'Wheat Reserve (100 Tons)', category: 'Food', price: 35000, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400' },
    { id: 'o5', name: 'Vintage Wine Case 1945', category: 'Food', price: 150000, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400' },
    { id: 'o6', name: 'Edible Gold Leaf Pack', category: 'Food', price: 5000, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400' },
    { id: 'o7', name: 'Artisan Cheese Wheel', category: 'Food', price: 1200, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400' },
    { id: 'o8', name: 'Wild Truffle (White)', category: 'Food', price: 12000, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400' },
    { id: 'o9', name: 'Coffee Beans (Panama)', category: 'Food', price: 800, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400' },
    { id: 'o10', name: 'Synthetic Meat Batch', category: 'Food', price: 15000, image: 'https://images.unsplash.com/photo-1607623273573-fb94d65371bc?w=400' },
    { id: 'o11', name: 'Organic Honey Bulk', category: 'Food', price: 2500, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400' },
    { id: 'o12', name: 'Beluga Caviar (500g)', category: 'Food', price: 5000, image: 'https://images.unsplash.com/photo-1544333323-5374c4310860?w=400' },
    { id: 'o13', name: 'Melted Glacier Water (1kL)', category: 'Food', price: 12000, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { id: 'o14', name: 'Rare Tea Leaves (Da-Hong)', category: 'Food', price: 25000, image: 'https://images.unsplash.com/photo-1544787210-2211d24715ec?w=400' },
    { id: 'o15', name: 'Space-Grown Lettuce', category: 'Food', price: 300, image: 'https://images.unsplash.com/photo-1556801712-76c826673874?w=400' },
    { id: 'o16', name: 'Dark Chocolate (Pure)', category: 'Food', price: 120, image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400' },
    { id: 'o17', name: 'Sea Urchin Uni Box', category: 'Food', price: 2200, image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400' },
    { id: 'o18', name: 'Energy Drink Concentrate', category: 'Food', price: 1500, image: 'https://images.unsplash.com/photo-1622543925917-763c34d1538c?w=400' },
    { id: 'o19', name: 'Dehydrated Space Meals', category: 'Food', price: 450, image: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=400' },
    { id: 'o20', name: 'Infinite Shelf-Life Rice', category: 'Food', price: 5000, image: 'https://images.unsplash.com/photo-1586201327693-d6f4affdc09a?w=400' },
];

// --- Helpers ---

export const getGlobalAverageWealth = async () => {
    try {
        const snap = await getDocs(collection(db, "users"));
        if (snap.empty) return 1000;
        let total = 0;
        snap.forEach(d => total += (d.data().balance || 0));
        return total / snap.size;
    } catch (e) {
        return 1000;
    }
};

export const createStore = async (userId: string, storeName: string) => {
    const COST = 10000000000; // 10 Billion

    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const userSnap = await transaction.get(userRef);
        const userData = userSnap.data();

        if ((userData?.balance || 0) < COST) throw new Error("Insufficient funds for Store License (10B)");

        transaction.update(userRef, { balance: (userData?.balance || 0) - COST });

        const storeRef = doc(collection(db, "stores")); // Auto-ID
        // Link store to user? better to keep store separate but indexed by ownerId
        // Or store ID in user profile. Let's query by ownerId for simplicity.

        transaction.set(storeRef, {
            ownerId: userId,
            name: storeName,
            createdAt: serverTimestamp(),
            items: []
        });
    });
};

export const buyWholesale = async (userId: string, storeId: string, itemTemplate: any, quantity: number) => {
    const cost = itemTemplate.price * quantity;

    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const storeRef = doc(db, "stores", storeId);

        const userSnap = await transaction.get(userRef);
        const storeSnap = await transaction.get(storeRef);

        if ((userSnap.data()?.balance || 0) < cost) throw new Error("Insufficient funds");

        const storeData = storeSnap.data() as Store;
        const newItems = [...(storeData.items || [])];

        // Add new batch as unique item mainly because we might sell them at different times? 
        // Or stack them? Prompt says "Click on card... enter price... confirm sell".
        // It implies batch management. Let's add as a new batch entry.

        newItems.push({
            id: Date.now().toString(), // Simple ID
            templateId: itemTemplate.id,
            name: itemTemplate.name,
            imageUrl: itemTemplate.image,
            basePrice: itemTemplate.price,
            quantity: quantity,
            status: 'storage'
        });

        transaction.update(userRef, { balance: (userSnap.data()?.balance || 0) - cost });
        transaction.update(storeRef, { items: newItems });
    });
};

export const listForSale = async (storeId: string, itemId: string, sellingPrice: number) => {
    const storeRef = doc(db, "stores", storeId);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(storeRef);
        if (!snap.exists()) throw new Error("Store not found");

        const data = snap.data() as Store;
        const items = [...data.items];
        const idx = items.findIndex(i => i.id === itemId);

        if (idx === -1) throw new Error("Item not found");

        items[idx].sellingPrice = sellingPrice;
        items[idx].status = 'for_sale';

        transaction.update(storeRef, { items });
    });
};

export const processBotSale = async (userId: string, storeId: string, item: StoreItem) => {
    // This is called by the client (owner) to "simulate" a sale result after a bot decides to buy
    // Security note: In a real app, this should be server-side. For this MVP, we trust the client logic.

    await runTransaction(db, async (transaction) => {
        const storeRef = doc(db, "stores", storeId);
        const userRef = doc(db, "users", userId);

        const storeSnap = await transaction.get(storeRef);
        if (!storeSnap.exists()) return;

        const items = [...(storeSnap.data().items as StoreItem[])];
        const idx = items.findIndex(i => i.id === item.id);

        if (idx === -1) return; // Item already gone

        // Calculate Revenue
        const revenue = (items[idx].sellingPrice || 0) * items[idx].quantity;

        // Remove Item
        items.splice(idx, 1);

        transaction.update(storeRef, { items });

        // Add Revenue
        const userSnap = await transaction.get(userRef);
        transaction.update(userRef, {
            balance: (userSnap.data()?.balance || 0) + revenue
        });

        // Log
        const actRef = doc(collection(db, "activities"));
        transaction.set(actRef, {
            userId: userId,
            message: `Store Sale: Sold batch of ${item.name} for $${revenue.toLocaleString()}`,
            timestamp: serverTimestamp(),
            type: 'sale'
        });
    });
};
