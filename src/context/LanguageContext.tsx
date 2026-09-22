import React, { createContext, useContext, useEffect, useState } from "react";
import {
  SUPPORTED_LANGUAGES,
  LanguageOption,
  TranslationKey,
  getTranslation,
} from "../utils/translations";

export { SUPPORTED_LANGUAGES, type LanguageOption, type TranslationKey };

interface LanguageContextType {
  currentLanguage: LanguageOption;
  setLanguageByCode: (code: string) => void;
  confirmLanguageSelection: (code: string) => void;
  supportedLanguages: LanguageOption[];
  hasSelectedLanguage: boolean;
  isFirstTimeModalOpen: boolean;
  setIsFirstTimeModalOpen: (open: boolean) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if user has previously confirmed language selection
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("justiceji_has_selected_language") === "true";
    }
    return false;
  });

  const [isFirstTimeModalOpen, setIsFirstTimeModalOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const alreadySelected = localStorage.getItem("justiceji_has_selected_language") === "true";
      return !alreadySelected; // Open modal if NOT selected before
    }
    return false;
  });

  const [currentCode, setCurrentCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("justice_ji_language");
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
        return stored;
      }
    }
    return "hi"; // Hindi default
  });

  useEffect(() => {
    localStorage.setItem("justice_ji_language", currentCode);
    document.documentElement.lang = currentCode;
  }, [currentCode]);

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentCode) || SUPPORTED_LANGUAGES[0];

  const setLanguageByCode = (code: string) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === code)) {
      setCurrentCode(code);
    }
  };

  /**
   * User confirms language choice in the First-Time Language Modal:
   * Sets the language, saves to localStorage so modal never prompts again on future visits,
   * and closes the modal.
   */
  const confirmLanguageSelection = (code: string) => {
    setLanguageByCode(code);
    setHasSelectedLanguage(true);
    setIsFirstTimeModalOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("justiceji_has_selected_language", "true");
      localStorage.setItem("justice_ji_language", code);
    }
  };

  /**
   * Helper translation function t(key)
   */
  const t = (key: TranslationKey): string => {
    return getTranslation(currentLanguage.code, key);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguageByCode,
        confirmLanguageSelection,
        supportedLanguages: SUPPORTED_LANGUAGES,
        hasSelectedLanguage,
        isFirstTimeModalOpen,
        setIsFirstTimeModalOpen,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
