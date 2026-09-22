import React, { useState, useMemo } from "react";
import {
  BookA,
  Search,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Code2,
  FileText,
  HelpCircle,
  Scale,
  Sparkles,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { LEGAL_DICTIONARY_TERMS } from "../data/legalDictionaryData";
import { LegalDictionaryTerm } from "../types";

export const LegalDictionary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTermForJson, setSelectedTermForJson] = useState<LegalDictionaryTerm | null>(null);
  const [showFullJsonModal, setShowFullJsonModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedJsonAll, setCopiedJsonAll] = useState(false);

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return LEGAL_DICTIONARY_TERMS.filter((term) => {
      const matchesCategory =
        selectedCategory === "all" || term.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch =
        term.hindiTerm.toLowerCase().includes(q) ||
        term.englishTerm.toLowerCase().includes(q) ||
        term.section.toLowerCase().includes(q) ||
        term.applicableLaw.toLowerCase().includes(q) ||
        term.subject.toLowerCase().includes(q) ||
        term.simpleMeaning.toLowerCase().includes(q) ||
        term.condition.toLowerCase().includes(q) ||
        (term.punishment && term.punishment.toLowerCase().includes(q)) ||
        (term.fine && term.fine.toLowerCase().includes(q)) ||
        (term.relatedTerms && term.relatedTerms.some((rt) => rt.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyText = (term: LegalDictionaryTerm) => {
    const textToCopy = `【${term.hindiTerm}】
• अंग्रेजी: ${term.englishTerm}
• कानून एवं धारा: ${term.applicableLaw} (${term.section})
• सरल अर्थ: ${term.simpleMeaning}
• लागू होने की शर्त: ${term.condition}
${term.punishment ? `• सजा: ${term.punishment}` : ""}
${term.fine ? `• जुर्माना: ${term.fine}` : ""}
• व्यावहारिक उदाहरण: ${term.practicalExample}
${term.citizenRightTip ? `• नागरिक अधिकार/सलाह: ${term.citizenRightTip}` : ""}

— स्रोत: Justice Ji (जस्टिस जी) कानूनी शब्दकोश`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(term.id + "-text");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySingleJson = (term: LegalDictionaryTerm) => {
    const jsonOutput = {
      applicable_law: term.applicableLaw,
      section: term.section,
      subject: term.subject,
      condition: term.condition,
      punishment: term.punishment || "विहित नहीं",
      fine: term.fine || "विहित नहीं",
      hindi_term: term.hindiTerm,
      english_term: term.englishTerm,
      simple_meaning: term.simpleMeaning,
      practical_example: term.practicalExample,
      citizen_right_tip: term.citizenRightTip,
    };

    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setCopiedId(term.id + "-json");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllJson = () => {
    navigator.clipboard.writeText(JSON.stringify(LEGAL_DICTIONARY_TERMS, null, 2));
    setCopiedJsonAll(true);
    setTimeout(() => setCopiedJsonAll(false), 2000);
  };

  const categories = [
    { id: "all", label: "सभी 15 शब्द", count: LEGAL_DICTIONARY_TERMS.length },
    {
      id: "criminal",
      label: "आपराधिक कानून (BNS)",
      count: LEGAL_DICTIONARY_TERMS.filter((t) => t.category === "criminal").length,
    },
    {
      id: "procedure",
      label: "आपराधिक प्रक्रिया (BNSS)",
      count: LEGAL_DICTIONARY_TERMS.filter((t) => t.category === "procedure").length,
    },
    {
      id: "rights",
      label: "जमानत व नागरिक अधिकार",
      count: LEGAL_DICTIONARY_TERMS.filter((t) => t.category === "rights").length,
    },
    {
      id: "court",
      label: "अदालती व अभियोजन प्रक्रिया",
      count: LEGAL_DICTIONARY_TERMS.filter((t) => t.category === "court").length,
    },
    {
      id: "civil",
      label: "दीवानी, साक्ष्य व दस्तावेज",
      count: LEGAL_DICTIONARY_TERMS.filter((t) => t.category === "civil").length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-amber-700 text-amber-50 flex items-center justify-center shadow-xs">
                <BookA className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 font-['Rozha_One',serif]">
                  कानूनी शब्दकोश <span className="text-amber-700 text-xl font-['Yantramanav',sans-serif] font-bold">(Legal Dictionary)</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-600">
                  BNS 2023, BNSS 2023, BSA 2023 और अदालती प्रक्रिया के 15 मुख्य कानूनी शब्दों का प्रामाणिक व सरल संग्रह
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFullJsonModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>डिक्शनरी JSON डेटा देखें</span>
            </button>
            <button
              onClick={handleCopyAllJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
            >
              {copiedJsonAll ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">पूरा JSON कॉपी हुआ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-800" />
                  <span>पूरा JSON कॉपी करें</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 pt-6 border-t border-stone-100 space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="कानूनी शब्द, धारा, अंग्रेजी नाम या सजा खोजें (उदा: 329, अतिचार, जमानत, FIR, Trespass, Warrant)..."
              className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition-all text-stone-900 placeholder:text-stone-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 px-2 py-0.5 rounded bg-stone-200"
              >
                हटाएं
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-amber-700 text-white shadow-2xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCategory === cat.id
                      ? "bg-amber-800 text-amber-100"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count & Meta */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <span>
          कुल <strong>{filteredTerms.length}</strong> कानूनी शब्द प्रदर्शित (15 प्रामाणिक संकलित)
        </span>
        <span className="flex items-center gap-1 text-emerald-700 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          BNS/BNSS 2023 गजट व वैधानिक उपधाराओं से 100% सत्यापित
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredTerms.map((term) => (
          <div
            key={term.id}
            className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              {/* Card Header: Category & Section Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                  {term.categoryName}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1 shadow-2xs">
                  <Scale className="w-3.5 h-3.5 text-amber-700" />
                  {term.section}
                </span>
              </div>

              {/* Term Title & English Subtitle */}
              <div className="mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                  <span>{term.hindiTerm}</span>
                </h3>
                <div className="text-xs text-stone-500 font-medium flex items-center gap-2 mt-0.5">
                  <span className="text-amber-800 font-semibold">{term.englishTerm}</span>
                  {term.pronunciationOrLatin && (
                    <>
                      <span>•</span>
                      <span className="italic text-stone-400">{term.pronunciationOrLatin}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-stone-600">{term.applicableLaw}</span>
                </div>
              </div>

              {/* Simple Meaning (सरल अर्थ) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl mb-3">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                  सरल भाषा में अर्थ:
                </div>
                <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
                  {term.simpleMeaning}
                </p>
              </div>

              {/* Condition (लागू होने की स्थिति) */}
              <div className="space-y-1 mb-3 text-xs">
                <div className="font-bold text-stone-700">यह कानून/धारा कब लागू होती है?</div>
                <p className="text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                  {term.condition}
                </p>
              </div>

              {/* Punishment & Fine (सजा व जुर्माना - यदि लागू हो) */}
              {(term.punishment || term.fine) && (
                <div className="p-3 bg-red-50/60 border border-red-200/70 rounded-xl mb-3 space-y-1">
                  <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                    विहित कानूनी सजा एवं जुर्माना:
                  </div>
                  {term.punishment && (
                    <div className="text-xs text-stone-800">
                      <strong className="text-red-900">सजा:</strong> {term.punishment}
                    </div>
                  )}
                  {term.fine && (
                    <div className="text-xs text-stone-800">
                      <strong className="text-red-900">जुर्माना:</strong> {term.fine}
                    </div>
                  )}
                </div>
              )}

              {/* Practical Example (व्यावहारिक उदाहरण) */}
              <div className="space-y-1 mb-3 text-xs">
                <div className="font-bold text-stone-700">व्यावहारिक उदाहरण:</div>
                <p className="text-stone-600 italic bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                  "{term.practicalExample}"
                </p>
              </div>

              {/* Citizen Right Tip (नागरिक अधिकार सलाह) */}
              {term.citizenRightTip && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    नागरिक अधिकार व सुरक्षा टिप:
                  </div>
                  <p className="text-emerald-900/90 leading-relaxed font-medium">
                    {term.citizenRightTip}
                  </p>
                </div>
              )}

              {/* Related Terms */}
              {term.relatedTerms && term.relatedTerms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-3">
                  <span className="text-[10px] text-stone-400 font-semibold mr-1">संबंधित शब्द:</span>
                  {term.relatedTerms.map((rt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(rt)}
                      className="text-[10px] bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 px-2 py-0.5 rounded border border-stone-200 transition-colors"
                    >
                      {rt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Card Action Footer */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedTermForJson(term)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
                title="इस धारा का JSON प्रारूप देखें"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-700" />
                <span>JSON देखें</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopySingleJson(term)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                  title="इस शब्द का JSON कॉपी करें"
                >
                  {copiedId === term.id + "-json" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">JSON कॉपी!</span>
                    </>
                  ) : (
                    <>
                      <Code2 className="w-3 h-3 text-stone-500" />
                      <span>JSON कॉपी</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCopyText(term)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
                  title="पूरी विधिक जानकारी टेक्स्ट रूप में कॉपी करें"
                >
                  {copiedId === term.id + "-text" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">कॉपी हुआ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-amber-700" />
                      <span>विवरण कॉपी</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="text-base font-bold text-stone-800">
            "{searchQuery}" के लिए कोई कानूनी शब्द नहीं मिला
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            कृपया अन्य शब्द टाइप करें जैसे कि '329', 'चोरी', 'अतिचार', 'BNS', 'वारंट' या श्रेणी फ़िल्टर को 'सभी' पर सेट करें।
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-bold hover:bg-amber-800 transition-colors"
          >
            फ़िल्टर रीसेट करें
          </button>
        </div>
      )}

      {/* Modal: Single Term JSON View */}
      {selectedTermForJson && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-stone-900 text-base">
                  JSON प्रारूप: {selectedTermForJson.hindiTerm}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTermForJson(null)}
                className="text-stone-400 hover:text-stone-700 text-lg px-2 rounded-lg hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-stone-900 rounded-xl p-4 text-xs font-mono text-emerald-400 shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(
                  {
                    applicable_law: selectedTermForJson.applicableLaw,
                    section: selectedTermForJson.section,
                    subject: selectedTermForJson.subject,
                    condition: selectedTermForJson.condition,
                    punishment: selectedTermForJson.punishment || "विहित नहीं",
                    fine: selectedTermForJson.fine || "विहित नहीं",
                    hindi_term: selectedTermForJson.hindiTerm,
                    english_term: selectedTermForJson.englishTerm,
                    simple_meaning: selectedTermForJson.simpleMeaning,
                    practical_example: selectedTermForJson.practicalExample,
                    citizen_right_tip: selectedTermForJson.citizenRightTip,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setSelectedTermForJson(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                बंद करें
              </button>
              <button
                onClick={() => handleCopySingleJson(selectedTermForJson)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-700 text-white hover:bg-amber-800 transition-colors shadow-xs"
              >
                {copiedId === selectedTermForJson.id + "-json" ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>कॉपी सफल!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white" />
                    <span>यह JSON कॉपी करें</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Dataset 15 Terms JSON View */}
      {showFullJsonModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-stone-900 text-base">
                  संपूर्ण डिक्शनरी डेटा (15 मुख्य कानूनी शब्द Array/JSON)
                </h3>
              </div>
              <button
                onClick={() => setShowFullJsonModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg px-2 rounded-lg hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-stone-900 rounded-xl p-4 text-xs font-mono text-emerald-400 shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(LEGAL_DICTIONARY_TERMS, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="text-xs text-stone-500">
                कुल शब्द: {LEGAL_DICTIONARY_TERMS.length} प्रविष्टियां (Array of Objects)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFullJsonModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  बंद करें
                </button>
                <button
                  onClick={handleCopyAllJson}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-700 text-white hover:bg-amber-800 transition-colors shadow-xs"
                >
                  {copiedJsonAll ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>पूरा JSON कॉपी हुआ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-white" />
                      <span>पूरा Array JSON कॉपी करें</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
