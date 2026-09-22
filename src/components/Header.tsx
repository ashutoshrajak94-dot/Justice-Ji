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
} from "lucide-react";
import { NavTab } from "./Sidebar";

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
  const getTabInfo = () => {
    switch (activeTab) {
      case "websearch":
        return {
          title: "AI कानूनी खोज (Legal Search)",
          subtitle: "सरल हिंदी में समस्या लिखें • BNS 2023 से सटीक धारा व समाधान",
          icon: <Search className="w-5 h-5 text-amber-700" />,
        };
      case "generator":
        return {
          title: "वेबसाइट कंटेंट जनरेटर (Format B)",
          subtitle: "5 अनिवार्य नियमों के साथ आधिकारिक वेब पोर्टल व धाराएं",
          icon: <Sparkles className="w-5 h-5 text-amber-700" />,
        };
      case "drafts":
        return {
          title: "शिकायत / FIR / लीगल नोटिस ड्राफ्ट",
          subtitle: "कोर्ट व थाने में जमा करने योग्य प्रामाणिक कानूनी प्रारूप",
          icon: <FileText className="w-5 h-5 text-amber-700" />,
        };
      case "chat":
        return {
          title: "कानूनी सवाल-जवाब (Legal Assistant Chat)",
          subtitle: "तत्काल विधिक परामर्श व अधिकारों की जानकारी",
          icon: <MessageSquareQuote className="w-5 h-5 text-amber-700" />,
        };
      case "dictionary":
        return {
          title: "कानूनी शब्दकोश (Legal Dictionary)",
          subtitle: "15 मुख्य कानूनी शब्दों का प्रामाणिक व सरल संग्रह",
          icon: <BookA className="w-5 h-5 text-amber-700" />,
        };
      case "helplines":
        return {
          title: "सत्यापित सरकारी हेल्पलाइन व पोर्टल्स",
          subtitle: "1930 साइबर, 112 आपातकालीन, 1915 उपभोक्ता व e-Daakhil",
          icon: <PhoneCall className="w-5 h-5 text-amber-700" />,
        };
      case "laws":
        return {
          title: "नए कानून vs पुराने कानून (BNS तालिका)",
          subtitle: "IPC, CrPC, IEA के स्थान पर BNS, BNSS, BSA की तुलना",
          icon: <BookOpen className="w-5 h-5 text-amber-700" />,
        };
      default:
        return {
          title: "Justice Ji कानूनी सहायक",
          subtitle: "सत्यापित भारतीय विधिक पोर्टल",
          icon: <Scale className="w-5 h-5 text-amber-700" />,
        };
    }
  };

  const tabInfo = getTabInfo();

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Mobile Hamburger & Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              aria-label="मेनू खोलें"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-4 h-4" />
              </div>
              <span className="font-bold text-stone-900 font-['Rozha_One',serif] text-lg">
                Justice Ji
              </span>
            </div>

            {/* Desktop Active View Title & Breadcrumb */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-2xs">
                {tabInfo.icon}
              </div>
              <div>
                <h1 className="text-base font-bold text-stone-900 leading-tight">
                  {tabInfo.title}
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  {tabInfo.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Status Indicators & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>BNS 2023 • Live .gov.in</span>
            </div>

            {activeTab !== "websearch" && (
              <button
                onClick={() => setActiveTab("websearch")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>नई कानूनी खोज</span>
              </button>
            )}

            {activeTab !== "helplines" && (
              <button
                onClick={() => setActiveTab("helplines")}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all border border-stone-200"
              >
                <PhoneCall className="w-3.5 h-3.5 text-stone-600" />
                <span>हेल्पलाइन (1930 / 112)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
