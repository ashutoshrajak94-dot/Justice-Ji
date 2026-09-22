import React from "react";
import {
  Menu,
  ShieldCheck,
  Scale,
  Sparkles,
  PhoneCall,
  Search,
  BookA,
  FileText,
  MessageSquareQuote,
  BookOpen,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { NavTab } from "./Sidebar";
import { useTheme } from "../context/ThemeContext";
import { useLanguage, SUPPORTED_LANGUAGES } from "../context/LanguageContext";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, setLanguageByCode, t } = useLanguage();

  const getTabInfo = () => {
    switch (activeTab) {
      case "websearch":
        return {
          title: t("navWebSearch"),
          subtitle: "BNS / BNSS 2023 Live",
          icon: <Search className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      case "generator":
        return {
          title: t("navGenerator"),
          subtitle: "Format B सरकारी पोर्टल व धाराएं",
          icon: <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      case "drafts":
        return {
          title: t("navDrafts"),
          subtitle: "कोर्ट व थाने योग्य कानूनी प्रारूप",
          icon: <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      case "chat":
        return {
          title: t("navChat"),
          subtitle: "सवाल-जवाब व अधिकारों की जानकारी",
          icon: <MessageSquareQuote className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      case "dictionary":
        return {
          title: t("navDictionary"),
          subtitle: "15 मुख्य शब्दों का प्रामाणिक संग्रह",
          icon: <BookA className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      case "helplines":
        return {
          title: t("navHelplines"),
          subtitle: "1930 साइबर, 112 आपातकालीन, 1915",
          icon: <PhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      case "laws":
        return {
          title: t("navLaws"),
          subtitle: "नए व पुराने कानून का मिलान",
          icon: <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      default:
        return {
          title: "Justice Ji",
          subtitle: "सत्यापित भारतीय विधिक पोर्टल",
          icon: <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
    }
  };

  const tabInfo = getTabInfo();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4.5rem] sm:min-h-[5rem] py-2 sm:py-2.5 gap-2 sm:gap-4 relative">
          
          {/* Left: Mobile Hamburger & Desktop current view indicator */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="मेनू खोलें"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Current View Category Chip on Desktop */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold shadow-2xs">
              {tabInfo.icon}
              <span className="text-stone-800 dark:text-white font-bold">{tabInfo.title}</span>
            </div>
          </div>

          {/* Center: Extra Large & Extrabold 'Justice Ji' Authority Branding */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
            <button
              onClick={() => setActiveTab("websearch")}
              className="group flex items-center gap-2.5 sm:gap-3.5 px-3 py-1.5 rounded-2xl hover:bg-amber-500/10 dark:hover:bg-amber-400/10 transition-all cursor-pointer focus:outline-none"
              title="Justice Ji होम पेज"
            >
              {/* Grand Brand Icon Badge */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 ring-2 ring-amber-500/30">
                <Scale className="w-5 h-5 sm:w-7 sm:h-7 md:w-7.5 md:h-7.5 stroke-[2.2]" />
              </div>

              {/* Extra Large Logo Name */}
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2 leading-none">
                  <span className="font-black text-stone-950 dark:text-white font-['Rozha_One',serif] text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight drop-shadow-2xs">
                    Justice Ji
                  </span>
                  <span className="text-[10px] sm:text-xs md:text-sm px-2 py-0.5 rounded-full bg-amber-600/15 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 font-sans font-black border border-amber-600/30 dark:border-amber-400/40">
                    AI
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[11px] md:text-xs text-stone-500 dark:text-stone-300 font-semibold tracking-wide mt-0.5">
                  {t("brandSubtitle")}
                </span>
              </div>
            </button>
          </div>

          {/* Right: Controls (Theme Toggle, Language Selector & Quick Action) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
            {/* Live Gazette Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t("liveGazetteBadge")}</span>
            </div>

            {/* Language Selector Dropdown */}
            <div className="relative flex items-center">
              <label htmlFor="header-language-select" className="sr-only">
                भाषा चुनें
              </label>
              <div className="relative inline-flex items-center">
                <Globe className="w-4 h-4 text-stone-500 dark:text-stone-400 absolute left-2.5 pointer-events-none" />
                <select
                  id="header-language-select"
                  value={currentLanguage.code}
                  onChange={(e) => setLanguageByCode(e.target.value)}
                  className="pl-8 pr-7 py-2 text-xs sm:text-sm font-bold bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer appearance-none shadow-2xs"
                  title="भाषा चुनें / Select Language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="dark:bg-stone-900 text-stone-900 dark:text-white">
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 text-[10px] text-stone-500 dark:text-stone-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-xl text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer shadow-2xs"
              title={theme === "dark" ? t("toggleThemeLight") : t("toggleThemeDark")}
              aria-label="Toggle Dark/Light Theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4.5 h-4.5 text-amber-400 animate-in spin-in-90 duration-200" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-stone-700 animate-in spin-in-90 duration-200" />
              )}
            </button>

            {/* Helpline Fast Button */}
            {activeTab !== "helplines" && (
              <button
                onClick={() => setActiveTab("helplines")}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-black transition-all border border-amber-200 dark:border-amber-800 shadow-2xs cursor-pointer"
                title="आपातकालीन 1930 / 112"
              >
                <PhoneCall className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>1930</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
