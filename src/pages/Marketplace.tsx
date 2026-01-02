import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, arrayUnion, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { Key, Anchor, Crown, Clock, Home, Gem, CheckCircle, Info, Plane, Palette } from 'lucide-react';

// مصفوفة العناصر (تركتها فارغة بناءً على طلبك)
const LUXURY_ITEMS = [
    {
        id: 'bugatti_tourbillon',
        name: 'Equinox Tourbillon',
        category: 'HYPER-CAR',
        price: 4600000,
        image: 'https://robbreport.com/wp-content/uploads/2024/06/opener-w-Bugatti-3.jpg?w=1024',
        description: 'Kinetic-Hybrid V16. 1800HP neural-linked drive system.',
        icon: <Key size={14} />
    },
    {
        id: 'superyacht_azzam',
        name: 'Azzam Dreadnought',
        category: 'VESSEL',
        price: 600000000,
        image: 'https://cdn.boatinternational.com/files/2020/11/b3933040-1f73-11eb-aea0-39fb4a27baf8-Azzam-G.Romero-1.jpg',
        description: '180m Fortress. Includes missile interception & dual helipads.',
        icon: <Anchor size={14} />
    },
    {
        id: 'patek_grandmaster',
        name: 'Chronos Grandmaster',
        category: 'HOROLOGY',
        price: 31000000,
        image: 'https://hodinkee.imgix.net/uploads/article/hero_image/2125/_img.jpg?ixlib=rails-1.1.0&fm=jpg&q=55&auto=format&usm=12',
        description: 'Mechanical perfection. 20 complications, 214 parts.',
        icon: <Clock size={14} />
    },
    {
        id: 'penthouse_nyc',
        name: 'Sky-Tier Arcology',
        category: 'HABITAT',
        price: 195000000,
        image: 'https://iconiclife.com/wp-content/uploads/2020/06/New-York-penthouse-living-room-with-city-view.jpg',
        description: 'Highest terrestrial residence. 360° orbital visibility.',
        icon: <Home size={14} />
    },
    {
        id: 'private_island',
        name: 'Lanai Sovereign Zone',
        category: 'TERRITORY',
        price: 300000000,
        image: 'https://www.thepinnaclelist.com/wp-content/uploads/2019/12/08-Aerial-View-of-Lanai-Hawaii-Lanai-The-Most-Expensive-Private-Island-Real-Estate-Transaction-in-History.jpg',
        description: 'Autonomous Pacific zone. Full diplomatic immunity included.',
        icon: <Crown size={14} />
    },
    {
        id: 'private_jet_g700',
        name: 'G700 Stealth-Liner',
        category: 'AVIONICS',
        price: 78000000,
        image: 'https://assets.gulfstream.aero/thedotcom/images/aircraft/g700/d_g700_a_mkt_00041_v02_webPROD.jpg',
        description: 'Mach 0.95 sustained cruise. Anti-radar signature paint.',
        icon: <Plane size={14} />
    },
    {
        id: 'koenigsegg_jesko',
        name: 'Koenigsegg Jesko',
        category: 'HYPER-CAR',
        price: 3000000,
        image: 'https://media.autoexpress.co.uk/image/private/s--X-WVjvBW--/f_auto,t_content-image-full-desktop@1/v1626443953/autoexpress/2021/07/Koenigsegg%20Jesko%202021%20official-7.jpg',
        description: '1600HP megacar with revolutionary Light Speed Transmission.',
        icon: <Key size={14} />
    },
    {
        id: 'sailing_yacht_a',
        name: 'Sailing Yacht A',
        category: 'VESSEL',
        price: 600000000,
        image: 'https://yachtharbour.com/static/images/n/large_3272_62b65.jpg',
        description: '143m futuristic sailing vessel with underwater observation pod.',
        icon: <Anchor size={14} />
    },
    {
        id: 'graff_hallucination',
        name: 'Graff Hallucination',
        category: 'HOROLOGY',
        price: 55000000,
        image: 'https://www.ablogtowatch.com/wp-content/uploads/2014/06/Graff-Hallucination-2.jpg',
        description: 'Rainbow of rare colored diamonds in a quartz masterpiece.',
        icon: <Clock size={14} />
    },
    {
        id: 'villa_leopolda',
        name: 'Villa Leopolda',
        category: 'HABITAT',
        price: 750000000,
        image: 'https://static.wixstatic.com/media/ad6d43_fe4408565e9a4d2798d6e7af634a3428~mv2.jpg/v1/fill/w_1600,h_1065,al_c/ad6d43_fe4408565e9a4d2798d6e7af634a3428~mv2.jpg',
        description: 'Iconic French Riviera palace with 50 acres of manicured grounds.',
        icon: <Home size={14} />
    },
    {
        id: 'pink_star_diamond',
        name: 'Vivid Pink Star',
        category: 'JEWELRY',
        price: 71200000,
        image: 'https://truval.com/wp-content/uploads/2024/09/ap_17088294714233_wide-6e3cafced209629a1d506eede8d8a2be9f216e9f.jpg',
        description: '59.6-carat flawless fancy vivid pink diamond. Apex of terrestrial rarity.',
        icon: <Gem size={14} />
    },
    {
        id: 'salvator_mundi',
        name: 'Salvator Mundi',
        category: 'FINE ART',
        price: 450300000,
        image: 'https://cdn.britannica.com/47/198847-050-49EA5BDE/Salvator-Mundi-oil-walnut-panel-Leonardo-da.jpg',
        description: 'Attributed to Leonardo da Vinci. The Redeemer of the World.',
        icon: <Palette size={14} />
    },
    {
        id: 'mercedes_300_slr',
        name: '300 SLR Uhlenhaut Coupé',
        category: 'HYPER-CAR',
        price: 143000000,
        image: 'https://www.mercedes-benz.com/assets/sustainability/responsibility/300-slr/02-mercedes-benz-classic-300-slr-article-2022-2560x1440.jpeg',
        description: '1955 masterpiece. Most valuable automobile in existence.',
        icon: <Key size={14} />
    },
    
    {
        id: 'superyacht_azzam',
        name: 'Azzam Dreadnought',
        category: 'VESSEL',
        price: 600000000,
        image: 'https://cdn.boatinternational.com/files/2020/11/b3933040-1f73-11eb-aea0-39fb4a27baf8-Azzam-G.Romero-1.jpg',
        description: '180m Fortress. Includes missile interception & dual helipads.',
        icon: <Anchor size={14} />
    },
    

    // ===== العناصر الجديدة الفخمة جداً (أسعار حقيقية/واقعية عالية جداً لتحسس اللاعب بالإنجاز) =====
    {
        id: 'rolls_boat_tail',
        name: 'Boat Tail Apex',
        category: 'HYPER-CAR',
        price: 28000000, // ~$28M حقيقي
        image: 'https://sportscardigest.com/wp-content/uploads/2022/05/Rolls-RoyceBoatTail-TheNextChapterLifestyleShoot_2-scaled-1.jpg',
        description: 'Handcrafted bespoke coachbuilt masterpiece. One of three in existence.',
        icon: <Key size={14} />
    },
    {
        id: 'eclipse_yacht',
        name: 'Eclipse Fortress',
        category: 'VESSEL',
        price: 1500000000, // ~$1.5B تقديري حقيقي
        image: 'https://cdn.boatinternational.com/convert/bi_prd/bi/library_images/tEu9fPGOTiWwGsKi0GOM_Eclipse-lines.jpg/r[width]=1920/tEu9fPGOTiWwGsKi0GOM_Eclipse-lines.jpg',
        description: '162m mega-yacht with laser anti-paparazzi shield and private submarine.',
        icon: <Anchor size={14} />
    },
    {
        id: 'bbj_747',
        name: 'BBJ Sovereign Palace',
        category: 'AVIONICS',
        price: 400000000, // ~$400M للـVIP conversion
        image: 'https://d3trj3zqmkebtg.cloudfront.net/pics/221/221440_big.jpg',
        description: 'Converted Boeing 747 with palace interiors, global non-stop range.',
        icon: <Plane size={14} />
    },
    {
        id: 'antilia',
        name: 'Antilia Vertical Dominion',
        category: 'HABITAT',
        price: 2000000000, // ~$2B حقيقي
        image: 'https://c8.alamy.com/comp/F6BX35/antilia-building-private-residence-indian-billionaire-mukesh-ambani-F6BX35.jpg',
        description: '27-story private skyscraper with hanging gardens, snow room, and 3 helipads.',
        icon: <Home size={14} />
    },
    {
        id: 'interchange_art',
        name: 'Interchange Masterpiece',
        category: 'FINE ART',
        price: 300000000, // $300M حقيقي
        image: 'https://www.shutterstock.com/editorial/image-editorial/MaTdYey3N5jac2x8NTMzNzg=/willem-de-kooning-interchange-sold-more-than-1500w-16103397w.jpg',
        description: 'Iconic abstract expressionist painting by Willem de Kooning.',
        icon: <Palette size={14} />
    },
    {
        id: 'grandmaster_chime',
        name: 'Grandmaster Chime Ref. 6300',
        category: 'HOROLOGY',
        price: 31000000, // $31M record sale
        image: 'https://hodinkee.imgix.net/uploads/article/hero_image/2125/_img.jpg?ixlib=rails-1.1.0&fm=jpg&q=55&auto=format&usm=12',
        description: 'World\'s most complicated wristwatch with 20 complications.',
        icon: <Clock size={14} />
    },
    {
        id: 'global_7500',
        name: 'Global 7500 Ultra-Liner',
        category: 'AVIONICS',
        price: 81000000, // ~$81M حقيقي
        image: 'https://safefly.aero/wp-content/uploads/2024/07/Bombardier-Global-7500-private-jet-charter.png',
        description: 'Longest-range business jet with four living zones and permanent bed.',
        icon: <Plane size={14} />
    },
    {
        id: 'oppenheimer_blue',
        name: 'Oppenheimer Eternal Blue',
        category: 'JEWELRY',
        price: 57500000, // $57.5M record
        image: 'https://images.seattletimes.com/wp-content/uploads/2016/05/be72b1b8711945a6af3a20ec46f0c3fc.jpg?d=2040x1360',
        description: '14.62-carat flawless fancy vivid blue diamond.',
        icon: <Gem size={14} />
    },
    {
        id: 'monaco_floating',
        name: 'Monaco Floating City',
        category: 'VESSEL',
        price: 1100000000, // ~$1.1B concept
        image: 'https://www.thesun.co.uk/wp-content/uploads/2020/04/NINTCHDBPICT000579904096.jpg?strip=all&w=960',
        description: 'Floating replica of Monaco with casino, grand prix track, and beaches.',
        icon: <Anchor size={14} />
    },
    {
        id: 'macallan_1926',
        name: 'Macallan Adami 1926',
        category: 'RARE COLLECTION',
        price: 2700000, // $2.7M record bottle
        image: 'https://robbreport.com.au/application/assets/2023/11/The-Macallan-1926-cropped.jpg.webp',
        description: 'Single bottle of the world\'s most valuable whisky, hand-painted masterpiece.',
        icon: <Gem size={14} /> // أو أضف GlassWater إذا تحب
    }
];

export const Marketplace = () => {
    const { user, refreshUser } = useAuth();
    const [buying, setBuying] = useState<string | null>(null);

    const formatPrice = (price: number) => {
        const millions = price / 1000000;
        return millions.toLocaleString('ar-EG', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        });
    };

    const handleBuy = async (item: any) => {
        if (!user) return;
        if (user.balance < item.price) return alert("سيولة غير كافية لإتمام الاستحواذ");
        if ((user.possessions || []).some((p: any) => p.id === item.id)) return alert("الأصل مسجل بالفعل في قاعدة بيانات الهوية");

        if (!window.confirm(`تفويض الاستحواذ: ${item.name} | التكلفة: ${formatPrice(item.price)} مليون دولار`)) return;

        setBuying(item.id);
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.id);
                const userSnap = await transaction.get(userRef);
                const currentBalance = userSnap.data()?.balance || 0;
                if (currentBalance < item.price) throw new Error("Funds too low");
                transaction.update(userRef, {
                    balance: currentBalance - item.price,
                    possessions: arrayUnion({ id: item.id, name: item.name, category: item.category, price: item.price, image: item.image, purchasedAt: serverTimestamp() })
                });
                transaction.set(doc(collection(db, "activities")), { userId: user.id, message: `تم الاستحواذ على أصل فاخر: ${item.name}`, timestamp: serverTimestamp(), type: 'purchase' });

                transaction.set(doc(collection(db, "news")), {
                    type: 'acquisition',
                    username: user.username,
                    userColor: user.color,
                    content: `تم تسجيل ملكية جديدة: ${user.username} استحوذ للتو على ${item.name}!`,
                    value: item.price,
                    timestamp: serverTimestamp()
                });
            });
            await refreshUser();
        } catch (e: any) { alert("فشل ارتباط الاستحواذ"); }
        setBuying(null);
    };

    return (
        <div className="page-container fade-in" style={{ padding: '1rem' }}>
            {/* Header - Optimized for Mobile */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <div>
                    <p className="micro-label" style={{ color: 'var(--primary)', fontSize: '0.6rem', letterSpacing: '2px' }}>تجارة النخبة العالمية</p>
                    <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.8rem' }}>البورصة السيادية</h1>
                </div>
                <div className="card" style={{ padding: '0.4rem 0.75rem', background: 'var(--surface-soft)', border: '1px solid var(--border-bright)', width: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Gem size={12} color="var(--primary)" />
                        <span className="micro-label" style={{ fontSize: '0.55rem' }}>مؤشر_التداول_الثابت_نشط</span>
                    </div>
                </div>
            </div>

            {/* Grid Layout - 1 Column for Mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                {LUXURY_ITEMS.map(item => {
                    const owned = (user?.possessions || []).some((p: any) => p.id === item.id);
                    return (
                        <div key={item.id} className="card card-glow" style={{ padding: 0, overflow: 'hidden', border: owned ? '2px solid var(--success)' : '1px solid var(--border-dim)', borderRadius: '20px' }}>
                            <div style={{ height: '180px', position: 'relative' }}>
                                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}></div>
                                <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-bright)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {item.icon} <span className="micro-label" style={{ color: 'white', fontSize: '0.55rem' }}>{item.category}</span>
                                </div>
                                <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', textAlign: 'left' }}>
                                    <p className="micro-label" style={{ color: 'var(--primary)', marginBottom: '0.1rem', fontSize: '0.55rem' }}>التقييم الحالي</p>
                                    <p className="mono" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'white' }}>${formatPrice(item.price)}M</p>
                                </div>
                            </div>

                            <div style={{ padding: '1.25rem' }}>
                                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: 'white' }}>{item.name}</h3>
                                <p className="micro-label" style={{ opacity: 0.6, lineHeight: '1.4', fontSize: '0.7rem', minHeight: '2rem' }}>{item.description}</p>

                                <div style={{ marginTop: '1.25rem' }}>
                                    {owned ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '12px', color: 'var(--success)' }}>
                                            <CheckCircle size={16} />
                                            <span className="micro-label" style={{ fontWeight: '900', fontSize: '0.65rem' }}>تم تسجيل الأصل</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleBuy(item)}
                                            disabled={!!buying}
                                            className="primary"
                                            style={{ width: '100%', padding: '0.85rem', fontSize: '0.85rem' }}
                                        >
                                            {buying === item.id ? 'جاري الربط...' : 'تفويض الاستحواذ'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Notice */}
            <div className="card" style={{ marginTop: '2.5rem', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--border-dim)', textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.5 }}>
                    <Info size={12} />
                    <p className="micro-label" style={{ fontSize: '0.6rem', lineHeight: '1.4' }}>الأسعار مرتبطة بمؤشر السيولة السيادي (SLI). يتم الحفاظ على التكافؤ العالمي.</p>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .page-container { padding-bottom: 110px !important; }
                }
            `}</style>
        </div>
    );
};