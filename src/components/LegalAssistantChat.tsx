import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Scale,
  ShieldAlert,
  AlertTriangle,
  Globe,
  ExternalLink,
  MapPin,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ChatMessage } from "../types";
import { VoiceInputButton } from "./VoiceInputButton";
import { FormattedLegalContent } from "./LegalTextFormatter";

interface LegalAssistantChatProps {
  onOpenDraft?: (draftContent?: string, draftType?: string) => void;
}

export const LegalAssistantChat: React.FC<LegalAssistantChatProps> = ({ onOpenDraft }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: `नमस्ते! मैं “Justice Ji” का Legal Content Assistant हूँ। 

मैं भारत के आम नागरिकों के लिए आसान, स्पष्ट और भरोसेमंद हिंदी में कानूनी जानकारी, संबंधित धाराएं और सरकारी प्रक्रियाएं समझाने के लिए उपलब्ध हूँ।

यदि आपका सवाल मौजूदा सामान्य विषयों में नहीं है, तो भी मैं सीधे इंटरनेट पर आधिकारिक सरकारी पोर्टलों (.gov.in / .nic.in) व वर्तमान कानूनों (BNS / BNSS / BSA 2023) से खोज कर उत्तर दूंगा।

आप कोई भी कानूनी सवाल पूछ सकते हैं, जैसे:
• "बिल्डर फ्लैट का पजेशन नहीं दे रहा, RERA में शिकायत कैसे करें?"
• "अस्पताल द्वारा बिल विवाद में शव रोकने पर क्या कानूनी अधिकार हैं?"
• "पुलिस द्वारा FIR दर्ज न करने पर BNSS में क्या उपाय हैं?"
• "ऑनलाइन गेमिंग या साइबर फ्रॉड में पैसे कटने पर 1930 का नियम क्या है?"`,
      timestamp: "अभी",
      isWebVerified: true,
      verificationDate: "वर्तमान माह 2026",
    },
  ]);
  const [inputQuery, setInputQuery] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [showLocationInput, setShowLocationInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentChatSubmissions = useRef<number>(0);
  const lastScrolledChatSubmission = useRef<number>(0);

  // Auto-scroll ONCE to the bottom after bot finishes answering
  useEffect(() => {
    if (!isLoading && currentChatSubmissions.current > lastScrolledChatSubmission.current) {
      lastScrolledChatSubmission.current = currentChatSubmissions.current;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [messages, isLoading]);

  const suggestedQuestions = [
    "बिल्डर फ्लैट का कब्जा न दे तो RERA में क्या कानूनी अधिकार हैं?",
    "अस्पताल द्वारा बकाया बिल के लिए शव रोकना क्या गैरकानूनी है?",
    "साइबर फ्रॉड में 1930 और 1 घंटे (Golden Hour) का क्या नियम है?",
    "सोसायटी RWA द्वारा अवैध मेंटेनेंस व लिफ्ट बंद करने पर कानून?",
    "क्या पुलिस संज्ञेय अपराध में FIR दर्ज करने से मना कर सकती है?",
    "चेक बाउंस का विधिक नोटिस कितने दिन में भेजना अनिवार्य है?",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);
    currentChatSubmissions.current += 1;

    try {
      const response = await fetch("/api/ask-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          state: selectedState.trim(),
          district: selectedDistrict.trim(),
          history: messages.slice(-4).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "उत्तर प्राप्त करने में त्रुटि आई।");
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: data.answer,
        timestamp: new Date().toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" }),
        isWebVerified: Boolean(data.isWebVerified),
        sources: Array.isArray(data.sources) ? data.sources : [],
        verificationDate: data.verificationDate,
        needsStatePrompt: data.needsStatePrompt,
        suggestedDraft: data.needsDraft ? query : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "माफ कीजिए, आधिकारिक खोज में अस्थाई समस्या आई। कृपया अपने प्रश्न को संक्षेप में पुनः पूछें।",
        timestamp: new Date().toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
      {/* Chat header */}
      <div className="bg-stone-900 text-stone-100 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-300 font-['Rozha_One',serif]">
              Justice Ji AI Legal Q&A (कानूनी सवाल पूछें)
            </h2>
            <p className="text-[11px] text-stone-300">
              आसान, स्पष्ट और वर्तमान भारतीय कानूनों (BNS / BNSS) पर आधारित उत्तर
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
          ● ऑनलाइन सहायक
        </span>
      </div>

      {/* Suggested chips */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 overflow-x-auto no-scrollbar flex items-center gap-2 text-xs">
        <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap">सुझाए गए प्रश्न:</span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-md border border-stone-200 whitespace-nowrap cursor-pointer transition-all text-xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-stone-50/40">
        {messages.map((msg) => {
          const isMsgHardFailed =
            Boolean(msg.isHardFailed) ||
            msg.isOverallVerified === false ||
            Boolean(
              msg.text &&
              /(?:STATUS:\s*OVERALL\s*RESULT:\s*FAIL|STATUS:\s*NOT\s*VERIFIED|OVERALL\s*RESULT:\s*FAIL)/i.test(msg.text)
            ) ||
            Boolean(
              msg.text &&
              /(?:धारा\s*130|section\s*130)/i.test(msg.text) &&
              /(?:verification आवश्यक|पुष्टि आवश्यक|अपुष्ट)/i.test(msg.text)
            );

          const hardFailReason =
            msg.hardFailReason ||
            (msg.text?.match(/FAIL\s*\(([^)]+)\)/i)?.[1]) ||
            (msg.text?.includes("धारा 130") ? "धारा 130 का संशोधित वैधानिक साक्ष्य अपूर्ण है" : "वैधानिक साक्ष्य अपूर्ण है");

          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-4 shadow-2xs ${
                  msg.role === "user"
                    ? "bg-amber-700 text-white rounded-br-none"
                    : isMsgHardFailed
                    ? "bg-red-50/90 border-2 border-red-500 text-red-950 rounded-bl-none"
                    : "bg-white border border-stone-200 text-stone-800 rounded-bl-none"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-stone-100/30 pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold ${msg.role === "user" ? "text-amber-200" : isMsgHardFailed ? "text-red-700" : "text-amber-800"}`}>
                      {msg.role === "user" ? "आप (नागरिक)" : "Justice Ji Legal Assistant"}
                    </span>
                    {msg.role === "model" && isMsgHardFailed && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-600 text-white">
                        FAIL (UNVERIFIED)
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${msg.role === "user" ? "text-amber-200/80" : "text-stone-400"}`}>
                    {msg.timestamp}
                  </span>
                </div>

                <div className="text-xs sm:text-sm leading-relaxed">
                  {msg.role === "model" ? (
                    <FormattedLegalContent
                      content={msg.text}
                      isVerified={!isMsgHardFailed && msg.isVerified !== false && msg.isOverallVerified !== false}
                      failReason={hardFailReason}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}
                </div>

                {/* State & District prompt if required */}
                {msg.needsStatePrompt && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">{msg.needsStatePrompt}</span>
                      <button
                        type="button"
                        onClick={() => setShowLocationInput(true)}
                        className="ml-2 underline font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                      >
                        यहाँ राज्य व जिला दर्ज करें →
                      </button>
                    </div>
                  </div>
                )}

                {/* Suggested Draft Action Button (Suppressed if Hard-Failed) */}
                {!isMsgHardFailed && msg.suggestedDraft && onOpenDraft && (
                  <div className="mt-2.5 p-2 bg-stone-100 rounded-lg border border-stone-200 flex items-center justify-between gap-2">
                    <div className="text-xs text-stone-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>क्या आपको इस मामले का औपचारिक FIR / शिकायत ड्राफ्ट चाहिए?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenDraft(
                          undefined,
                          msg.text.includes("उपभोक्ता")
                            ? "उपभोक्ता शिकायत (Consumer Complaint)"
                            : "पुलिस शिकायत / प्राथमिकी (FIR) आवेदन"
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded cursor-pointer shrink-0 transition-all"
                    >
                      <span>ड्राफ्ट बनाएं</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Verified Sources & Date */}
                {msg.role === "model" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                      <span className={`flex items-center gap-1 ${isMsgHardFailed ? "text-red-700" : "text-emerald-700"}`}>
                        <Globe className={`w-3 h-3 ${isMsgHardFailed ? "text-red-600" : "text-emerald-600"}`} />
                        {isMsgHardFailed ? "जांचे गए स्रोत (सत्यापन असफल):" : "सत्यापित स्रोत (.gov.in / आधिकारिक):"}
                      </span>
                      {msg.verificationDate && (
                        <span className="text-stone-400 text-[9px] flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          सत्यापन: {msg.verificationDate}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-all truncate max-w-xs"
                        >
                          <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                          <span className="truncate">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {msg.role === "model" && (
                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between">
                    {isMsgHardFailed ? (
                      <span className="text-[10px] font-bold text-red-700 flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        UNVERIFIED (असत्यापित) — हार्ड-फेल गेट लागू
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-emerald-600" />
                        लाइव आधिकारिक वेब खोज द्वारा सत्यापित
                      </span>
                    )}

                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900 cursor-pointer"
                      title="उत्तर कॉपी करें"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">कॉपी हो गया</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>कॉपी करें</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-xl rounded-bl-none p-4 shadow-2xs flex items-center gap-2 text-xs text-stone-500">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
              <span>सरकारी पोर्टलों (.gov.in) पर लाइव खोज व कानूनी धाराएं जांची जा रही हैं...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Optional Location Input Bar */}
      {showLocationInput && (
        <div className="bg-stone-100 border-t border-stone-200 px-4 py-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-stone-700 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-700" />
            स्थान विवरण:
          </span>
          <input
            type="text"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            placeholder="राज्य (उदा: उत्तर प्रदेश)"
            className="px-2.5 py-1 rounded border border-stone-300 bg-white text-xs text-stone-800 w-36"
          />
          <input
            type="text"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            placeholder="जिला (उदा: लखनऊ / नोएडा)"
            className="px-2.5 py-1 rounded border border-stone-300 bg-white text-xs text-stone-800 w-36"
          />
          <button
            type="button"
            onClick={() => setShowLocationInput(false)}
            className="text-[11px] text-stone-500 hover:text-stone-700 px-1 cursor-pointer"
          >
            बंद करें
          </button>
        </div>
      )}

      {/* Disclaimer reminder */}
      <div className="bg-amber-50/70 border-t border-amber-200/60 px-4 py-1.5 text-[11px] text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>यह सामान्य कानूनी जानकारी है, व्यक्तिगत कानूनी सलाह नहीं। विशिष्ट मामले हेतु अधिवक्ता से परामर्श लें।</span>
        </div>
        {!showLocationInput && (
          <button
            type="button"
            onClick={() => setShowLocationInput(true)}
            className="text-[11px] text-amber-800 hover:underline cursor-pointer flex items-center gap-1 shrink-0 font-medium"
          >
            <MapPin className="w-3 h-3" />
            <span>राज्य/जिला जोड़ें</span>
          </button>
        )}
      </div>


      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="अपनी समस्या सरल भाषा में लिखें (जैसे: बाइक चोरी हो गई, पड़ोसी गाली दे रहा है...)"
          className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
        />

        {/* Voice Input Button */}
        <VoiceInputButton
          onStart={() => setInputQuery("")}
          onTranscript={(spokenText) => setInputQuery(spokenText)}
          buttonSize="md"
        />

        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">पूछें</span>
        </button>
      </form>
    </div>
  );
};
