import React from "react";
import { Scale, ShieldAlert, ExternalLink, Heart } from "lucide-react";

export const DisclaimerFooter: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-stone-200 bg-stone-900 text-stone-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Legal Disclaimer Box */}
        <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start gap-4">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm text-stone-300 leading-relaxed space-y-1">
            <h4 className="font-bold text-amber-400 text-sm">
              वैधानिक अस्वीकरण (Legal Disclaimer - नियम A8 व A7):
            </h4>
            <p>
              &ldquo;Justice Ji&rdquo; केवल भारत के आम नागरिकों और कानूनी कंटेंट राइटर्स के लिए <strong>सामान्य कानूनी जानकारी, धाराएं व शिकायत प्रारूप</strong> उपलब्ध कराता है। यह किसी न्यायालय या अधिवक्ता द्वारा दी जाने वाली <strong>व्यक्तिगत कानूनी सलाह (Legal Advice) का विकल्प नहीं है</strong>।
            </p>
            <p className="text-stone-400 text-xs">
              प्रत्येक मामले की परिस्थितियां, स्थान, साक्ष्य और समय सीमा भिन्न हो सकती हैं। किसी भी विधिक कार्यवाही, एफआईआर या मुकदमे से पूर्व अपने स्थानीय पंजीकृत अधिवक्ता (Advocate) या जिला विधिक सेवा प्राधिकरण (DLSA / NALSA हेल्पलाइन: 15100) से परामर्श अवश्य लें।
            </p>
          </div>
        </div>

        {/* Quick Links to Official Government Portals */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-800 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-stone-200">Justice Ji Legal Content Assistant</span>
            <span>• भारतीय कानून (BNS, BNSS, BSA) आधारित</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              cybercrime.gov.in <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://consumerhelpline.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              consumerhelpline.gov.in <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://nalsa.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              nalsa.gov.in <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://ecourts.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              ecourts.gov.in <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="text-center text-[11px] text-stone-500 flex items-center justify-center gap-1">
          <span>भारत के आम नागरिकों के सशक्तिकरण हेतु समर्पित</span>
        </div>
      </div>
    </footer>
  );
};
