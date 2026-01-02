import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'fr' | 'ar';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
    en: {
        'nav_hub': 'Neural Hub',
        'nav_council': 'Council',
        'nav_war': 'War Grid',
        'nav_resources': 'Resources',
        'nav_enterprise': 'Enterprise',
        'nav_exchange': 'Exchange',
        'nav_credit': 'Credit Depot',
        'nav_equity': 'Equity',
        'nav_armory': 'Armory',
        'nav_sovereign': 'Sovereign',
        'nav_district': 'District',
        'nav_uplink': 'Uplink',
        'nav_network': 'Network',
        'nav_comms': 'Comms',
        'terminate_session': 'TERMINATE SESSION',
        'directories': 'DIRECTORIES',
        'net_liquidity': 'NET_LIQUIDITY',
        'menu': 'MENU'
    },
    fr: {
        'nav_hub': 'Hub Neural',
        'nav_council': 'Conseil',
        'nav_war': 'Grille de Guerre',
        'nav_resources': 'Ressources',
        'nav_enterprise': 'Entreprise',
        'nav_exchange': 'Échange',
        'nav_credit': 'Dépôt de Crédit',
        'nav_equity': 'Équité',
        'nav_armory': 'Armurerie',
        'nav_sovereign': 'Souverain',
        'nav_district': 'District',
        'nav_uplink': 'Liaison',
        'nav_network': 'Réseau',
        'nav_comms': 'Comms',
        'terminate_session': 'TERMINER LA SESSION',
        'directories': 'RÉPERTOIRES',
        'net_liquidity': 'LIQUIDITÉ_NETTE',
        'menu': 'MENU'
    },
    ar: {
        'nav_hub': 'المركز العصبي',
        'nav_council': 'المجلس',
        'nav_war': 'شبكة الحرب',
        'nav_resources': 'الموارد',
        'nav_enterprise': 'المؤسسة',
        'nav_exchange': 'التبادل',
        'nav_credit': 'مستودع الائتمان',
        'nav_equity': 'الأسهم',
        'nav_armory': 'الترسانة',
        'nav_sovereign': 'السيادة',
        'nav_district': 'المنطقة',
        'nav_uplink': 'ارتباط',
        'nav_network': 'الشبكة',
        'nav_comms': 'اتصالات',
        'terminate_session': 'إنهاء الجلسة',
        'directories': 'الأدلة',
        'net_liquidity': 'صافي السيولة',
        'menu': 'القائمة'
    }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('app_lang') as Language) || 'en';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app_lang', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    };

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);

    const t = (key: string) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within LanguageProvider');
    return context;
};
