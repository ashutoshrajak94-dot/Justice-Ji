import React, { useState, useRef, useEffect } from "react";
import {
  Copy,
  Check,
  Sparkles,
  Download,
  FileCode,
  AlertCircle,
  RefreshCw,
  Layers,
  Globe,
  ArrowRight,
  X,
} from "lucide-react";
import { PRESET_TOPICS } from "../data/legalData";
import { VoiceInputButton } from "./VoiceInputButton";
import { FormattedLegalContent, resolveLegalVerification } from "./LegalTextFormatter";

interface ContentGeneratorProps {
  onGoToWebSearch?: () => void;
  savedTopics?: Array<{ id: string; title: string; contentMarkdown: string; category?: string }>;
}

export const ContentGenerator: React.FC<ContentGeneratorProps> = ({
  onGoToWebSearch,
  savedTopics = [],
}) => {
  const allTopics = [...PRESET_TOPICS, ...savedTopics];
  const [selectedPresetId, setSelectedPresetId] = useState<string>("cyber-fraud");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeContent, setActiveContent] = useState<string>(PRESET_TOPICS[0].contentMarkdown);
  const [activeTitle, setActiveTitle] = useState<string>(PRESET_TOPICS[0].title);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tracks if content was generated and input should clear on new typing/speech
  const isFreshTopicPending = useRef<boolean>(false);
  const lastSubmittedTopic = useRef<string>("");

  // PART 2: Auto-scroll tracking - scroll ONCE per newly submitted topic after generation finishes
  const generatorSectionRef = useRef<HTMLDivElement | null>(null);
  const currentSubmissionId = useRef<number>(0);
  const lastScrolledSubmissionId = useRef<number>(0);

  // Smooth scroll ONCE to the beginning of the newly generated answer
  useEffect(() => {
    if (!isGenerating && currentSubmissionId.current > lastScrolledSubmissionId.current) {
      lastScrolledSubmissionId.current = currentSubmissionId.current;
      const timer = setTimeout(() => {
        const el =
          generatorSectionRef.current || document.getElementById("content-result-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [activeContent, isGenerating]);

  // Quick select preset
  const handleSelectPreset = (topicId: string) => {
    setSelectedPresetId(topicId);
    isFreshTopicPending.current = false;
    const found = allTopics.find((t) => t.id === topicId);
    if (found) {
      setActiveContent(found.contentMarkdown);
      setActiveTitle(found.title);
      setCustomTopic(found.title);
      setErrorMessage(null);
    }
  };

  // When user focuses on topic input - keep neutral
  const handleTopicFocus = () => {
    // Keep focus neutral
  };

  // When user starts typing with physical keyboard (laptop/desktop)
  const handleTopicKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isFreshTopicPending.current) {
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
        isFreshTopicPending.current = false;
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          setCustomTopic("");
        } else if (e.key.length === 1) {
          e.preventDefault();
          setCustomTopic(e.key);
        }
      }
    }
  };

  // Mobile virtual keyboard & modern browser handling
  const handleTopicBeforeInput = (e: any) => {
    if (isFreshTopicPending.current) {
      if (e.data) {
        if (typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        isFreshTopicPending.current = false;
        setCustomTopic(e.data);
      } else if (e.inputType === "deleteContentBackward" || e.inputType === "deleteContentForward") {
        if (typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        isFreshTopicPending.current = false;
        setCustomTopic("");
      }
    }
  };

  // Paste handling: replace previous topic immediately with pasted text
  const handleTopicPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isFreshTopicPending.current) {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      isFreshTopicPending.current = false;
      setCustomTopic(pasted);
    }
  };

  // Universal change handler (mobile fallback, IME)
  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isFreshTopicPending.current) {
      isFreshTopicPending.current = false;
      const prev = lastSubmittedTopic.current;
      if (prev) {
        if (val.startsWith(prev)) {
          setCustomTopic(val.slice(prev.length).trimStart());
          return;
        }
        if (val.endsWith(prev)) {
          setCustomTopic(val.slice(0, val.length - prev.length).trimEnd());
          return;
        }
        if (val.includes(prev)) {
          setCustomTopic(val.replace(prev, "").trim());
          return;
        }
        if (prev.startsWith(val) || prev.includes(val)) {
          setCustomTopic("");
          return;
        }
      }
    }
    setCustomTopic(val);
  };

  // Generate new content via Server-side Gemini API
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const topicToUse = customTopic.trim() || activeTitle;
    if (!topicToUse) {
      setErrorMessage("कृपया विषय (Topic) का नाम लिखें।");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    currentSubmissionId.current += 1;

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicToUse,
          customNote: customNote.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "कंटेंट तैयार नहीं हो सका।");
      }

      setActiveContent(data.content);
      setActiveTitle(topicToUse);
      setSelectedPresetId("");
      lastSubmittedTopic.current = topicToUse;
      isFreshTopicPending.current = true;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "कंटेंट तैयार करने में त्रुटि आई। कृपया पुनः प्रयास करें।");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy raw text for Justice Ji website
  const handleCopyText = () => {
    const verification = resolveLegalVerification(activeContent);
    if (!verification.isVerified) {
      navigator.clipboard.writeText(
        `STATUS: OVERALL RESULT: FAIL (${verification.reason})\nवैधानिक साक्ष्य अपूर्ण होने के कारण यह कानूनी लेख असत्यापित (UNVERIFIED) है।`
      );
    } else {
      navigator.clipboard.writeText(activeContent);
    }
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Convert to clean HTML for CMS copy-paste
  const handleCopyHtml = () => {
    const verification = resolveLegalVerification(activeContent);
    if (!verification.isVerified) {
      navigator.clipboard.writeText(
        `<div class="justice-ji-fail-notice" style="color: #b91c1c; font-weight: bold; border: 2px solid #dc2626; padding: 1rem;">STATUS: OVERALL RESULT: FAIL (${verification.reason})<br />वैधानिक साक्ष्य अपूर्ण होने के कारण लेख ब्लॉक किया गया है।</div>`
      );
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2500);
      return;
    }

    // Generate clean HTML format
    const lines = activeContent.split("\n");
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
    html += `</div>`;

    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  // Download as text file
  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([activeContent], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${activeTitle.slice(0, 30).replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "_")}_FormatB.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Guidelines Summary */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Layers className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-950">
            <span className="font-bold text-amber-900">Format B मानक प्रारूप: </span>
            सामग्री में 1. समस्या, 2. क्या करें, 3. संबंधित कानून/धारा (वर्तमान BNS/BNSS), 4. जरूरी कागज़/सबूत, 5. कहाँ जाएँ, 6. सत्यापित संपर्क व हेल्पलाइन (.gov.in), 7. आगे क्या करें, और ध्यान रखें शामिल हैं। पूरा कंटेंट <strong>Justice Ji</strong> वेबसाइट पर सीधे Copy-Paste करने योग्य है।
          </div>
        </div>
      </div>

      {/* Preset Quick Topics */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
            लोकप्रिय व जोड़े गए कानूनी विषय:
          </label>
          {onGoToWebSearch && (
            <button
              type="button"
              onClick={onGoToWebSearch}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>अनदेखा कानूनी सवाल? सरकारी पोर्टलों पर लाइव AI खोज करें →</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleSelectPreset(topic.id)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-left flex items-center gap-1.5 ${
                selectedPresetId === topic.id
                  ? "bg-stone-900 text-amber-300 font-semibold shadow-xs"
                  : "bg-white text-stone-700 border border-stone-200 hover:border-stone-400 hover:bg-stone-50"
              }`}
            >
              <span>{topic.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input / Generator Form */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="topicInput" className="block text-sm font-semibold text-stone-800">
                  विषय का नाम (Topic Name) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {customTopic && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTopic("");
                        isFreshTopicPending.current = false;
                      }}
                      className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded"
                      title="साफ करें"
                    >
                      <X className="w-3 h-3" />
                      <span>हटाएं</span>
                    </button>
                  )}
                  <span className="text-[11px] text-stone-500 hidden sm:inline">बोलकर लिखें:</span>
                  <VoiceInputButton
                    onStart={() => {
                      isFreshTopicPending.current = false;
                      setCustomTopic("");
                    }}
                    onTranscript={(txt) => {
                      isFreshTopicPending.current = false;
                      setCustomTopic(txt);
                    }}
                    buttonSize="sm"
                  />
                </div>
              </div>
              <input
                id="topicInput"
                type="text"
                value={customTopic}
                onFocus={handleTopicFocus}
                onKeyDown={handleTopicKeyDown}
                onBeforeInput={handleTopicBeforeInput}
                onPaste={handleTopicPaste}
                onChange={handleTopicChange}
                placeholder="जैसे: किराएदार द्वारा मकान खाली न करने पर, ऑनलाइन धोखाधड़ी में पैसे कटने पर..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-sm"
              />
            </div>
            <div>
              <label htmlFor="customNote" className="block text-sm font-semibold text-stone-800 mb-1">
                अतिरिक्त निर्देश / स्थिति (वैकल्पिक)
              </label>
              <input
                id="customNote"
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="जैसे: राशि ₹50,000 है, पुलिस पावती नहीं दे रही..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-stone-500">
              * नए आपराधिक कानून BNS 2023, BNSS 2023 और उपभोक्ता संरक्षण 2019 के सत्यापित नियमों से तैयार होगा।
            </p>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  तैयार हो रहा है (AI Assistant)...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  नया आर्टिकल जनरेट करें (Format B)
                </>
              )}
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Generated Content Box & Action Bar */}
      <div
        ref={generatorSectionRef}
        id="content-result-section"
        className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden scroll-mt-24 sm:scroll-mt-28"
      >
        <div className="bg-stone-100 border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
            <h2 className="text-sm font-bold text-stone-800">
              Justice Ji Website Ready Content (Format B)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct 1-Click Copy for Justice Ji Website */}
            <button
              onClick={handleCopyText}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                copiedText
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-700 hover:bg-amber-800 text-white shadow-xs"
              }`}
              title="सीधे Justice Ji वेबसाइट पर पेस्ट करने के लिए कॉपी करें"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  कॉपी हो गया!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  वेबसाइट हेतु कॉपी करें (Format B)
                </>
              )}
            </button>

            {/* Copy HTML Code for WordPress / CMS */}
            <button
              onClick={handleCopyHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-stone-200 hover:bg-stone-300 text-stone-800 transition-all cursor-pointer"
              title="CMS में डालने हेतु HTML कोड कॉपी करें"
            >
              {copiedHtml ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-700">HTML कॉपी!</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5" />
                  HTML कोड
                </>
              )}
            </button>

            {/* Download Text */}
            <button
              onClick={handleDownloadTxt}
              className="p-1.5 text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-200 cursor-pointer"
              title="टेक्स्ट फाइल डाउनलोड करें"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer with strict font color styling */}
        <div className="p-6 font-['Yantramanav',sans-serif] text-stone-800 leading-relaxed text-base bg-stone-50/30">
          <div className="bg-white p-5 sm:p-6 rounded-lg border border-stone-200 shadow-2xs">
            {(() => {
              const verification = resolveLegalVerification(activeContent);
              return (
                <FormattedLegalContent
                  content={activeContent}
                  isVerified={verification.isVerified}
                  failReason={verification.reason}
                />
              );
            })()}
          </div>
        </div>

        <div className="border-t border-stone-100 bg-stone-50 px-4 py-2 text-xs text-stone-500 flex items-center justify-between">
          <span>* सामग्री वर्तमान भारतीय कानून एवं आधिकारिक सरकारी स्रोतों पर आधारित है।</span>
          <span className="font-mono text-[11px] text-stone-400">Justice Ji Legal Assistant</span>
        </div>
      </div>
    </div>
  );
};
