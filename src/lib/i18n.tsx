'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { LanguageCode } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { updateLanguage } from '@/lib/firestore';

export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

// Small, hand-picked dictionary covering nav + settings + premium strings.
// Anything not listed here just falls back to the English key.
const DICT: Record<LanguageCode, Record<string, string>> = {
  en: {
    discover: 'Discover', explore: 'Explore', search: 'Search', interests: 'Interests', chats: 'Chats', profile: 'Profile',
    darkMode: 'Dark mode',
    verification: 'Verification', verificationSub: 'Get verified • Get more matches',
    privacy: 'Privacy & Safety', privacySub: 'Block, report, data controls',
    notifications: 'Notifications', notificationsSub: 'Matches, messages, likes',
    language: 'Language',
    help: 'Help & Support', helpSub: 'FAQs, contact, safety tips',
    premiumTitle: 'Flirty Premium',
    premiumSub: 'See who liked you, unlimited super likes, passport to any city',
    upgrade: 'Upgrade', logout: 'Logout', editBio: 'Edit Bio', preview: 'Preview',
    aboutMe: 'About me', save: 'Save', cancel: 'Cancel',
    madeWithLove: 'Made with ❤️ in India • 18+ only',
  },
  ta: {
    discover: 'கண்டறி', explore: 'ஆராய்', search: 'தேடல்', interests: 'விருப்பங்கள்', chats: 'அரட்டைகள்', profile: 'சுயவிவரம்',
    darkMode: 'இருண்ட பயன்முறை',
    verification: 'சரிபார்ப்பு', verificationSub: 'சரிபார்க்கப்படுங்கள் • அதிக மேட்சுகள் பெறுங்கள்',
    privacy: 'தனியுரிமை & பாதுகாப்பு', privacySub: 'தடு, புகார், தரவு கட்டுப்பாடுகள்',
    notifications: 'அறிவிப்புகள்', notificationsSub: 'மேட்சுகள், செய்திகள், லைக்குகள்',
    language: 'மொழி',
    help: 'உதவி & ஆதரவு', helpSub: 'கேள்விகள், தொடர்பு, பாதுகாப்பு குறிப்புகள்',
    premiumTitle: 'Flirty பிரீமியம்',
    premiumSub: 'யார் உங்களை லைக் செய்தார்கள் என்று பாருங்கள், வரம்பற்ற சூப்பர் லைக்குகள், எந்த நகரத்திற்கும் பாஸ்போர்ட்',
    upgrade: 'மேம்படுத்து', logout: 'வெளியேறு', editBio: 'பயோவைத் திருத்து', preview: 'முன்னோட்டம்',
    aboutMe: 'என்னைப் பற்றி', save: 'சேமி', cancel: 'ரத்து செய்',
    madeWithLove: 'இந்தியாவில் ❤️ உடன் உருவாக்கப்பட்டது • 18+ மட்டுமே',
  },
  hi: {
    discover: 'खोजें', explore: 'एक्सप्लोर', search: 'खोज', interests: 'रुचि', chats: 'चैट्स', profile: 'प्रोफ़ाइल',
    darkMode: 'डार्क मोड',
    verification: 'सत्यापन', verificationSub: 'सत्यापित हों • अधिक मैच पाएं',
    privacy: 'गोपनीयता और सुरक्षा', privacySub: 'ब्लॉक, रिपोर्ट, डेटा नियंत्रण',
    notifications: 'सूचनाएं', notificationsSub: 'मैच, संदेश, लाइक्स',
    language: 'भाषा',
    help: 'सहायता और समर्थन', helpSub: 'सामान्य प्रश्न, संपर्क, सुरक्षा सुझाव',
    premiumTitle: 'Flirty प्रीमियम',
    premiumSub: 'देखें किसने आपको लाइक किया, असीमित सुपर लाइक्स, किसी भी शहर का पासपोर्ट',
    upgrade: 'अपग्रेड करें', logout: 'लॉगआउट', editBio: 'बायो संपादित करें', preview: 'पूर्वावलोकन',
    aboutMe: 'मेरे बारे में', save: 'सहेजें', cancel: 'रद्द करें',
    madeWithLove: 'भारत में ❤️ से बनाया गया • केवल 18+',
  },
  te: {
    discover: 'కనుగొనండి', explore: 'అన్వేషించండి', search: 'శోధన', interests: 'ఆసక్తులు', chats: 'చాట్‌లు', profile: 'ప్రొఫైల్',
    darkMode: 'డార్క్ మోడ్',
    verification: 'ధృవీకరణ', verificationSub: 'ధృవీకరించబడండి • ఎక్కువ మ్యాచ్‌లు పొందండి',
    privacy: 'గోప్యత & భద్రత', privacySub: 'బ్లాక్, రిపోర్ట్, డేటా నియంత్రణలు',
    notifications: 'నోటిఫికేషన్‌లు', notificationsSub: 'మ్యాచ్‌లు, సందేశాలు, లైక్‌లు',
    language: 'భాష',
    help: 'సహాయం & మద్దతు', helpSub: 'FAQలు, సంప్రదింపు, భద్రతా చిట్కాలు',
    premiumTitle: 'Flirty ప్రీమియం',
    premiumSub: 'మిమ్మల్ని ఎవరు ఇష్టపడ్డారో చూడండి, అపరిమిత సూపర్ లైక్‌లు, ఏ నగరానికైనా పాస్‌పోర్ట్',
    upgrade: 'అప్‌గ్రేడ్ చేయండి', logout: 'లాగ్ అవుట్', editBio: 'బయో సవరించండి', preview: 'ప్రివ్యూ',
    aboutMe: 'నా గురించి', save: 'సేవ్ చేయండి', cancel: 'రద్దు చేయండి',
    madeWithLove: 'భారతదేశంలో ❤️ తో తయారు చేయబడింది • 18+ మాత్రమే',
  },
};

type I18nState = {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nState>({
  lang: 'en',
  setLang: () => {},
  t: (key) => DICT.en[key] ?? key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [lang, setLangState] = useState<LanguageCode>('en');

  // Local device preference (works before login), profile.language wins once loaded.
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('flirty_lang') : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser API, not derived from props/state
    if (stored && ['en', 'ta', 'hi', 'te'].includes(stored)) setLangState(stored as LanguageCode);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local UI state once the profile document loads
    if (profile?.language) setLangState(profile.language);
  }, [profile?.language]);

  const setLang = (l: LanguageCode) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('flirty_lang', l);
    if (user) updateLanguage(user.uid, l).catch((err) => console.error(err));
  };

  const t = (key: string) => DICT[lang]?.[key] ?? DICT.en[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
