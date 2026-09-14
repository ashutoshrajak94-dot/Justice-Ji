import React, { useState } from "react";
import { Search, Sparkles, RefreshCw, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { LAW_CONVERSIONS } from "../data/legalData";

export const LawConverter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [aiQuery, setAiQuery] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const filteredMappings = LAW_CONVERSIONS.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.offense.toLowerCase().includes(q) ||
      item.currentSection.toLowerCase().includes(q) ||
      item.oldSection.toLowerCase().includes(q) ||
      item.simpleMeaning.toLowerCase().includes(q)
    );
  });

  const handleAiVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsVerifying(true);
    setAiError(null);
    setAiResult(null);

    try {
      const response = await fetch("/api/verify-law", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery.trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "धारा सत्यापन नहीं हो सका।");
      }

      setAiResult(data.verification);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "सत्यापन में त्रुटि आई।");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner on 1 July 2024 New Criminal Laws */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-950">
            <h2 className="font-bold text-amber-900 text-sm sm:text-base">
              नए आपराधिक कानून (1 जुलाई 2024 से संपूर्ण भारत में प्रभावी)
            </h2>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200">
                <span className="font-bold text-stone-900 block">भारतीय न्याय संहिता (BNS 2023)</span>
                <span className="text-stone-600">IPC (भारतीय दंड संहिता 1860) की जगह</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200">
                <span className="font-bold text-stone-900 block">भारतीय नागरिक सुरक्षा संहिता (BNSS 2023)</span>
                <span className="text-stone-600">CrPC (दंड प्रक्रिया संहिता 1973) की जगह</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200">
                <span className="font-bold text-stone-900 block">भारतीय साक्ष्य अधिनियम (BSA 2023)</span>
                <span className="text-stone-600">Evidence Act (साक्ष्य अधिनियम 1872) की जगह</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Law Verification Search Box */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-stone-900 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-700" />
          किसी भी अपराध या धारा का वर्तमान कानून में सत्यापन करें (AI Verifier)
        </h3>
        <p className="text-xs text-stone-500 mb-3">
          पुरानी धारा या अपराध का नाम लिखें (जैसे: IPC 420, IPC 307, जीरो एफआईआर, चेक बाउंस, मारपीट)
        </p>

        <form onSubmit={handleAiVerify} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="जैसे: IPC 420 की नई धारा क्या है? या चोरी की धारा..."
            className="flex-1 px-3.5 py-2 rounded-lg border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
          />
          <button
            type="submit"
            disabled={isVerifying}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 font-semibold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                जाँच जारी है...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                सत्यापित करें
              </>
            )}
          </button>
        </form>

        {aiError && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {aiResult && (
          <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-2">
              सत्यापित कानूनी उत्तर (Verified Law Details):
            </h4>
            <pre className="font-sans text-xs sm:text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
              {aiResult}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Search in Standard Criminal Offenses Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-stone-900">
            प्रमुख अपराध: पुरानी धारा (IPC) बनाम वर्तमान धारा (BNS 2023)
          </h3>
          <div className="relative sm:w-72">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="तालिका में खोजें..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-stone-100 text-stone-700 uppercase font-semibold text-[11px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3">अपराध का नाम</th>
                <th className="p-3 text-amber-800">वर्तमान धारा (BNS/BNSS)</th>
                <th className="p-3 text-stone-500">पुरानी धारा (IPC/CrPC)</th>
                <th className="p-3">प्रकृति व जमानत</th>
                <th className="p-3">सजा</th>
                <th className="p-3">आसान भाषा में मतलब</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-800">
              {filteredMappings.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                  <td className="p-3 font-semibold text-stone-900">
                    {row.offense}
                  </td>
                  <td className="p-3 font-bold text-amber-700 bg-amber-50/40 whitespace-nowrap">
                    {row.currentSection}
                  </td>
                  <td className="p-3 text-stone-500 line-through whitespace-nowrap">
                    {row.oldSection}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="block text-xs">{row.nature}</span>
                    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${
                      row.bailStatus.includes("गैर-जमानती")
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {row.bailStatus}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-stone-700 min-w-[130px]">
                    {row.punishment}
                  </td>
                  <td className="p-3 text-xs text-stone-600 min-w-[180px]">
                    {row.simpleMeaning}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 bg-stone-100/80 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
        <p className="font-semibold text-stone-800">
          ⚠️ महत्वपूर्ण कानूनी सिद्धांत (Non-retroactivity / भूतप्रभावी प्रभाव नहीं):
        </p>
        <p>
          1 जुलाई 2024 के बाद घटित अपराधों पर <strong>भारतीय न्याय संहिता (BNS)</strong> लागू होगी। 1 जुलाई 2024 से पहले हुए अपराधों की जांच व ट्रायल भारतीय दंड संहिता (IPC) के तहत ही जारी रहेगा।
        </p>
      </div>
    </div>
  );
};
