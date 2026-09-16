import React, { useState, useRef, useEffect } from "react";
import {
  Globe,
  Search,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  MapPin,
  Clock,
  Building2,
  FolderCheck,
  PhoneCall,
  Sparkles,
  Layers,
  ArrowRight,
  BookOpen,
  X,
  Scale,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LegalResearchResult } from "../types";
import { VoiceInputButton } from "./VoiceInputButton";
import { LegalSectionDisplay, FormattedLegalContent } from "./LegalTextFormatter";

const POPULAR_NOVEL_QUERIES = [
  {
    title: "मेरी बाइक चोरी हो गई",
    category: "चोरी / BNS धारा 303(2)",
    facts: "घर के बाहर खड़ी बाइक रात में चोरी हो गई। नंबर प्लेट व आरसी उपलब्ध है।",
  },
  {
    title: "पड़ोसी गाली-गलौज और अभद्रता कर रहा है",
    category: "शांति भंग / BNS धारा 352",
    facts: "पड़ोसी आए दिन सार्वजनिक रूप से गंदी-गंदी गालियां देता है और मोहल्ले में विवाद उत्पन्न करता है।",
  },
  {
    title: "खेत/जमीन पर दबंगों ने कब्जा कर लिया",
    category: "अवैध कब्जा / राजस्व व अतिचार",
    facts: "मेरी पैतृक जमीन की मेढ़ तोड़कर पड़ोसियों ने जबरन कब्जा कर लिया और जुताई करने नहीं दे रहे।",
  },
  {
    title: "जान से मारने की धमकी मिल रही है",
    category: "आपराधिक धमकी / BNS धारा 351(2)",
    facts: "फोन पर और रास्ते में रोककर जान से मारने व हाथ-पैर तोड़ने की लगातार धमकियां दी जा रही हैं।",
  },
  {
    title: "ऑनलाइन खाते से फर्जी तरीके से पैसे कट गए",
    category: "साइबर ठगी / BNS 318(4) व 1930",
    facts: "अनजान व्यक्ति ने बिजली बिल अपडेट के नाम पर लिंक भेजा और बैंक खाते से 45,000 रुपये कट गए।",
  },
  {
    title: "बिल्डर 3 साल से फ्लैट का कब्जा नहीं दे रहा",
    category: "RERA / उपभोक्ता अधिकार",
    facts: "बिल्डर ने 2021 में एग्रीमेंट किया था, 95% भुगतान हो चुका है लेकिन अब तक पजेशन नहीं मिला और न ही ब्याज दिया जा रहा है।",
  },
  {
    title: "बैंक लोन रिकवरी एजेंट धमका रहा है",
    category: "बैंकिंग / RBI नियम",
    facts: "लोन की एक किस्त लेट होने पर रिकवरी एजेंट रिश्तेदारों को फोन कर रहे हैं और घर आकर अपमानित कर रहे हैं।",
  },
  {
    title: "चेक बाउंस हो गया है",
    category: "चेक अनादर / NI Act धारा 138",
    facts: "सामान के बदले दिया गया 2 लाख रुपये का चेक बैंक में खाते में पर्याप्त धनराशि न होने के कारण बाउंस हो गया।",
  },
];

const INDIAN_STATES = [
  "उत्तर प्रदेश",
  "बिहार",
  "दिल्ली (NCT)",
  "राजस्थान",
  "मध्य प्रदेश",
  "महाराष्ट्र",
  "पश्चिम बंगाल",
  "हरियाणा",
  "पंजाब",
  "गुजरात",
  "उत्तराखंड",
  "झारखंड",
  "छत्तीसगढ़",
  "कर्नाटक",
  "तमिलनाडु",
  "अन्य राज्य / केंद्र शासित प्रदेश",
];

interface LegalWebSearchProps {
  onOpenDraft?: (draftContent: string, draftType: string) => void;
  onSaveNewTopic?: (topic: { title: string; content: string }) => void;
}

export const getHardFailStatus = (res: LegalResearchResult | null | undefined) => {
  if (!res) return { isHardFailed: false, reason: "" };

  if (res.isOverallVerified === false) {
    return {
      isHardFailed: true,
      reason: res.hardFailReason || "वैधानिक साक्ष्य अपूर्ण है (आधिकारिक सत्यापन शेष है)",
    };
  }

  const content = res.formatBContent || "";
  const details = res.legalSectionDetails;

  // Specific check for Section 130 or any section where fine/penalty or amendment needs verification
  const isSec130 =
    /(?:धारा\s*130|section\s*130)/i.test(
      (res.applicableLaw || "") + " " + (details?.sectionNumber || "") + " " + content + " " + (res.question || "")
    );

  if (isSec130) {
    const hasUnverifiedText =
      content.includes("verification आवश्यक") ||
      content.includes("पुष्टि आवश्यक") ||
      content.includes("NOT VERIFIED") ||
      content.includes("FAIL") ||
      Boolean(details?.fineAmount?.includes("verification")) ||
      Boolean(details?.fineAmount?.includes("पुष्टि")) ||
      Boolean(details?.isUncertain);

    if (hasUnverifiedText) {
      return {
        isHardFailed: true,
        reason: "धारा 130 का संशोधित वैधानिक साक्ष्य अपूर्ण है",
      };
    }
  }

  if (details?.isUncertain) {
    return {
      isHardFailed: true,
      reason: details.uncertaintyMessage || "आधिकारिक कानून के मूल प्रावधान से इस धारा/दंड की पुष्टि नहीं हो पा रही है",
    };
  }

  if (details?.fineAmount && /verification\s*आवश्यक|पुष्टि\s*आवश्यक|अपुष्ट|not\s*verified|unverified/i.test(details.fineAmount)) {
    const sec = details.sectionNumber || "धारा";
    return {
      isHardFailed: true,
      reason: `${sec} का संशोधित वैधानिक साक्ष्य अपूर्ण है`,
    };
  }

  if (details?.punishment && /verification\s*आवश्यक|पुष्टि\s*आवश्यक|अपुष्ट|not\s*verified|unverified/i.test(details.punishment)) {
    const sec = details.sectionNumber || "धारा";
    return {
      isHardFailed: true,
      reason: `${sec} का संशोधित वैधानिक साक्ष्य अपूर्ण है`,
    };
  }

  if (/(?:STATUS:\s*OVERALL\s*RESULT:\s*FAIL|OVERALL\s*RESULT:\s*FAIL|NOT\s*VERIFIED)/i.test(content)) {
    const match = content.match(/FAIL\s*\(([^)]+)\)/i);
    return {
      isHardFailed: true,
      reason: match ? match[1] : "वैधानिक साक्ष्य अपूर्ण है",
    };
  }

  if (/(?:verification\s*आवश्यक|पुष्टि\s*आवश्यक|साक्ष्य\s*अपूर्ण)/i.test(content)) {
    const match = content.match(/(?:धारा|section)\s*(\d+[A-Za-z]?)[^.\n]*(?:verification आवश्यक|पुष्टि आवश्यक|साक्ष्य अपूर्ण)/i);
    const sec = match ? `धारा ${match[1]}` : (details?.sectionNumber || "धारा");
    return {
      isHardFailed: true,
      reason: `${sec} का संशोधित वैधानिक साक्ष्य अपूर्ण है`,
    };
  }

  return { isHardFailed: false, reason: "" };
};

export const LegalWebSearch: React.FC<LegalWebSearchProps> = ({
  onOpenDraft,
  onSaveNewTopic,
}) => {
  const [query, setQuery] = useState<string>("");
  const [userState, setUserState] = useState<string>("");
  const [userDistrict, setUserDistrict] = useState<string>("");
  const [userFacts, setUserFacts] = useState<string>("");
  const [needDraft, setNeedDraft] = useState<boolean>(true);
  const [showLocationFilters, setShowLocationFilters] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LegalResearchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Tracks if a search has been completed and input should clear on new typing/speech
  const isFreshInputPending = useRef<boolean>(false);
  const lastSubmittedQuery = useRef<string>("");
  const isSubmittingRef = useRef<boolean>(false);

  // PART 2: Auto-scroll tracking - scroll ONCE per newly submitted question after answer finishes loading
  const resultSectionRef = useRef<HTMLDivElement | null>(null);
  const currentSubmissionId = useRef<number>(0);
  const lastScrolledSubmissionId = useRef<number>(0);

  // Smooth scroll ONCE to the beginning of the newly generated answer
  useEffect(() => {
    if (result && !isLoading && currentSubmissionId.current > lastScrolledSubmissionId.current) {
      lastScrolledSubmissionId.current = currentSubmissionId.current;

      // Small delay ensuring DOM has completely painted the answer section
      const timer = setTimeout(() => {
        const targetElement =
          resultSectionRef.current || document.getElementById("legal-research-result");
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [result, isLoading]);

  const handleSelectPreset = (preset: (typeof POPULAR_NOVEL_QUERIES)[0]) => {
    isFreshInputPending.current = false;
    setQuery(preset.title);
    setUserFacts(preset.facts);
    setErrorMessage(null);
    // Note: previous answer remains visible below until user clicks Search
  };

  // When user focuses on query textarea - keep stable without selecting or jumping
  const handleQueryFocus = () => {
    // Neutral focus: do not auto-select text or scroll unnecessarily
  };

  // When user starts typing with a physical keyboard (laptop/desktop)
  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearchAndResearch();
      return;
    }

    if (isFreshInputPending.current) {
      const isModifierOrNav =
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.key === "Tab" ||
        e.key === "Escape" ||
        e.key === "Shift" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Meta" ||
        e.key === "CapsLock" ||
        e.key.startsWith("Arrow");

      if (!isModifierOrNav) {
        isFreshInputPending.current = false;
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          setQuery("");
        } else if (e.key.length === 1) {
          // Immediately replace with the new typed character only
          e.preventDefault();
          setQuery(e.key);
        }
      }
    }
  };

  // Mobile virtual keyboards & modern browsers (before DOM mutation)
  const handleQueryBeforeInput = (e: any) => {
    if (isFreshInputPending.current) {
      if (e.data) {
        if (typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        isFreshInputPending.current = false;
        setQuery(e.data);
      } else if (e.inputType === "deleteContentBackward" || e.inputType === "deleteContentForward") {
        if (typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        isFreshInputPending.current = false;
        setQuery("");
      }
    }
  };

  // Paste handling: replace previous question immediately with pasted text
  const handleQueryPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isFreshInputPending.current) {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      isFreshInputPending.current = false;
      setQuery(pasted);
    }
  };

  // Universal input change handler (mobile virtual keyboard fallback, IME composition)
  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (isFreshInputPending.current) {
      isFreshInputPending.current = false;
      const prev = lastSubmittedQuery.current;
      if (prev) {
        // Strip previous question completely if it got combined with new input
        if (val.startsWith(prev)) {
          setQuery(val.slice(prev.length).trimStart());
          return;
        }
        if (val.endsWith(prev)) {
          setQuery(val.slice(0, val.length - prev.length).trimEnd());
          return;
        }
        if (val.includes(prev)) {
          setQuery(val.replace(prev, "").trim());
          return;
        }
        // If user deleted part of old question on mobile virtual keyboard
        if (prev.startsWith(val) || prev.includes(val)) {
          setQuery("");
          return;
        }
      }
    }
    setQuery(val);
  };

  const handleSearchAndResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Prevent duplicate submissions or concurrent repeated requests
    if (isLoading || isSubmittingRef.current) return;

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setErrorMessage("कृपया अपनी कानूनी समस्या या सवाल दर्ज करें।");
      return;
    }

    // Prevent accidental repeated search of the exact same query if answer is already displayed
    if (
      result &&
      cleanQuery === lastSubmittedQuery.current &&
      isFreshInputPending.current
    ) {
      const targetElement =
        resultSectionRef.current || document.getElementById("legal-research-result");
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSavedSuccess(false);
    currentSubmissionId.current += 1;

    try {
      const response = await fetch("/api/research-new-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuery,
          state: userState.trim(),
          district: userDistrict.trim(),
          userFacts: userFacts.trim(),
          generateDraft: needDraft,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "कानूनी खोज में समस्या आई।");
      }

      setResult(json.data);
      lastSubmittedQuery.current = cleanQuery;
      isFreshInputPending.current = true;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || "खोज व सत्यापन में समस्या आई। कृपया पुनः प्रयास करें।"
      );
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!result) return;
    if (hardFail.isHardFailed) {
      navigator.clipboard.writeText(
        `STATUS: OVERALL RESULT: FAIL (${hardFail.reason})\nवैधानिक साक्ष्य अपूर्ण होने के कारण यह कानूनी लेख असत्यापित (UNVERIFIED) है।`
      );
    } else {
      navigator.clipboard.writeText(result.formatBContent);
    }
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleCopyHtml = () => {
    if (!result) return;
    if (hardFail.isHardFailed) {
      navigator.clipboard.writeText(
        `<div class="justice-ji-fail-notice" style="color: #b91c1c; font-weight: bold; border: 2px solid #dc2626; padding: 1rem;">STATUS: OVERALL RESULT: FAIL (${hardFail.reason})<br />वैधानिक साक्ष्य अपूर्ण होने के कारण लेख ब्लॉक किया गया है।</div>`
      );
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2500);
      return;
    }

    const lines = result.formatBContent.split("\n");
    let html = `<div class="justice-ji-legal-article">\n`;
    let inPunishment = false;
    let inFine = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        inPunishment = false;
        inFine = false;
        html += `<br />\n`;
      } else if (trimmed.startsWith("<u>") && trimmed.endsWith("</u>")) {
        html += `  <h2 style="font-size: 1.5rem; font-weight: bold; text-decoration: underline; color: #1c1917;">${trimmed.replace(/<\/?u>/g, "")}</h2>\n`;
      } else if (
        trimmed.includes("इस जानकारी की आधिकारिक पुष्टि आवश्यक है") ||
        trimmed.includes("बिना सत्यापन के धारा/सजा/जुर्माना बताना उचित नहीं होगा")
      ) {
        html += `  <p style="color: #92400e; font-style: italic; font-weight: 600; line-height: 1.6; margin: 0.5rem 0;">⚠️ ${trimmed}</p>\n`;
      } else if (/^(•\s*)?(धारा|धारा संख्या|Section)\s*[:\/-]/i.test(trimmed)) {
        // Section: Blue font color only; no colored background, box, border, or highlight
        inPunishment = false;
        inFine = false;
        html += `  <p style="color: #1d4ed8; font-weight: 600; line-height: 1.6; margin: 0.5rem 0;">${trimmed}</p>\n`;
      } else if (/^(🔴\s*)?(सजा|Punishment)\s*[:\/-]/i.test(trimmed)) {
        // Punishment header: Red font color only; no colored background, box, border, or highlight
        inPunishment = true;
        inFine = false;
        html += `  <p style="color: #dc2626; font-weight: 600; line-height: 1.6; margin: 0.5rem 0;">${trimmed}</p>\n`;
      } else if (inPunishment && /^(•\s*)?(न्यूनतम|अधिकतम|सजा की प्रकृति|प्रकृति)\s*[:\/-]/i.test(trimmed)) {
        // Punishment sublines: Red font color only
        html += `  <p style="color: #dc2626; font-weight: 600; margin-left: 1rem; line-height: 1.6;">${trimmed}</p>\n`;
      } else if (/^(🟠\s*)?(जुर्माना|Fine|Penalty)\s*[:\/-]/i.test(trimmed)) {
        // Fine header: Orange font color only; no colored background, box, border, or highlight
        inFine = true;
        inPunishment = false;
        html += `  <p style="color: #ea580c; font-weight: 600; line-height: 1.6; margin: 0.5rem 0;">${trimmed}</p>\n`;
      } else if (inFine && /^(•\s*)?(राशि|अन्य शर्त|विवेक|पेनाल्टी)\s*[:\/-]/i.test(trimmed)) {
        // Fine sublines: Orange font color only
        html += `  <p style="color: #ea580c; font-weight: 600; margin-left: 1rem; line-height: 1.6;">${trimmed}</p>\n`;
      } else if (/^[1-7]\.\s/.test(trimmed) || /^(⚖️|🟢)/.test(trimmed)) {
        inPunishment = false;
        inFine = false;
        html += `  <h3 style="font-size: 1.2rem; font-weight: 600; color: #1c1917; margin-top: 1rem;">${trimmed}</h3>\n`;
      } else if (trimmed.startsWith("•")) {
        html += `  <p style="margin-left: 1rem; line-height: 1.6; color: #292524;">${trimmed}</p>\n`;
      } else if (trimmed.startsWith("ध्यान रखें:")) {
        html += `  <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 0.75rem 1rem; margin-top: 1rem; font-weight: 500; color: #78350f;"><strong>${trimmed}</strong></div>\n`;
      } else {
        html += `  <p style="line-height: 1.6; color: #292524;">${trimmed}</p>\n`;
      }
    }
    html += `\n  <div style="margin-top: 1rem; font-size: 0.85rem; color: #57534e;">सत्यापन तिथि: ${result.verificationDate} | आधिकारिक स्रोत: भारत सरकार के अधिकृत पोर्टल (.gov.in / indiacode.nic.in)</div>\n`;
    html += `</div>`;

    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  const handleCopyDraft = () => {
    if (!result?.generatedDraft) return;
    navigator.clipboard.writeText(result.generatedDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  const handleSaveTopic = () => {
    if (!result) return;
    const hardFail = getHardFailStatus(result);
    if (hardFail.isHardFailed) {
      alert("हार्ड-फेल गेट प्रवर्तन: असत्यापित विषय (UNVERIFIED) को Justice Ji के सत्यापित विषयों में नहीं जोड़ा जा सकता।");
      return;
    }
    if (onSaveNewTopic) {
      onSaveNewTopic({
        title: result.question,
        content: result.formatBContent,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const hardFail = getHardFailStatus(result);

  return (
    <div className="space-y-5">
      {/* 1. TOP PRIMARY SEARCH BAR CARD (पेज में सबसे ऊपर) */}
      <div className="bg-white rounded-2xl border border-stone-300 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-700 text-amber-50 flex items-center justify-center shrink-0 shadow-xs">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                कानूनी खोज एवं त्वरित समाधान (Legal Search)
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                सरल बोलचाल की हिंदी में लिखें • धारा या जटिल कानूनी शब्द जानने की ज़रूरत नहीं
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              BNS / BNSS 2023 • Live .gov.in
            </span>
          </div>
        </div>

        {/* Primary Search Form */}
        <form onSubmit={handleSearchAndResearch} className="space-y-3">
          <div className="relative">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center rounded-xl border-2 border-amber-600/50 bg-stone-50/40 focus-within:border-amber-700 focus-within:bg-white focus-within:shadow-md transition-all">
              <textarea
                value={query}
                onFocus={handleQueryFocus}
                onKeyDown={handleQueryKeyDown}
                onBeforeInput={handleQueryBeforeInput}
                onPaste={handleQueryPaste}
                onChange={handleQueryChange}
                placeholder="अपनी कानूनी समस्या यहाँ लिखें (जैसे: मेरी बाइक चोरी हो गई, पड़ोसी गाली-गलौज कर रहा है, जमीन पर कब्जा कर लिया, चेक बाउंस हो गया, जान से मारने की धमकी...)"
                rows={2}
                className="w-full px-3.5 py-2.5 sm:py-3 bg-transparent text-sm sm:text-base text-stone-900 focus:outline-none placeholder-stone-400 resize-none font-medium"
                required
              />

              {/* Action buttons inside / alongside input */}
              <div className="flex items-center justify-end gap-1.5 p-2 sm:pr-3 shrink-0 border-t sm:border-t-0 border-stone-200">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      isFreshInputPending.current = false;
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                    title="साफ करें"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <VoiceInputButton
                  onStart={() => {
                    isFreshInputPending.current = false;
                    setQuery("");
                  }}
                  onTranscript={(txt) => {
                    isFreshInputPending.current = false;
                    setQuery(txt);
                  }}
                  buttonSize="md"
                />

                <button
                  type="submit"
                  disabled={isLoading || isSubmittingRef.current || !query.trim()}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Globe className="w-4 h-4 animate-spin text-amber-200" />
                      <span className="hidden sm:inline">खोज जारी...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>खोजें</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Preset quick 1-click suggestion chips directly below search box */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              त्वरित सुझाव:
            </span>
            {POPULAR_NOVEL_QUERIES.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(item)}
                className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-stone-100 hover:bg-amber-100 hover:text-amber-900 border border-stone-200 text-stone-700 transition-all cursor-pointer font-medium"
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* Optional Location, Facts & Draft Toggle bar */}
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setShowLocationFilters((prev) => !prev)}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {showLocationFilters ? "स्थान व तथ्य छिपाएं" : "राज्य, जिला या विशिष्ट तथ्य जोड़ें (वैकल्पिक)"}
              </span>
              {showLocationFilters ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {(userState || userDistrict || userFacts) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={needDraft}
                onChange={(e) => setNeedDraft(e.target.checked)}
                className="w-4 h-4 text-amber-700 rounded border-stone-300 focus:ring-amber-600"
              />
              <span className="font-semibold text-stone-800 text-[11px] sm:text-xs">
                लिखित कानूनी शिकायत / FIR ड्राफ्ट भी स्वतः बनाएं
              </span>
            </label>
          </div>

          {/* Expandable Location & Facts fields */}
          {showLocationFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-700" />
                  राज्य (State)
                </label>
                <select
                  value={userState}
                  onChange={(e) => setUserState(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-800 text-xs focus:ring-1 focus:ring-amber-600"
                >
                  <option value="">-- राज्य चुनें --</option>
                  {INDIAN_STATES.map((st, i) => (
                    <option key={i} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  जिला / शहर (District)
                </label>
                <input
                  type="text"
                  value={userDistrict}
                  onChange={(e) => setUserDistrict(e.target.value)}
                  placeholder="उदा: लखनऊ, भोपाल, जयपुर..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-800 text-xs focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  विशिष्ट तथ्य (तारीख, राशि, विपक्षी)
                </label>
                <input
                  type="text"
                  value={userFacts}
                  onChange={(e) => setUserFacts(e.target.value)}
                  placeholder="उदा: 50,000 रुपये फ्रॉड, 2 दिन पहले..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-800 text-xs focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>
          )}
        </form>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Sleek Trust & Rules Strip (खोज बार के नीचे) */}
      {!result && !isLoading && (
        <div className="bg-amber-950 text-amber-100 rounded-xl p-3.5 sm:p-4 border border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span>
              <strong>लाइव आधिकारिक वेब खोज:</strong> भारत सरकार के अधिकृत पोर्टलों (<span className="text-amber-300 font-mono">.gov.in / indiacode.nic.in</span>) व नई संहिताओं (BNS/BNSS 2023) से सटीक सत्यापन।
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-stone-300 text-[11px] shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>15-सूत्रीय सत्यापन नियम लागू</span>
          </div>
        </div>
      )}

      {/* Loading Skeleton / Progress Indicator */}
      {isLoading && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-6 shadow-xs text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-800 animate-pulse">
            <Globe className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              आधिकारिक पोर्टलों (.gov.in / indiacode.nic.in) पर लाइव कानूनी खोज व धारा सत्यापन...
            </h3>
            <p className="text-xs text-stone-600 max-w-xl mx-auto">
              भारतीय न्याय संहिता 2023 (BNS), संबंधित नियामक प्राधिकरणों, साक्ष्य नियमों और राष्ट्रीय पोर्टलों पर सत्यापित जानकारी जुटा रहे हैं। कृपया कुछ क्षण प्रतीक्षा करें।
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-amber-900 font-medium">
            <span>● BNS 2023 जांच</span>
            <span>● हेल्पलाइन सत्यापन</span>
            <span>● Format B आलेख सृजन</span>
            <span>● ड्राफ्ट निर्माण</span>
          </div>
        </div>
      )}

      {/* Results View - remains visible while typing, replaced ONLY after user submits new question and new answer is ready */}
      {result && (
        <div
          ref={resultSectionRef}
          id="legal-research-result"
          className={`space-y-6 scroll-mt-24 sm:scroll-mt-28 transition-opacity duration-200 ${isLoading ? "opacity-30 pointer-events-none" : "opacity-100"}`}
        >
          {/* 1. CITIZEN-FIRST PRACTICAL GUIDE (आम नागरिक समझाइश व त्वरित मार्गदर्शन - सबसे पहले) */}
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-md space-y-5">
            {/* Header: Citizen Status & Verification info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  नागरिक मार्गदर्शन (Citizen Guide)
                </span>
                {hardFail.isHardFailed ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    UNVERIFIED (सत्यापन शेष)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    सत्यापित नया विषय
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-400">
                {result.needsStateOrDistrict && (
                  <div className="bg-amber-900/60 text-amber-200 px-2.5 py-1 rounded-md border border-amber-700/60 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>{result.stateDistrictPrompt || "सटीक थाने हेतु राज्य/जिला दर्ज करें"}</span>
                  </div>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-500" />
                  सत्यापन: {result.verificationDate}
                </span>
              </div>
            </div>

            {/* A. What Happened? (सरल नागरिक भाषा में समझाइश) */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                <span>1. क्या हुआ? (आपकी समस्या का आसान विश्लेषण):</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-stone-100 font-['Rozha_One',serif]">
                {result.legalProblem}
              </div>
              <div className="text-xs sm:text-sm text-stone-300 leading-relaxed bg-stone-800/60 p-3.5 rounded-xl border border-stone-800">
                {result.legalSectionDetails?.caseApplication ||
                  result.legalSectionDetails?.provisionGeneral ||
                  "आपके द्वारा दर्ज विवरण के आधार पर यह स्थिति कानून के तहत विचारणीय है। तत्काल अपने अधिकारों की रक्षा हेतु नीचे दिए गए व्यावहारिक कदमों का पालन करें।"}
              </div>
            </div>

            {/* B. What To Do Now? (अब तुरंत क्या कदम उठाएं?) */}
            <div className="space-y-3 pt-1 border-t border-stone-800">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>2. अब तुरंत क्या कदम उठाएं? (Immediate Action Steps):</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Immediate Next Step */}
                <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700 space-y-2">
                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>पहला जरूरी कदम:</span>
                  </div>
                  <div className="text-xs text-stone-200 leading-relaxed font-semibold">
                    {result.safestNextStep || result.legalSectionDetails?.firstStep || "नजदीकी संबंधित थाने या सक्षम प्राधिकारी के समक्ष लिखित आवेदन दें।"}
                  </div>
                  {result.legalSectionDetails?.nextStep && (
                    <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-700/80">
                      💡 अगला चरण: {result.legalSectionDetails.nextStep}
                    </div>
                  )}
                </div>

                {/* 2. Where to go */}
                <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>कहाँ जाएँ? (सक्षम प्राधिकारी):</span>
                  </div>
                  <div className="text-xs text-stone-200 leading-relaxed font-medium">
                    {result.authorityAndForum}
                  </div>
                  <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-700/80">
                    💡 हमेशा लिखित आवेदन देकर मुहर लगी पावती (Receiving) अवश्य लें।
                  </div>
                </div>

                {/* 3. Essential Documents & Evidence */}
                <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700 space-y-2">
                  <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                    <FolderCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>जरूरी कागज़ात व सबूत:</span>
                  </div>
                  <ul className="text-xs text-stone-300 space-y-1.5 font-medium">
                    {(result.requiredDocuments || []).slice(0, 4).map((doc, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* C. Verified Contacts & Helplines */}
            {result.verifiedContacts && result.verifiedContacts.length > 0 && (
              <div className="pt-2 border-t border-stone-800 space-y-2">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  <span>सत्यापित हेल्पलाइन व राष्ट्रीय/राज्य पोर्टल:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {result.verifiedContacts.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-stone-800/80 rounded-lg border border-stone-700/80 text-xs">
                      <div className="font-semibold text-stone-200">{c.name}</div>
                      <div className="text-emerald-400 font-mono font-bold text-sm mt-0.5">
                        📞 {c.contact}
                      </div>
                      {c.portal && (
                        <a
                          href={c.portal}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-300 hover:underline flex items-center gap-1 mt-1 truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>{c.portal}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. READY-TO-USE LEGAL DRAFT (तैयार कानूनी शिकायत / FIR ड्राफ्ट - त्वरित उपयोग हेतु) */}
          {!hardFail.isHardFailed && result.generatedDraft && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="bg-amber-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-200" />
                  <h4 className="text-sm font-bold">
                    तैयार कानूनी शिकायत / FIR ड्राफ्ट (Ready-to-use Legal Draft)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyDraft}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer transition-all"
                  >
                    {copiedDraft ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>ड्राफ्ट कॉपी हो गया</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ड्राफ्ट कॉपी करें</span>
                      </>
                    )}
                  </button>

                  {onOpenDraft && (
                    <button
                      onClick={() =>
                        onOpenDraft(result.generatedDraft || "", "पुलिस शिकायत / प्राथमिकी (FIR) आवेदन")
                      }
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer transition-all shadow-xs"
                    >
                      <span>ड्राफ्ट एडिटर में खोलें</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 font-mono text-xs sm:text-sm text-stone-800 whitespace-pre-wrap bg-stone-50/60 leading-relaxed border-b border-stone-200 max-h-96 overflow-y-auto">
                {result.generatedDraft}
              </div>
              <div className="px-5 py-2 text-[11px] text-stone-500 bg-white flex items-center justify-between">
                <span>* इस ड्राफ्ट में खाली स्थान [_____] को अपने सही विवरण व साक्ष्य संलग्न कर प्रस्तुत करें।</span>
                <span className="font-semibold text-emerald-700">वर्तमान BNSS 2023 व BNS धाराओं पर आधारित</span>
              </div>
            </div>
          )}

          {/* 3. LEGAL PROVISIONS & STATUTORY DETAILS (कानूनी धाराएं व दंडात्मक उपधारा संदर्भ) */}
          <div className="bg-amber-50/70 rounded-xl border-2 border-amber-300/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-800" />
                <h4 className="text-sm font-bold text-amber-950">
                  लागू कानूनी धाराएं व वैधानिक संदर्भ (Statutory Reference — BNS / संहिता)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {result.legalSectionDetails?.lawType && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-amber-200/70 text-amber-900 border border-amber-300">
                    {result.legalSectionDetails.lawType}
                  </span>
                )}
                {hardFail.isHardFailed ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    UNVERIFIED (असत्यापित) — वैधानिक साक्ष्य अपूर्ण
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    आधिकारिक कानून से सत्यापित
                  </span>
                )}
              </div>
            </div>

            {/* 4 Pillars of Legal Section: Section, Punishment, Fine (Universal Accuracy Engine Sub-clause priority) */}
            <div className="bg-white rounded-lg p-4 border border-amber-200/90 shadow-2xs">
              <LegalSectionDisplay
                details={result.legalSectionDetails}
                applicableLawFallback={result.applicableLaw}
              />
            </div>

            {/* 4 Essential Breakdown Points for Legal Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {result.legalSectionDetails?.state && (
                <div className="bg-white rounded-lg p-3.5 border border-amber-200/90 space-y-1">
                  <div className="font-bold text-stone-700 uppercase tracking-wider text-xs flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-amber-700" />
                    <span>
                      {result.legalSectionDetails?.isStateLaw
                        ? "राज्य अधिनियम (State Act):"
                        : "लागू राज्य (Applicable State):"}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-stone-600">
                    राज्य: {result.legalSectionDetails.state}
                  </div>
                  {result.legalSectionDetails?.sectionTitle && (
                    <div className="text-xs text-stone-700 font-medium">
                      विषय: {result.legalSectionDetails.sectionTitle}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-lg p-3.5 border border-amber-200/90 space-y-1">
                <div className="font-bold text-stone-700 uppercase tracking-wider text-xs flex items-center gap-1">
                  <Scale className="w-3 h-3 text-amber-700" />
                  <span>कानून में यह प्रावधान है:</span>
                </div>
                <div className="text-xs text-stone-800 leading-relaxed">
                  {result.legalSectionDetails?.provisionGeneral ||
                    "इस विषय में सुसंगत अधिनियम के तहत वैधानिक प्रक्रिया व प्रावधान परिभाषित हैं।"}
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-amber-200/90 space-y-1">
                <div className="font-bold text-stone-700 uppercase tracking-wider text-xs flex items-center gap-1">
                  <Info className="w-3 h-3 text-blue-600" />
                  <span>आपके मामले में यह लागू हो सकता है:</span>
                </div>
                <div className="text-xs text-stone-800 leading-relaxed">
                  {result.legalSectionDetails?.caseApplication ||
                    "नागरिक द्वारा बताए गए तथ्यों और परिस्थितियों के आधार पर यह लागू हो सकता है।"}
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-amber-200/90 space-y-1">
                <div className="font-bold text-amber-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>यह तथ्य/परिस्थिति पर निर्भर है:</span>
                </div>
                <div className="text-xs font-semibold text-amber-900 bg-amber-100/70 p-2 rounded border border-amber-300/80 leading-relaxed">
                  {result.legalSectionDetails?.factsDependence ||
                    "यह धारा/कानून मामले की परिस्थितियों पर निर्भर करता है।"}
                </div>
              </div>
            </div>
          </div>

          {/* Format B Website Content Box / Red Warning Banner */}
          {hardFail.isHardFailed ? (
            <div className="bg-red-50 rounded-xl border-2 border-red-600 p-5 sm:p-6 shadow-md text-red-950 space-y-4">
              <div className="flex items-start gap-3 border-b border-red-200 pb-3">
                <ShieldAlert className="w-8 h-8 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-red-600 text-white tracking-wide uppercase">
                    Hard-Fail Gate Enforced
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-red-700 tracking-tight">
                    STATUS: OVERALL RESULT: FAIL ({hardFail.reason})
                  </h3>
                  <p className="text-xs sm:text-sm text-red-800 font-medium">
                    आधिकारिक कानून के मूल पाठ / राज्य ई-गजट से इस धारा का संशोधित वैधानिक साक्ष्य अपूर्ण होने के कारण Format B का सामान्य आर्टिकल ब्लॉक कर दिया गया है।
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-red-900 bg-white/95 p-4 sm:p-5 rounded-lg border border-red-200 font-['Yantramanav',sans-serif] leading-relaxed shadow-2xs">
                <div className="font-bold text-red-950 text-sm flex items-center gap-2 border-b border-red-100 pb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>हार्ड-फेल गेट सत्यापन रिपोर्ट (Verification Hard-Fail Audit):</span>
                </div>
                <div className="space-y-2 text-stone-800">
                  <div>
                    <span className="font-bold text-red-900">1. विफलता की स्थिति (Overall Result):</span>{" "}
                    <span className="font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                      FAIL (UNVERIFIED)
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-red-900">2. कारण (Reason):</span> {hardFail.reason}
                  </div>
                  <div>
                    <span className="font-bold text-red-900">3. हार्ड-फेल नियम:</span> यदि किसी भी धारा का कोई भी भाग (जैसे पेनल्टी, अमेंडमेंट, उपधारा, अथॉरिटी) Level 1 आधिकारिक गजट या मूल अधिनियम से 100% सत्यापित नहीं है, तो सामान्य आर्टिकल जनरेट करने के बजाय स्क्रीन पर सीधे हार्ड-फेल चेतावनी अनिवार्य है।
                  </div>
                  <div>
                    <span className="font-bold text-red-900">4. अनिवार्य निर्देश:</span> जब तक राज्य ई-गजट या आधिकारिक प्राथमिक कानून से 100% सत्यापन नहीं हो जाता, तब तक किसी भी अनुमानित अथवा अपूर्ण विवरण को प्रकाशित न करें।
                  </div>
                </div>
              </div>

              <div className="text-xs text-red-700 italic border-t border-red-200 pt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  LEGAL ACCURACY &gt; SOURCE AUTHORITY &gt; UNVERIFIED ARTICLES BLOCKED
                </span>
                <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                  Justice Ji Hard-Fail Protocol
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="bg-stone-50 px-5 py-3 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <h4 className="text-sm font-bold text-stone-900">
                    Justice Ji वेबसाइट कंटेंट (मानक Format B)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 font-semibold text-stone-700 cursor-pointer shadow-2xs transition-all"
                    title="पूरा टेक्स्ट कॉपी करें"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">कॉपी हो गया</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-600" />
                        <span>टेक्स्ट कॉपी करें</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyHtml}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 font-semibold text-stone-700 cursor-pointer shadow-2xs transition-all"
                    title="HTML कोड कॉपी करें"
                  >
                    {copiedHtml ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">HTML कॉपी हो गया</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-600" />
                        <span>HTML कॉपी</span>
                      </>
                    )}
                  </button>

                  {onSaveNewTopic && (
                    <button
                      onClick={handleSaveTopic}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer shadow-2xs transition-all"
                      title="इस नए विषय को Justice Ji में सहेजें"
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>विषय सहेजा गया!</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5 text-white" />
                          <span>विषयों में जोड़ें</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Content Display */}
              <div className="p-5 sm:p-6 text-sm text-stone-800 leading-relaxed font-['Yantramanav',sans-serif] bg-white">
                <FormattedLegalContent
                  content={result.formatBContent}
                  isVerified={!hardFail.isHardFailed}
                  failReason={hardFail.reason}
                />
              </div>
            </div>
          )}

          {/* Official Verification Sources & Unverified Notes (Rule 12 & 15) */}
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-700" />
                <span>सत्यापित आधिकारिक वेब स्रोत (Official Government & Legal Sources):</span>
              </div>
              <span className="text-stone-500">जांच तिथि: {result.verificationDate}</span>
            </div>

            {result.officialSources && result.officialSources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.officialSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-amber-900 hover:border-amber-300 transition-all font-medium text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                    <span className="truncate max-w-xs">{src.title || src.url}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-stone-500">
                आधिकारिक विधिक संहिता (BNS/BNSS 2023 गजट) और राष्ट्रीय विधिक सेवा पोर्टल के अनुसार संकलित।
              </p>
            )}

            {result.unverifiedNote && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">सत्यापन सीमा (Verification Limit): </span>
                  <span>{result.unverifiedNote}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
