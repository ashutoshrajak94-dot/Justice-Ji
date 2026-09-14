import React from "react";
import {
  Scale,
  ShieldCheck,
  FileText,
  PhoneCall,
  MessageSquareQuote,
  BookOpen,
  Globe,
  Sparkles,
  Search,
} from "lucide-react";

interface HeaderProps {
  activeTab: "generator" | "websearch" | "drafts" | "chat" | "helplines" | "laws";
  setActiveTab: (
    tab: "generator" | "websearch" | "drafts" | "chat" | "helplines" | "laws"
  ) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-700 text-amber-50 flex items-center justify-center shadow-xs">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-stone-900 font-['Rozha_One',serif]">
                  Justice Ji <span className="text-amber-700 text-lg font-['Yantramanav',sans-serif] font-bold">जस्टिस जी</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  सत्यापित कानूनी सहायक
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 font-medium">
                भारत के नागरिकों के लिए आसान, स्पष्ट व वर्तमान कानून (BNS/BNSS) आधारित कानूनी जानकारी एवं शिकायत ड्राफ्ट्स
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-stone-700">वर्तमान कानून:</span>
            <span>BNS 2023 • BNSS 2023 • BSA 2023 लागू</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-stone-100 pt-1 pb-2">
          <button
            onClick={() => setActiveTab("websearch")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap relative ${
              activeTab === "websearch"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>AI कानूनी खोज (Search)</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold border border-emerald-300">
              Live .gov.in
            </span>
          </button>

          <button
            onClick={() => setActiveTab("generator")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "generator"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            वेबसाइट कंटेंट (Format B)
          </button>

          <button
            onClick={() => setActiveTab("drafts")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "drafts"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Scale className="w-4 h-4" />
            शिकायत / FIR ड्राफ्ट्स
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "chat"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <MessageSquareQuote className="w-4 h-4" />
            कानूनी सवाल पूछें (Q&A)
          </button>

          <button
            onClick={() => setActiveTab("helplines")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "helplines"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            सत्यापित सरकारी हेल्पलाइन (Official)
          </button>

          <button
            onClick={() => setActiveTab("laws")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "laws"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            नए कानून vs पुराने कानून (BNS तालिका)
          </button>
        </nav>
      </div>
    </header>
  );
};

