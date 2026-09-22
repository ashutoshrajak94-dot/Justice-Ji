import React from "react";
import {
  Scale,
  ShieldCheck,
  FileText,
  PhoneCall,
  MessageSquareQuote,
  BookOpen,
  Search,
  BookA,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";

export type NavTab =
  | "websearch"
  | "generator"
  | "drafts"
  | "chat"
  | "dictionary"
  | "helplines"
  | "laws";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    englishLabel: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
  }> = [
    {
      id: "websearch",
      label: "AI कानूनी खोज",
      englishLabel: "Legal Search",
      icon: <Search className="w-5 h-5 shrink-0" />,
      badge: "Live .gov.in",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    },
    {
      id: "generator",
      label: "वेबसाइट कंटेंट",
      englishLabel: "Format B Generator",
      icon: <Sparkles className="w-5 h-5 shrink-0" />,
      badge: "5 नियम",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    },
    {
      id: "drafts",
      label: "शिकायत / FIR ड्राफ्ट",
      englishLabel: "Legal Drafts",
      icon: <FileText className="w-5 h-5 shrink-0" />,
      badge: "PDF/प्रिंट",
      badgeColor: "bg-stone-200 text-stone-700 border-stone-300",
    },
    {
      id: "chat",
      label: "कानूनी सवाल-जवाब",
      englishLabel: "Q&A Legal Chat",
      icon: <MessageSquareQuote className="w-5 h-5 shrink-0" />,
    },
    {
      id: "dictionary",
      label: "कानूनी शब्दकोश",
      englishLabel: "Legal Dictionary",
      icon: <BookA className="w-5 h-5 shrink-0" />,
      badge: "15 शब्द",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    },
    {
      id: "helplines",
      label: "सत्यापित हेल्पलाइन",
      englishLabel: "Helplines & Portals",
      icon: <PhoneCall className="w-5 h-5 shrink-0" />,
      badge: "1930/112",
      badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
    },
    {
      id: "laws",
      label: "नए कानून vs पुराने",
      englishLabel: "BNS vs IPC Table",
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
    },
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-stone-900 text-stone-200 select-none border-r border-stone-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Scale className="w-5 h-5" />
          </div>
          {(!isCollapsed || mobileOpen) && (
            <div className="leading-tight truncate">
              <h1 className="text-xl font-black text-amber-50 font-['Rozha_One',serif] tracking-wide flex items-center gap-1.5">
                Justice Ji
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-sans font-bold border border-amber-500/30">
                  AI
                </span>
              </h1>
              <p className="text-[11px] text-stone-400 font-medium truncate font-sans">
                सत्यापित भारतीय विधिक सहायक
              </p>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          aria-label="क्लोज साइडबार"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          title={isCollapsed ? "साइडबार खोलें" : "साइडबार संक्षिप्त करें"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5 no-scrollbar">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          {!isCollapsed || mobileOpen ? "मुख्य सेवाएं (Services)" : "•••"}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? "bg-amber-600 text-white font-semibold shadow-md shadow-amber-900/20"
                  : "text-stone-300 hover:bg-stone-800/80 hover:text-white"
              }`}
              title={item.label}
            >
              <span
                className={`${
                  isActive
                    ? "text-white"
                    : "text-stone-400 group-hover:text-amber-400 transition-colors"
                }`}
              >
                {item.icon}
              </span>

              {(!isCollapsed || mobileOpen) && (
                <div className="flex-1 text-left flex items-center justify-between overflow-hidden">
                  <div className="truncate">
                    <div className="truncate">{item.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive ? "text-amber-100" : "text-stone-400"
                      }`}
                    >
                      {item.englishLabel}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 border shrink-0 ${
                        isActive
                          ? "bg-amber-700 text-amber-100 border-amber-500"
                          : item.badgeColor || "bg-stone-800 text-stone-300 border-stone-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Tooltip for collapsed desktop state */}
              {isCollapsed && !mobileOpen && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-stone-950 text-white text-xs rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-stone-800 bg-stone-950/60">
        {(!isCollapsed || mobileOpen) ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-stone-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-stone-200">100% गजट पुष्ट</span>
              <span className="text-stone-400">• BNS 2023</span>
            </div>
            <div className="p-2 rounded-lg bg-stone-800/80 border border-stone-700/60 text-[10px] text-stone-400 leading-snug">
              <span className="text-amber-400 font-semibold">नियम:</span> अप्रमाणित धारा पर स्वतः FAIL चेतावनी; केवल वास्तविक दंडात्मक उपधारा ही मान्य।
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="100% BNS 2023 गजट सत्यापित">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 left-0 bottom-0 z-30 transition-all duration-300 ${
          isCollapsed ? "w-18" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] shadow-2xl transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
