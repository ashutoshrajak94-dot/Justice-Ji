import React, { useState } from "react";
import { PhoneCall, ExternalLink, ShieldCheck, Search, Copy, Check, Info } from "lucide-react";
import { VERIFIED_HELPLINES } from "../data/legalData";
import { HelplineContact } from "../types";

export const VerifiedHelplines: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "सभी राष्ट्रीय हेल्पलाइन" },
    { id: "emergency", label: "आपातकालीन (112 / 139 / 1033)" },
    { id: "cyber", label: "साइबर क्राइम (1930)" },
    { id: "consumer", label: "उपभोक्ता अधिकार (1915)" },
    { id: "women_child", label: "महिला व बाल सुरक्षा (181 / 1098)" },
    { id: "legal_aid", label: "मुफ्त कानूनी सहायता (NALSA 15100)" },
    { id: "senior", label: "वरिष्ठ नागरिक (14567)" },
  ];

  const filteredHelplines = VERIFIED_HELPLINES.filter((h: HelplineContact) => {
    const matchesCategory = selectedCategory === "all" || h.category === selectedCategory;
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.shortCode.includes(searchQuery) ||
      h.tollFree.includes(searchQuery) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopyNumber = (id: string, number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Verification Standard Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-emerald-950">
            <h2 className="font-bold text-emerald-900 text-sm sm:text-base">
              सत्यापित सरकारी संपर्क व हेल्पलाइन नियम (Section C अनुपालन)
            </h2>
            <p className="mt-1 text-emerald-800 leading-relaxed">
              सभी हेल्पलाइन नंबर और वेब पते <strong>केवल भारत सरकार एवं राज्य सरकारों की आधिकारिक वेबसाइटों (.gov.in / .nic.in)</strong> से जांचे गए हैं। किसी भी निजी ब्लॉग, पुराने लेख या सोशल मीडिया से असत्यापित नंबर नहीं लिए गए हैं।
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="हेल्पलाइन, विभाग या नंबर खोजें (जैसे: 1930, 1915, साइबर, NALSA)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat.id
                  ? "bg-amber-700 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Helplines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredHelplines.map((helpline) => (
          <div
            key={helpline.id}
            className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100/70 text-amber-800 mb-1.5">
                    {helpline.categoryName}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">
                    {helpline.name}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    {helpline.department}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-amber-700 tracking-tight font-mono">
                    {helpline.shortCode}
                  </span>
                  <span className="block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 border border-emerald-200">
                    टोल-फ्री
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-700 mt-3 leading-relaxed">
                {helpline.description}
              </p>

              <div className="mt-3.5 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
                <div>
                  <span className="font-semibold text-stone-700">समय: </span>
                  <span>{helpline.operationalHours}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">{helpline.verifiedSource}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${helpline.shortCode}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  कॉल करें ({helpline.shortCode})
                </a>

                <button
                  onClick={() => handleCopyNumber(helpline.id, helpline.shortCode)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  title="नंबर कॉपी करें"
                >
                  {copiedId === helpline.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">कॉपी</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      कॉपी
                    </>
                  )}
                </button>
              </div>

              {helpline.website && (
                <a
                  href={helpline.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-amber-800 underline underline-offset-2"
                >
                  सरकारी पोर्टल
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredHelplines.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-stone-200">
          <p className="text-stone-500 text-sm">कोई हेल्पलाइन नहीं मिली। कृपया अन्य शब्द खोजें।</p>
        </div>
      )}

      {/* Verification Instruction Guide for District / SP / Collector Contacts */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 sm:p-5 text-xs sm:text-sm text-stone-700 space-y-2">
        <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-amber-700" />
          जिलाधिकारी (DM/Collector) या पुलिस अधीक्षक (SP) का संपर्क कैसे खोजें?
        </h4>
        <ol className="list-decimal list-inside space-y-1 leading-relaxed text-stone-600">
          <li>
            प्रत्येक जिले का आधिकारिक पोर्टल होता है: <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800 font-mono text-xs">https://[district-name].nic.in</code> (जैसे: jaipur.nic.in, patna.nic.in, varanasi.nic.in)।
          </li>
          <li>
            पोर्टल के <strong>&quot;Directory&quot;</strong> या <strong>&quot;Contact Us&quot;</strong> सेक्शन में जाएं। वहाँ डीएम, एसपी, एसडीएम और तहसीलदारों के आधिकारिक नंबर उपलब्ध होते हैं।
          </li>
          <li>
            कभी भी गूगल सर्च के अनवेरिफाइड विज्ञापनों या रैंडम ब्लॉग्स से पुलिस/कलेक्टर के नंबर न लें।
          </li>
        </ol>
      </div>
    </div>
  );
};
