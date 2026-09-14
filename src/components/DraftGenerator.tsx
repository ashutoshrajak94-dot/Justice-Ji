import React, { useState } from "react";
import { Copy, Check, Printer, Download, Sparkles, RefreshCw, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { DRAFT_TEMPLATES } from "../data/legalData";

interface DraftGeneratorProps {
  initialDraft?: string;
  initialTemplate?: string;
}

export const DraftGenerator: React.FC<DraftGeneratorProps> = ({
  initialDraft,
  initialTemplate,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplate || "police-fir"
  );
  const [complainantName, setComplainantName] = useState<string>("");
  const [complainantPhone, setComplainantPhone] = useState<string>("");
  const [complainantAddress, setComplainantAddress] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [opponentAddress, setOpponentAddress] = useState<string>("");
  const [incidentDate, setIncidentDate] = useState<string>("");
  const [incidentPlace, setIncidentPlace] = useState<string>("");
  const [incidentDetails, setIncidentDetails] = useState<string>("");
  const [lossOrRelief, setLossOrRelief] = useState<string>("");
  const [additionalClauses, setAdditionalClauses] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedDraft, setGeneratedDraft] = useState<string>(
    initialDraft ||
      `सेवा में,
श्रीमान थाना प्रभारी महोदय,
पुलिस स्टेशन: संबंधित थाना, [जिला/शहर]

विषय: धारा 173 भारतीय नागरिक सुरक्षा संहिता, 2023 (BNSS) के अंतर्गत संज्ञेय अपराध की प्राथमिकी (FIR) दर्ज करने बाबत।

महोदय,
सविनय निवेदन है कि प्रार्थी/प्रार्थिया का विवरण निम्न प्रकार है:

1. यह कि प्रार्थी [नाम] निवासी [पता], मोबाइल नंबर [फोन नंबर] का स्थायी निवासी है।
2. यह कि दिनांक [तारीख] को समय लगभग [समय] बजे, स्थान [घटना स्थल] पर प्रार्थी के साथ विपक्षी [आरोपी का नाम] द्वारा निम्नलिखित घटना कारित की गई:
   - [घटना का संक्षिप्त एवं स्पष्ट विवरण]
3. यह कि उक्त कृत्य से प्रार्थी को मानसिक, शारीरिक एवं आर्थिक रूप से भारी नुकसान हुआ है। विपक्षी द्वारा प्रार्थी को गंभीर परिणाम भुगतने व जान से मारने की धमकी दी गई है।
4. यह कि विपक्षी का उक्त कृत्य भारतीय न्याय संहिता, 2023 (BNS) की सुसंगत धाराओं के तहत संज्ञेय व गैर-जमानती अपराध की श्रेणी में आता है।

प्रार्थना:
अतः श्रीमान जी से विनम्र प्रार्थना है कि मामले की गंभीरता को देखते हुए विपक्षी के विरुद्ध धारा 173 BNSS के तहत तत्काल प्रथम सूचना रिपोर्ट (FIR) दर्ज कर विधिसम्मत कानूनी कार्रवाई करने की कृपा करें, तथा प्रार्थी को FIR की निःशुल्क प्रति उपलब्ध कराएं।

संलग्नक (सबूतों की सूची):
1. प्रार्थी के पहचान पत्र की प्रति (आधार कार्ड)
2. घटना से संबंधित उपलब्ध साक्ष्य / ऑडियो / वीडियो / बैंक स्टेटमेंट / फोटो प्रति

दिनांक: __/__/202_
स्थान: _________

भवदीय / प्रार्थी:
हस्ताक्षर: _________________
नाम: [प्रार्थी का नाम]
पता: [प्रार्थी का पता]
मोबाइल नंबर: [फोन नंबर]`);

  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-fill sample data
  const handleAutoFillSample = () => {
    const template = DRAFT_TEMPLATES.find((t) => t.id === selectedTemplateId) || DRAFT_TEMPLATES[0];
    setComplainantName("राजेश कुमार शर्मा");
    setComplainantPhone("9876543210");
    setComplainantAddress("मकान नंबर 42, शास्त्री नगर, जयपुर, राजस्थान");
    setOpponentName("संजय वर्मा एवं अन्य अज्ञात व्यक्ति");
    setOpponentAddress("वार्ड नंबर 12, गांधी पथ, जयपुर");
    setIncidentDate("10 सितंबर 2024, शाम 6:30 बजे");
    setIncidentPlace("मेन मार्केट, शास्त्री नगर चौराहा");
    setIncidentDetails(template.sampleIncident);
    setLossOrRelief(template.sampleRelief);
    setAdditionalClauses("गवाहों के बयान, बैंक लेनदेन पर्ची और मोबाइल रिकॉर्डिंग साक्ष्य संलग्न हैं।");
  };

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMessage(null);

    const template = DRAFT_TEMPLATES.find((t) => t.id === selectedTemplateId);
    const draftType = template ? template.title : "कानूनी शिकायत आवेदन";

    try {
      const response = await fetch("/api/draft-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftType,
          complainantName,
          complainantPhone,
          complainantAddress,
          opponentName,
          opponentAddress,
          incidentDate,
          incidentPlace,
          incidentDetails,
          lossOrRelief,
          additionalClauses,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "ड्राफ्ट तैयार करने में समस्या आई।");
      }

      setGeneratedDraft(data.draft);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "ड्राफ्ट तैयार करने में त्रुटि आई।");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Justice Ji - कानूनी शिकायत ड्राफ्ट</title>
          <style>
            body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 40px; line-height: 1.8; color: #111; font-size: 15px; }
            pre { white-space: pre-wrap; font-family: inherit; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <pre>${generatedDraft}</pre>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedDraft], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `JusticeJi_Legal_Draft_${selectedTemplateId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Introduction banner */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-amber-300 font-['Rozha_One',serif]">
              शिकायत, नोटिस एवं प्राथमिकी (FIR) ड्राफ्ट मेकर
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">
              भारतीय नागरिक सुरक्षा संहिता (BNSS 2023), उपभोक्ता कानून एवं NI Act के तहत सीधे कोर्ट/थाने में प्रस्तुत करने योग्य कानूनी प्रारूप तैयार करें।
            </p>
          </div>
          <button
            onClick={handleAutoFillSample}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5" />
            नमूना विवरण भरें (Auto-Fill)
          </button>
        </div>
      </div>

      {/* Template selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DRAFT_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => {
              setSelectedTemplateId(tmpl.id);
              if (!incidentDetails) {
                setIncidentDetails(tmpl.sampleIncident);
                setLossOrRelief(tmpl.sampleRelief);
              }
            }}
            className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
              selectedTemplateId === tmpl.id
                ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20"
                : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-2">
                {tmpl.title}
              </h3>
              {selectedTemplateId === tmpl.id && (
                <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              )}
            </div>
            <p className="text-[11px] text-stone-600 mt-1.5 line-clamp-2">
              {tmpl.description}
            </p>
            <span className="inline-block mt-2 text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
              संबोधित: {tmpl.authority.slice(0, 30)}...
            </span>
          </button>
        ))}
      </div>

      {/* Form and Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700" />
              विवरण दर्ज करें
            </h3>
            <span className="text-xs text-stone-400">सभी जानकारी सुरक्षित है</span>
          </div>

          <form onSubmit={handleGenerateDraft} className="space-y-3.5 text-xs sm:text-sm">
            {/* Complainant details */}
            <div className="space-y-2">
              <span className="font-semibold text-stone-700 text-xs uppercase tracking-wider block">
                1. शिकायतकर्ता (प्रार्थी) का विवरण:
              </span>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="प्रार्थी का पूरा नाम *"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={complainantPhone}
                  onChange={(e) => setComplainantPhone(e.target.value)}
                  placeholder="मोबाइल नंबर"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={complainantAddress}
                  onChange={(e) => setComplainantAddress(e.target.value)}
                  placeholder="निवास का पता (शहर/जिला)"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Opponent details */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="font-semibold text-stone-700 text-xs uppercase tracking-wider block">
                2. विपक्षी / आरोपी / कंपनी का विवरण:
              </span>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="आरोपी व्यक्ति या कंपनी/विक्रेता का नाम"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
              />
              <input
                type="text"
                value={opponentAddress}
                onChange={(e) => setOpponentAddress(e.target.value)}
                placeholder="विपक्षी का पता / कार्यालय स्थान"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
              />
            </div>

            {/* Incident Details */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="font-semibold text-stone-700 text-xs uppercase tracking-wider block">
                3. घटना एवं स्थान का विवरण:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  placeholder="घटना की तारीख व समय"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={incidentPlace}
                  onChange={(e) => setIncidentPlace(e.target.value)}
                  placeholder="घटना का स्थान"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
                />
              </div>
              <textarea
                rows={3}
                value={incidentDetails}
                onChange={(e) => setIncidentDetails(e.target.value)}
                placeholder="घटना का पूरा विवरण विस्तार से लिखें... *"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
              />
            </div>

            {/* Relief sought */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="font-semibold text-stone-700 text-xs uppercase tracking-wider block">
                4. चाही गई राहत (प्रार्थना) व साक्ष्य:
              </span>
              <input
                type="text"
                value={lossOrRelief}
                onChange={(e) => setLossOrRelief(e.target.value)}
                placeholder="राहत (जैसे: FIR दर्ज हो, पैसा वापस मिले, क्षतिपूर्ति)"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
              />
              <input
                type="text"
                value={additionalClauses}
                onChange={(e) => setAdditionalClauses(e.target.value)}
                placeholder="संलग्नक / सबूतों की सूची (आधार कार्ड, बिल, स्क्रीनशॉट)"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-1 focus:ring-amber-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  कानूनी ड्राफ्ट तैयार हो रहा है...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  प्रमाणित कानूनी ड्राफ्ट तैयार करें
                </>
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right: Draft Preview (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col overflow-hidden">
          {/* Action bar */}
          <div className="bg-stone-100 border-b border-stone-200 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                विधिक प्रारूप (Ready Legal Draft)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer transition-all"
                title="पूरा ड्राफ्ट कॉपी करें"
              >
                {copiedDraft ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    कॉपी हो गया!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    कॉपी करें
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-stone-200 hover:bg-stone-300 text-stone-800 cursor-pointer transition-all"
                title="प्रिंट करें या PDF बनाएं"
              >
                <Printer className="w-3.5 h-3.5" />
                प्रिंट / PDF
              </button>

              <button
                onClick={handleDownload}
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-200 cursor-pointer"
                title="टेक्स्ट फाइल डाउनलोड करें"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Draft text view styled like a formal document */}
          <div className="p-6 bg-stone-50/40 flex-1 overflow-y-auto max-h-[600px]">
            <pre className="font-serif text-xs sm:text-sm text-stone-900 whitespace-pre-wrap leading-relaxed select-text p-4 bg-white rounded-lg border border-stone-200 shadow-2xs">
              {generatedDraft}
            </pre>
          </div>

          <div className="p-3 bg-stone-100 border-t border-stone-200 text-stone-600 text-xs flex items-center justify-between">
            <span>
              💡 <strong>सलाह:</strong> इस ड्राफ्ट की 2 प्रतियां प्रिंट करें। एक थाने/अधिकारी को दें और दूसरी पर मुहर लगी पावती (Receiving) अवश्य लें।
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
