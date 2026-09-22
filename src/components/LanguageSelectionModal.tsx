import React, { useState } from "react";
import { Scale, Check, Sparkles, Globe } from "lucide-react";
import { useLanguage, SUPPORTED_LANGUAGES, LanguageOption } from "../context/LanguageContext";

export const LanguageSelectionModal: React.FC = () => {
  const { isFirstTimeModalOpen, confirmLanguageSelection, currentLanguage, t } = useLanguage();
  const [selectedCode, setSelectedCode] = useState<string>(currentLanguage.code);

  if (!isFirstTimeModalOpen) {
    return null;
  }

  const handleConfirm = (codeToConfirm?: string) => {
    const finalCode = codeToConfirm || selectedCode;
    confirmLanguageSelection(finalCode);
  };

  const selectedLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedCode) || SUPPORTED_LANGUAGES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-7 relative overflow-hidden text-center animate-in zoom-in-95 duration-200">
        
        {/* Subtle decorative glowing background blur */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-amber-600/15 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Icon & Welcome Tag */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center shadow-lg mb-2.5 ring-4 ring-amber-100 dark:ring-amber-950/60">
            <Scale className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Justice Ji AI Legal Portal</span>
          </div>

          <h2
            id="language-modal-title"
            className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white font-['Rozha_One',serif] tracking-tight"
          >
            {t("modalWelcomeTitle")}
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1.5 max-w-md mx-auto leading-relaxed">
            {t("modalWelcomeSubtitle")}
          </p>
        </div>

        {/* Language Grid: 13 Indian Languages */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 max-h-64 sm:max-h-72 overflow-y-auto p-1 text-left scrollbar-thin">
          {SUPPORTED_LANGUAGES.map((lang: LanguageOption) => {
            const isSelected = selectedCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedCode(lang.code)}
                onDoubleClick={() => handleConfirm(lang.code)}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all text-left cursor-pointer group ${
                  isSelected
                    ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700/80"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 overflow-hidden">
                  <span className="text-lg shrink-0">{lang.flag}</span>
                  <div className="flex flex-col truncate">
                    <span
                      className={`text-sm sm:text-base font-bold truncate ${
                        isSelected
                          ? "text-amber-950 dark:text-amber-200"
                          : "text-stone-900 dark:text-stone-100"
                      }`}
                    >
                      {lang.nativeName}
                    </span>
                    <span className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium truncate">
                      {lang.name}
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600 shrink-0 group-hover:border-stone-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Button & Note */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => handleConfirm()}
            className="w-full py-3 sm:py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Globe className="w-4 h-4" />
            <span>
              {selectedLang.nativeName} में शुरू करें / {t("modalContinueButton")}
            </span>
          </button>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
            {t("modalNote")}
          </p>
        </div>

      </div>
    </div>
  );
};
