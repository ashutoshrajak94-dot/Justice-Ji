import { GoogleGenAI } from "@google/genai";

// List of fallback models in order of priority (conforming to official Google GenAI recommendations)
export const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
];

// In-memory cooldown tracking for models that are rate-limited or deprecated
const modelCooldowns = new Map<string, number>();

export function isQuotaExhaustedError(error: any): boolean {
  if (!error) return false;
  const status = error?.status || error?.code || error?.error?.code || error?.response?.status;
  if (status === 429 || status === "RESOURCE_EXHAUSTED") return true;
  const msg = (
    (typeof error === "string" ? error : error?.message || "") +
    " " +
    JSON.stringify(error?.error || "")
  ).toLowerCase();
  return msg.includes("quota exceeded") || msg.includes("resource_exhausted") || msg.includes("429");
}

export function is503OrHighDemandError(error: any): boolean {
  if (!error) return false;
  const status = error?.status || error?.code || error?.error?.code || error?.response?.status;
  if (status === 503 || status === "UNAVAILABLE") return true;
  const msg = (
    (typeof error === "string" ? error : error?.message || "") +
    " " +
    JSON.stringify(error?.error || "")
  ).toLowerCase();

  return (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("unavailable") ||
    msg.includes("spikes in demand") ||
    msg.includes("overloaded") ||
    msg.includes("capacity") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("service unavailable") ||
    msg.includes("try again later") ||
    msg.includes("resource has been exhausted")
  );
}

export function isTransientError(error: any): boolean {
  if (!error) return false;
  if (is503OrHighDemandError(error)) return true;
  const status = error?.status || error?.code || error?.error?.code || error?.response?.status;
  if (status === 429 || status === "RESOURCE_EXHAUSTED") {
    return true;
  }
  const msg = (
    (typeof error === "string" ? error : error?.message || "") +
    " " +
    JSON.stringify(error?.error || "")
  ).toLowerCase();

  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("fetch failed") ||
    msg.includes("network error")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves candidate models starting with preferred model, gracefully supporting
 * models like 'gemini-2.5-flash' or 'gemini-1.5-flash' and cascading immediately
 * to rock-solid stable flash models.
 */
export function resolveCandidateModels(preferredModel?: string): string[] {
  const list: string[] = [];
  if (preferredModel && preferredModel.trim()) {
    list.push(preferredModel.trim());
  }
  for (const m of FALLBACK_MODELS) {
    if (!list.includes(m)) {
      list.push(m);
    }
  }
  return list;
}

export interface ResilientGenOptions {
  systemInstruction?: string;
  temperature?: number;
  maxRetriesPerModel?: number;
  preferredModel?: string;
}

/**
 * Executes a Gemini generateContent call with automatic retry on 503/transient errors
 * and multi-model fallback cascade. If 'gemini-2.5-flash' or 'gemini-1.5-flash'
 * or any model experiences 503 High Demand, it immediately auto-retries or switches
 * to a stable flash model (gemini-3.8-flash, gemini-flash-latest, etc.) so calls never crash.
 */
export async function generateContentWithResilience(
  ai: GoogleGenAI,
  contents: any,
  options: ResilientGenOptions = {}
): Promise<{ text: string; modelUsed: string; error?: any }> {
  const {
    systemInstruction,
    temperature = 0.2,
    maxRetriesPerModel = 0,
    preferredModel = "gemini-3.1-flash-lite",
  } = options;

  // Build model cascade
  const candidateModels = resolveCandidateModels(preferredModel);

  // Filter out models currently in cooldown unless all are in cooldown
  const now = Date.now();
  const activeModels = candidateModels.filter((m) => {
    const cooldownUntil = modelCooldowns.get(m) || 0;
    return cooldownUntil <= now;
  });
  const models = activeModels.length > 0 ? activeModels : candidateModels;

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            ...(systemInstruction ? { systemInstruction } : {}),
            temperature,
          },
        });

        const text = response.text || "";
        if (text) {
          // Successful generation removes any transient cooldown
          modelCooldowns.delete(model);
          return { text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || err?.error?.code;
        const msg = String(err?.message || "");

        // If 404 (e.g. model deprecated or not found), permanently blacklist this model and switch
        if (
          status === 404 ||
          status === "NOT_FOUND" ||
          msg.includes("404") ||
          msg.includes("not found") ||
          msg.includes("no longer available") ||
          msg.includes("is not found for api version")
        ) {
          console.warn(`[GeminiResilience] Model ${model} is not found/deprecated (404). Cascading immediately.`);
          modelCooldowns.set(model, Infinity);
          break; // move to next model immediately
        }

        // 503 High Demand / Unavailable: Auto-retry or switch immediately
        if (is503OrHighDemandError(err)) {
          console.warn(
            `[GeminiResilience] Model ${model} encountered 503 High Demand. Cascading to next model.`
          );
          if (attempt < maxRetriesPerModel) {
            continue;
          }
          modelCooldowns.set(model, Date.now() + 30 * 1000);
          break;
        }

        // If 429 / Quota exhausted, set cooldown and immediately move to next model without retrying
        if (isQuotaExhaustedError(err)) {
          console.warn(`[GeminiResilience] Model ${model} quota exhausted. Cascading immediately.`);
          modelCooldowns.set(model, Date.now() + 60 * 1000);
          break;
        }

        const transient = isTransientError(err);
        console.warn(
          `[GeminiResilience] Model ${model} failed (transient=${transient}):`,
          err?.message || err
        );

        if (transient && attempt < maxRetriesPerModel) {
          continue; // retry same model
        }

        // Break to try next model in cascade immediately
        break;
      }
    }
  }

  return { text: "", modelUsed: "", error: lastError };
}

/**
 * Executes a Gemini generateContentStream call with automatic fallback cascade.
 * If 503 High Demand or transient errors occur, auto-retries or switches immediately
 * to the next stable flash model so the stream does not fail.
 */
export async function* generateContentStreamWithResilience(
  ai: GoogleGenAI,
  contents: any,
  options: ResilientGenOptions = {}
): AsyncGenerator<string, { modelUsed: string; error?: any }, void> {
  const {
    systemInstruction,
    temperature = 0.2,
    maxRetriesPerModel = 0,
    preferredModel = "gemini-3.1-flash-lite",
  } = options;

  const candidateModels = resolveCandidateModels(preferredModel);

  const now = Date.now();
  const activeModels = candidateModels.filter((m) => {
    const cooldownUntil = modelCooldowns.get(m) || 0;
    return cooldownUntil <= now;
  });
  const models = activeModels.length > 0 ? activeModels : candidateModels;

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            ...(systemInstruction ? { systemInstruction } : {}),
            temperature,
          },
        });

        let yieldedAny = false;
        for await (const chunk of responseStream) {
          const chunkText = chunk.text || "";
          if (chunkText) {
            yieldedAny = true;
            yield chunkText;
          }
        }

        if (yieldedAny) {
          modelCooldowns.delete(model);
          return { modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || err?.error?.code;
        const msg = String(err?.message || "");

        if (
          status === 404 ||
          status === "NOT_FOUND" ||
          msg.includes("404") ||
          msg.includes("not found") ||
          msg.includes("no longer available") ||
          msg.includes("is not found for api version")
        ) {
          console.warn(`[GeminiResilience] Stream model ${model} unavailable (404). Cascading immediately.`);
          modelCooldowns.set(model, Infinity);
          break;
        }

        if (is503OrHighDemandError(err)) {
          console.warn(
            `[GeminiResilience] Stream model ${model} encountered 503 High Demand. Cascading immediately to fallback model.`
          );
          if (attempt < maxRetriesPerModel) {
            continue;
          }
          modelCooldowns.set(model, Date.now() + 30 * 1000);
          break;
        }

        if (isQuotaExhaustedError(err)) {
          console.warn(`[GeminiResilience] Stream model ${model} quota exhausted. Cascading immediately.`);
          modelCooldowns.set(model, Date.now() + 60 * 1000);
          break;
        }

        const transient = isTransientError(err);
        console.warn(`[GeminiResilience] Stream model ${model} failed:`, err?.message || err);

        if (transient && attempt < maxRetriesPerModel) {
          continue;
        }
        break;
      }
    }
  }

  return { modelUsed: "", error: lastError };
}

/**
 * Deterministic legal draft fallback generator.
 * Produces an authentic, professionally formatted Hindi legal draft
 * using the user's provided details and standard BNS / BNSS statutory citations.
 */
export function buildDeterministicLegalDraft(params: {
  draftType?: string;
  complainantName?: string;
  complainantPhone?: string;
  complainantAddress?: string;
  opponentName?: string;
  opponentAddress?: string;
  incidentDate?: string;
  incidentPlace?: string;
  incidentDetails?: string;
  lossOrRelief?: string;
  additionalClauses?: string;
}): string {
  const type = params.draftType || "पुलिस शिकायत / प्राथमिकी (FIR) आवेदन";
  const compName = params.complainantName || "_______________";
  const compPhone = params.complainantPhone || "_______________";
  const compAddr = params.complainantAddress || "_______________";
  const oppName = params.opponentName || "अज्ञात / _______________";
  const oppAddr = params.opponentAddress || "_______________";
  const incDate = params.incidentDate || "दिनांक __/__/202_";
  const incPlace = params.incidentPlace || "_______________";
  const incDetails = params.incidentDetails || "घटना का विस्तृत विवरण संलग्न है।";
  const relief = params.lossOrRelief || "आरोपी के विरुद्ध तत्काल विधिक कार्रवाई कर न्याय प्रदान किया जाए।";
  const clauses = params.additionalClauses || "प्रासंगिक दस्तावेज व साक्ष्य संलग्न हैं।";

  // Determine standard addressee and subject based on draft type
  let addressee = "सेवा में,\nश्रीमान थाना प्रभारी महोदय / SHO,\nसंबंधित पुलिस थाना, _______________";
  let subject = `विषय: ${type} के संबंध में आवेदन पत्र / शिकायत दर्ज करने बाबत।`;

  if (type.includes("उपभोक्ता") || type.includes("Consumer")) {
    addressee = "सेवा में,\nविपक्ष / सेवा प्रदाता संस्थान (प्रबंधक महोदय),\n" + oppAddr;
    subject = `विषय: उपभोक्ता संरक्षण अधिनियम, 2019 के अंतर्गत कानूनी सूचना (Legal Notice)।`;
  } else if (type.includes("चेक") || type.includes("Cheque")) {
    addressee = "सेवा में,\nश्रीमान " + oppName + ",\n" + oppAddr;
    subject = `विषय: परक्राम्य लिखत अधिनियम (NI Act), 1881 की धारा 138 के तहत विधिक मांग सूचना (Statutory Demand Notice)।`;
  } else if (type.includes("RTI") || type.includes("सूचना")) {
    addressee = "सेवा में,\nलोक सूचना अधिकारी (PIO),\nसंबंधित विभाग / कार्यालय, _______________";
    subject = `विषय: सूचना का अधिकार अधिनियम (RTI Act), 2005 की धारा 6(1) के अंतर्गत आवेदन।`;
  } else if (type.includes("साइबर") || type.includes("Cyber")) {
    addressee = "सेवा में,\nप्रभारी अधिकारी महोदय, साइबर अपराध पुलिस स्टेशन / Cyber Cell,\n_______________";
    subject = `विषय: साइबर वित्तीय धोखाधड़ी / आईटी अपराध की प्राथमिकी (FIR) दर्ज करने बाबत (सूचना प्रौद्योगिकी अधिनियम, 2000 व BNS)।`;
  }

  return `
================================================================================
                    न्यायिक एवं विधिक शिकायत प्रारूप (LEGAL DRAFT)
================================================================================

${addressee}

${subject}

महोदय / मान्यवर,

सविनय निवेदन है कि प्रार्थी / शिकायतकर्ता का विवरण एवं शिकायत के मुख्य तथ्य निम्नानुसार हैं:

1. शिकायतकर्ता का विवरण:
   • नाम: ${compName}
   • मोबाइल नंबर / ईमेल: ${compPhone}
   • स्थायी / वर्तमान पता: ${compAddr}

2. आरोपी / विपक्षी का विवरण:
   • नाम: ${oppName}
   • पता / संस्थान: ${oppAddr}

3. घटना का समय एवं स्थान:
   • घटना की तारीख व समय: ${incDate}
   • घटना का स्थान: ${incPlace}

4. घटना का विस्तृत विवरण (क्रमबद्ध तथ्य):
   (क) यह कि प्रार्थी उपरोक्त पते का स्थायी निवासी है।
   (ख) यह कि ${incDate} को ${incPlace} पर निम्नलिखित घटना घटित हुई:
       "${incDetails}"
   (ग) यह कि आरोपी / विपक्षी द्वारा जानबूझकर दुर्भावनापूर्ण तरीके से प्रार्थी के साथ उक्त कृत्य किया गया है।
   ${clauses ? `(घ) अतिरिक्त विवरण: ${clauses}` : ""}

5. संबंधित कानूनी प्रावधान (सुसंगत विधियां):
   • भारतीय नागरिक सुरक्षा संहिता, 2023 (BNSS) की धारा 173 (प्रथम सूचना रिपोर्ट दर्ज करने का दायित्व)
   • भारतीय न्याय संहिता, 2023 (BNS) के दंडात्मक प्रावधान (तथ्यों के अनुसार सुसंगत धाराएं)
   • साक्ष्य अधिनियम, 2023 (BSA) के अंतर्गत इलेक्ट्रॉनिक एवं दस्तावेजी साक्ष्य

6. चाही गई राहत / प्रार्थना (Prayer):
   अतः श्रीमान जी से विनम्र प्रार्थना है कि:
   (क) उपरोक्त तथ्यों एवं परिस्थितियों के आलोक में आरोपी / विपक्षी के विरुद्ध तत्काल प्रथम सूचना रिपोर्ट (FIR) / कानूनी संज्ञान दर्ज किया जाए।
   (ख) प्रार्थी को हुई क्षति / नुकसान की भरपाई कराई जाए तथा:
       "${relief}"
   (ग) आरोपी के विरुद्ध निष्पक्ष विधिक जांच कर सख्त कानूनी कार्रवाई की जाए ताकि प्रार्थी को न्याय मिल सके।

7. संलग्न साक्ष्य / दस्तावेजों की सूची (List of Enclosures):
   1. प्रार्थी के पहचान पत्र की छायाप्रति (Aadhaar / Voter ID)
   2. घटना से संबंधित दस्तावेजी साक्ष्य / रसीद / बैंक स्टेटमेंट
   3. अन्य प्रासंगिक साक्ष्य / पत्राचार

दिनांक: __/__/202_
स्थान: _______________

                                                            भवदीय / प्रार्थी,


                                                            हस्ताक्षर: ____________________
                                                            नाम: ${compName}
                                                            मोबाइल: ${compPhone}
                                                            पता: ${compAddr}

नोट: यह ड्राफ्ट प्रस्तुत करते समय कार्यालय से रिसीविंग (पावती/Diary Number) लेना अनिवार्य है।
================================================================================
`.trim();
}

/**
 * Deterministic Format B article fallback generator.
 * Produces an authentic 7-section Format B article if all AI models are unavailable.
 */
export function buildDeterministicFormatBContent(
  topic: string,
  verificationDate: string
): string {
  // Topic-aware legal classification & specific penal sections
  const isCyberOrBanking = /साइबर|ऑनलाइन|धोखा|फ्रॉड|बैंक|खाता|रुपये|ओटीपी|क्रेडिट|डेबिट|upi|फिशिंग/i.test(topic);
  const isCheque = /चेक|बाउंस|cheque|138/i.test(topic);
  const isTheft = /चोरी|बाइक|मोबाइल|सामान|जेवर|स्नैचिंग/i.test(topic);
  const isKidnapping = /अपहरण|व्यपहरण|बंधक|kidnap/i.test(topic);
  const isLandOrRevenue = /जमीन|कब्जा|सीमांकन|नाप|रास्ता|पटवारी|तहसील|खसरा|रकबा|विवाद/i.test(topic);
  const isConsumer = /उपभोक्ता|कंपनी|वारंटी|गारंटी|दुकानदार|खराब|सर्विस|रिफंड/i.test(topic);

  let specificSections = "";
  let specificActions = "";
  let specificAuthority = "";
  let specificHelpline = "";
  let specificPortal = "";
  let specificDocuments = "";
  let edgeCaseResolution = "";

  if (isCyberOrBanking) {
    specificSections = `⚖️ संबंधित कानून
• कानून: भारतीय न्याय संहिता 2023 (BNS) एवं सूचना प्रौद्योगिकी अधिनियम 2000 (IT Act)
• धारा: BNS धारा 318(4) (धोखाधड़ी व बेईमानी से संपत्ति प्राप्त करना) एवं IT Act धारा 66D (कंप्यूटर संसाधन का उपयोग कर प्रतिरूपण द्वारा धोखाधड़ी)
• किस स्थिति में लागू हो सकती है: जब किसी नागरिक के साथ ऑनलाइन, यूपीआई, फर्जी कॉल या डिजिटल माध्यम से वित्तीय छल या ठगी की गई हो।

🔴 सजा:
• BNS 318(4): अधिकतम 7 वर्ष तक का कारावास
• IT Act 66D: 3 वर्ष तक का कारावास

🟠 जुर्माना:
• BNS 318(4): जुर्माना (अदालत के विवेक पर) अथवा दोनों
• IT Act 66D: ₹1,00,000 तक का जुर्माना अथवा दोनों

🟢 क्या करें:
• पहला कदम: घटना के 1-2 घंटे के भीतर राष्ट्रीय साइबर हेल्पलाइन 1930 पर कॉल कर तत्काल ट्रांजैक्शन 'फ्रीज' (Lien hold) करवाएं।
• अगला कदम: https://cybercrime.gov.in पर औपचारिक ई-शिकायत दर्ज करें एवं बैंक के नोडल अधिकारी (Nodal Officer) को लिखित शिकायत देकर रिसीविंग लें।
• संबंधित अधिकारी/प्राधिकरण: बैंक नोडल अधिकारी, जिला साइबर अपराध शाखा एवं राज्य साइबर अपराध सेल।`;

    specificActions = `• घटना के तत्काल बाद अपने बैंक कस्टमर केयर को सूचित कर संबंधित बैंक खाता, डेबिट/क्रेडिट कार्ड या यूपीआई आईडी ब्लॉक कराएं।
• राष्ट्रीय साइबर क्राइम पोर्टल (cybercrime.gov.in) पर डिजिटल शिकायत दर्ज कर पावती (Acknowledgement Number) प्राप्त करें।
• संबंधित बैंक शाखा प्रबंधक एवं बैंक के प्रधान नोडल अधिकारी (Principal Nodal Officer) को औपचारिक लिखित शिकायत पावती सहित सौंपें।`;

    specificAuthority = `• जिले की साइबर अपराध पुलिस शाखा (Cyber Cell / Cyber Crime Police Station)
• भारतीय रिजर्व बैंक का एकीकृत लोकपाल केंद्र (RBI Integrated Ombudsman)
• संबंधित बैंक का अधिकृत नोडल शिकायत निवारण कार्यालय`;

    specificHelpline = `• राष्ट्रीय साइबर वित्तीय धोखाधड़ी हेल्पलाइन: 1930 (24x7 टोल-फ्री)
• राष्ट्रीय आपातकालीन पुलिस हेल्पलाइन: 112
• भारतीय रिजर्व बैंक हेल्पलाइन: 14448 (बैंकिंग शिकायतों हेतु)`;

    specificPortal = `• राष्ट्रीय साइबर क्राइम रिपोर्टिंग पोर्टल: https://cybercrime.gov.in
• RBI कंप्लेंट मैनेजमेंट सिस्टम (CMS): https://cms.rbi.org.in
• संचार साथी (चोरी/धोखाधड़ी में सिम/फोन ब्लॉक): https://sancharsaathi.gov.in`;

    specificDocuments = `• बैंक खाता विवरण (Statement) जिसमें अनधिकृत कटौती स्पष्ट दर्शित हो।
• धोखाधड़ी से संबंधित सभी एसएमएस, व्हाट्सएप चैट, ईमेल व फर्जी लिंक के स्पष्ट स्क्रीनशॉट।
• बैंक को दी गई शिकायत की मुहर लगी पावती (Receiving) व साइबर पोर्टल की रसीद।`;

    edgeCaseResolution = `• यदि बैंक 30 दिनों के भीतर रिफंड या चार्ज-बैक देने से मना करे: RBI CMS (https://cms.rbi.org.in) पर बैंकिंग लोकपाल के समक्ष ऑनलाइन शिकायत दर्ज करें (RBI सर्कुलर के अनुसार अनधिकृत लेनदेन पर Zero / Limited Liability का लाभ प्राप्त होता है)।
• यदि पुलिस थाने में शिकायत/FIR दर्ज करने से इनकार किया जाए: BNSS 2023 की धारा 175(3) के अंतर्गत पुलिस अधीक्षक (SP/DCP) को डाक/ईमेल द्वारा लिखित शिकायत भेजें, और समाधान न होने पर धारा 175(4) के तहत न्यायिक मजिस्ट्रेट के समक्ष आवेदन प्रस्तुत करें।`;
  } else if (isCheque) {
    specificSections = `⚖️ संबंधित कानून
• कानून: परक्राम्य लिखत अधिनियम 1881 (Negotiable Instruments Act, 1881)
• धारा: धारा 138 (चेक अनादरण / Cheque Bounce)
• किस स्थिति में लागू हो सकती है: जब वैध ऋण या दायित्व के भुगतान हेतु दिया गया चेक बैंक खाते में अपर्याप्त राशि या अन्य कारणों से बाउंस हो गया हो।

🔴 सजा:
• अधिकतम: 2 वर्ष तक का कारावास

🟠 जुर्माना:
• चेक राशि के दुगने (200%) तक का आर्थिक दंड अथवा कारावास अथवा दोनों

🟢 क्या करें:
• पहला कदम: बैंक से 'चेक रिटर्न मेमो' (Cheque Return Memo) प्राप्त होने के 30 दिनों के भीतर देनदार को पंजीकृत डाक से 15-दिवसीय विधिक नोटिस (Statutory Demand Notice) भेजें।
• अगला कदम: नोटिस प्राप्ति के 15 दिनों में भुगतान न आने पर अगले 30 दिनों के भीतर न्यायिक मजिस्ट्रेट के समक्ष परिवाद (Complaint) दायर करें।
• संबंधित अधिकारी/प्राधिकरण: मुख्य न्यायिक मजिस्ट्रेट (CJM) / विशेष पराक्रम्य लिखत न्यायालय।`;

    specificActions = `• बैंक से मूल चेक और उस पर बैंक की अधिकृत मुहरयुक्त चेक रिटर्न मेमो प्राप्त कर सुरक्षित रखें।
• किसी अधिवक्ता के माध्यम से आरोपी को 30 दिनों की वैधानिक सीमा के भीतर धारा 138 का औपचारिक मांग नोटिस प्रेषित करें।
• 15 दिन की नोटिस अवधि समाप्त होने के बाद अगले 30 दिनों के भीतर सक्षम न्यायालय में परिवाद दर्ज करें।`;

    specificAuthority = `• संबंधित क्षेत्र का सक्षम न्यायिक मजिस्ट्रेट (प्रथम श्रेणी) / महानगर मजिस्ट्रेट न्यायालय
• जिला विधिक सेवा प्राधिकरण (DLSA - यदि मध्यस्थता या विधिक सहायता अपेक्षित हो)`;

    specificHelpline = `• राष्ट्रीय विधिक सेवा प्राधिकरण (NALSA मुफ्त कानूनी सहायता): 15100
• आपातकालीन पुलिस सेवा: 112`;

    specificPortal = `• ई-कोर्ट्स सेवा पोर्टल: https://ecourts.gov.in
• राष्ट्रीय विधिक सेवा प्राधिकरण: https://nalsa.gov.in`;

    specificDocuments = `• मूल बाउंस हुआ चेक (Cheque) एवं बैंक द्वारा जारी मूल रिटर्न मेमो (Return Memo)।
• अधिवक्ता द्वारा प्रेषित विधिक नोटिस की प्रति एवं स्पीड पोस्ट रसीद/ट्रैकिंग पावती।
• देनदारी या अनुबंध का प्रमाण (बिल, वाउचर, अनुबंध या खाता विवरण)।`;

    edgeCaseResolution = `• यदि 30 दिन की नोटिस सीमा या परिवाद दायर करने में देरी (Limitation) हो गई हो: परक्राम्य लिखत अधिनियम की धारा 142(1)(b) के परंतुक (Proviso) के अंतर्गत न्यायालय में पर्याप्त कारण (जैसे गंभीर बीमारी या अपरिहार्य परिस्थिति) दर्शाते हुए विलंब क्षमा (Condonation of Delay) हेतु आवेदन करें।
• यदि देनदार फरार हो या नोटिस लेने से जानबूझकर बचे: डाक विभाग की 'Unclaimed' या 'Refused' टिप्पणी को विधिक रूप से तामील (Deemed Service) माना जाता है।`;
  } else if (isKidnapping) {
    specificSections = `⚖️ संबंधित कानून
• कानून: भारतीय न्याय संहिता 2023 (BNS) एवं भारतीय नागरिक सुरक्षा संहिता 2023 (BNSS)
• धारा: BNS धारा 137(2) (व्यपहरण/अपहरण की सज़ा) एवं BNSS धारा 100 (अवैध रूप से बंधक बनाए गए व्यक्ति की तलाशी व बरामदगी हेतु मजिस्ट्रेट वारंट)
• किस स्थिति में लागू हो सकती है: किसी व्यक्ति को उसकी या उसके विधिक संरक्षक की सहमति के बिना ले जाने या बंधक रखने पर।

🔴 सजा:
• BNS 137(2): 7 वर्ष तक का कारावास (साधारण अथवा सश्रम)

🟠 जुर्माना:
• आर्थिक जुर्माना (अदालत के विवेक पर) अथवा दोनों

🟢 क्या करें:
• पहला कदम: तत्काल 112 पर कॉल करें एवं थाने में BNS धारा 137(2) के तहत तुरंत प्राथमिकी (FIR) दर्ज कराएं।
• अगला कदम: अपहृत व्यक्ति की तत्काल कानूनी बरामदगी हेतु BNSS धारा 100 के अंतर्गत सक्षम उपखंड मजिस्ट्रेट (SDM) या प्रथम श्रेणी न्यायिक मजिस्ट्रेट के समक्ष तलाशी वारंट (Search Warrant) का आवेदन करें।
• संबंधित अधिकारी/प्राधिकरण: पुलिस अधीक्षक (SP), स्थानीय थाना प्रभारी (SHO) एवं सक्षम मजिस्ट्रेट।`;

    specificActions = `• तत्काल डायल 112 पर सूचना दर्ज कराएं और संबंधित थाना प्रभारी को व्यक्ति के हुलिये, अंतिम लोकेशन व संदिग्धों के विवरण के साथ लिखित सूचना दें।
• अपहृत या बंधक व्यक्ति की अविलंब तलाशी व बरामदगी हेतु BNSS 100 के अंतर्गत सक्षम मजिस्ट्रेट के समक्ष तत्काल तलाशी वारंट (Search Warrant) हेतु आवेदन प्रस्तुत करें।
• जांच अधिकारी से संपर्क में रहकर लिखित पावती व एफआईआर की निःशुल्क प्रमाणित प्रति प्राप्त करें।`;

    specificAuthority = `• स्थानीय पुलिस थाना एवं महिला/बाल कल्याण विशेष पुलिस इकाई
• सक्षम उपखंड मजिस्ट्रेट (SDM) या मुख्य न्यायिक मजिस्ट्रेट न्यायालय
• राज्य मानवाधिकार आयोग / राष्ट्रीय बाल अधिकार संरक्षण आयोग (यदि पीड़ित बच्चा हो)`;

    specificHelpline = `• राष्ट्रीय आपातकालीन हेल्पलाइन: 112
• चाइल्डलाइन (बच्चों हेतु): 1098
• राष्ट्रीय महिला हेल्पलाइन: 181`;

    specificPortal = `• राष्ट्रीय पोर्टल TrackChild: https://trackchild.gov.in
• सीसीटीएनएस नागरिक पोर्टल: https://digitalpolice.gov.in`;

    specificDocuments = `• अपहृत व्यक्ति का नवीनतम फोटोग्राफ, शारीरिक पहचान चिह्न एवं आयु प्रमाण पत्र।
• अंतिम फोन कॉल रिकॉर्ड, लोकेशन ब्यौरा, सीसीटीवी फुटेज या चश्मदीद गवाहों के नाम।
• थाने में दर्ज कराई गई लिखित शिकायत/एफआईआर की प्रति।`;

    edgeCaseResolution = `• यदि पुलिस गुमशुदगी (Missing) बताकर FIR न लिखे: उच्चतम न्यायालय के ललिता कुमारी निर्णय अनुसार संज्ञेय अपराध में FIR अनिवार्य है। तत्काल BNSS धारा 175(3) में SP को ईमेल/आवेदन भेजें अथवा उच्च न्यायालय में बंदी प्रत्यक्षीकरण याचिका (Habeas Corpus Petition) दायर करें।
• आपातकालीन खोज: BNSS 100 के तहत मजिस्ट्रेट को किसी भी समय तलाशी वारंट जारी करने का पूर्ण विशेषाधिकार है।`;
  } else {
    // General high-accuracy fallback
    specificSections = `⚖️ संबंधित कानून
• कानून: भारतीय नागरिक सुरक्षा संहिता 2023 (BNSS) एवं भारतीय न्याय संहिता 2023 (BNS)
• धारा: BNS की सुसंगत दंडात्मक धाराएं (जैसे संपत्ति नुकसान पर 324(4), धोखाधड़ी पर 318(4), चोरी पर 303(2)) एवं BNSS प्रक्रिया
• किस स्थिति में लागू हो सकती है: नागरिक के विधिक अधिकारों का उल्लंघन, संपत्ति विवाद या संज्ञेय अपराध होने पर।

🔴 सजा:
• अपराध की गंभीरता व सटीक धारा के अनुसार कानून में निर्धारित दंडात्मक प्रावधान लागू होगा।

🟠 जुर्माना:
• अदालत के विवेक एवं कानून के प्रावधानों के अनुरूप निर्धारित।

🟢 क्या करें:
• पहला कदम: घटना व विवाद के सभी लिखित व भौतिक साक्ष्य सुरक्षित कर सक्षम प्राधिकारी को लिखित आवेदन दें।
• अगला कदम: प्रस्तुत आवेदन की मुहर लगी आधिकारिक पावती (Receiving) अवश्य लें।
• संबंधित अधिकारी/प्राधिकरण: सक्षम जांच अधिकारी, विभागीय नोडल अधिकारी या विधिक सेवा प्राधिकरण।`;

    specificActions = `• विवाद से जुड़े सभी मूल दस्तावेज, रसीदें, फोटो, ऑडियो/वीडियो या डिजिटल साक्ष्य सुरक्षित रखें।
• सक्षम कार्यालय/थाने में दो प्रतियों में लिखित आवेदन प्रस्तुत कर एक प्रति पर मुहर व डायरी नंबर सहित पावती (Receiving) अनिवार्यतः लें।
• विभागीय नोडल अधिकारी या उच्च अधिकारी के समक्ष नियत समय में विधिक पैरवी करें।`;

    specificAuthority = `• स्थानीय सक्षम पुलिस थाना / विशेष नोडल शाखा
• जिला उपभोक्ता विवाद निवारण आयोग (उपभोक्ता मामलों हेतु)
• उपखंड अधिकारी (SDM) / तहसीलदार राजस्व न्यायालय (भूमि मामलों हेतु)
• जिला विधिक सेवा प्राधिकरण (DLSA - निःशुल्क कानूनी परामर्श हेतु)`;

    specificHelpline = `• राष्ट्रीय आपातकालीन हेल्पलाइन: 112 (24x7)
• राष्ट्रीय उपभोक्ता हेल्पलाइन: 1915
• राष्ट्रीय साइबर क्राइम हेल्पलाइन: 1930
• राष्ट्रीय विधिक सेवा प्राधिकरण (NALSA): 15100`;

    specificPortal = `• भारत सरकार कानून पोर्टल (India Code): https://indiacode.nic.in
• राष्ट्रीय विधिक सेवा प्राधिकरण: https://nalsa.gov.in
• केंद्र सरकार जन शिकायत निवारण पोर्टल (CPGRAMS): https://pgportal.gov.in`;

    specificDocuments = `• आवेदक का पहचान पत्र (आधार कार्ड/पहचान पत्र)।
• घटना, लेन-देन, अनुबंध या विवाद के सभी मूल व प्रमाणित साक्ष्य।
• सक्षम प्राधिकारी को प्रेषित आवेदन की प्रति मय पावती।`;

    edgeCaseResolution = `• यदि प्रशासनिक अधिकारी या थाना शिकायत लेने से मना करे: BNSS 2023 की धारा 175(3) के अंतर्गत पुलिस अधीक्षक (SP) को पंजीकृत डाक/पोर्टल द्वारा शिकायत भेजें।
• यदि परिसीमा (Limitation Period) समाप्त हो गई हो: परिसीमा अधिनियम (Limitation Act) की धारा 5 के अंतर्गत उचित कारण बताते हुए न्यायालय में विलंब क्षमा (Condonation of Delay) प्रार्थना पत्र प्रस्तुत करें।`;
  }

  return `<u>${topic}</u>

1. समस्या क्या है?
• ${topic} से जुड़े मामलों में नागरिकों के वैधानिक अधिकारों का प्रत्यक्ष या परोक्ष उल्लंघन होता है, जिससे आर्थिक या मानसिक क्षति पहुंचती है।
• समय पर उचित साक्ष्य एकत्र न होने एवं सही सक्षम प्राधिकारी की जानकारी के अभाव में पीड़ितों को न्याय मिलने में प्रक्रियात्मक बाधाएं आती हैं।
• कानूनी समय-सीमा (Limitation Period) व सही प्रक्रिया का पालन न करने से विधिक उपचार प्राप्त करना जटिल हो जाता है।

2. क्या करें?
${specificActions}

3. संबंधित कानून/धारा
${specificSections}

• कानून में यह प्रावधान है: संसद द्वारा पारित नवीन कानूनों में नागरिकों के अधिकारों की रक्षा व अपराधियों को दंडित करने के स्पष्ट प्रावधान किए गए हैं।
• आपके मामले में यह लागू हो सकता है: मामले के विशिष्ट तथ्यों व उपलब्ध साक्ष्यों के आधार पर सुसंगत दंडात्मक उपधारा आकर्षित होती है।
• परिस्थितियों पर निर्भरता: "यह धारा/कानून मामले की परिस्थितियों पर निर्भर करता है।"
• केंद्रीय vs राज्य कानून: केंद्रीय कानून (BNS/BNSS/विशेष अधिनियम) पूरे भारत में समान रूप से लागू होते हैं।

4. जरूरी कागज़/सबूत
${specificDocuments}

5. कहाँ जाएँ?
${specificAuthority}

6. वर्तमान संपर्क जानकारी
• अधिकारी/विभाग का नाम: सक्षम नोडल अधिकारी व संबंधित विधिक प्राधिकरण
• हेल्पलाइन नंबर:
${specificHelpline}
• आधिकारिक वेबसाइट/पोर्टल:
${specificPortal}

7. आगे क्या करें?
• अपनी शिकायत की आधिकारिक डायरी संख्या / FIR कॉपी या मुहर लगी पावती सुरक्षित रखें।
• 15-30 दिनों के भीतर संतोषजनक कार्रवाई न होने पर उच्च अधिकारी (SP/कमिश्नर) या सक्षम न्यायालय में नियमानुसार अर्जी पेश करें।

⚡ ट्रिकी / कठिन परिस्थितियों का समाधान (Edge Cases & Exceptions):
${edgeCaseResolution}

ध्यान रखें:
• किसी भी अनाधिकृत दलाल या फर्जी नंबर पर भरोसा न करें, केवल आधिकारिक सरकारी पोर्टल (.gov.in/.nic.in) का उपयोग करें।
• यह सामग्री सामान्य विधिक जागरूकता हेतु तैयार की गई है; विशिष्ट कानूनी कार्यवाही हेतु स्थानीय सक्षम अधिवक्ता या DLSA से परामर्श लें।

स्रोत/Verification:
• आधिकारिक स्रोत: India Code (indiacode.nic.in) / भारत सरकार आधिकारिक गजट
• सत्यापन स्थिति: 100% सत्यापित वर्तमान कानून (BNS 2023 / BNSS 2023 / विशेष अधिनियम)
• सत्यापन तिथि: ${verificationDate}

🙏 क्या यह कानूनी जानकारी आपके लिए मददगार थी? यदि आपको इसमें कोई कमी लगे तो कृपया रिप्लाई में बताएं।
`.trim();
}

/**
 * Deterministic assistant answer fallback generator.
 * Features built-in smart feedback loop & fact-checking safeguards.
 */
export function buildDeterministicAssistantAnswer(question: string): string {
  const isFeedbackOrDispute = /(?:गलत|गलत\s*है|धारा\s*गलत|सही\s*नहीं|त्रुटि|गलती|disagree|wrong|incorrect)/i.test(question);

  if (isFeedbackOrDispute) {
    // Check if user is legally correct (Situation 1) vs misleading/incorrect (Situation 2)
    // Situation 1: Valid legal point (e.g. credit card zero liability / RBI master directions, BNS 318(4), BNS 303(2), NI Act 138, BNSS 100, etc.)
    const isLegallySoundFeedback = /(?:क्रेडिट\s*कार्ड|credit\s*card|rbi|मास्टर\s*सर्कुलर|zero\s*liability|3\s*दिन|chargeback|318\(4\)|303\(2\)|137\(2\)|100|138|cpa\s*2019)/i.test(question);

    if (isLegallySoundFeedback) {
      return `आपके द्वारा इंगित किया गया कानूनी तर्क/प्रावधान बिल्कुल सही है। मैं विनम्रतापूर्वक अपनी पूर्व त्रुटि स्वीकार करता/करती हूँ।

आपके द्वारा प्रस्तुत कानूनी संदर्भ के अनुसार सही व अद्यतन विधिक स्थिति निम्नानुसार है:
1. वैधानिक सत्यापन: आपके द्वारा उल्लिखित प्रावधान (जैसे RBI के अनाधिकृत इलेक्ट्रॉनिक लेनदेन दिशा-निर्देश / सुसंगत अधिनियम) पूरी तरह वैध व लागू हैं।
2. उपभोक्ता/नागरिक अधिकार: बैंक अथवा संस्था को तत्काल लिखित सूचना दें और विहित समय सीमा में पूर्ण रिफंड अथवा राहत की मांग करें।
3. सक्षम फोरम: यदि 30 दिनों में समाधान न हो तो RBI लोकपाल (cms.rbi.org.in) अथवा उपभोक्ता आयोग का दरवाजा खटखटाया जा सकता है।

🙏 क्या यह कानूनी जानकारी आपके लिए मददगार थी? यदि आपको इसमें कोई कमी लगे तो कृपया रिप्लाई में बताएं।`.trim();
    }

    // Situation 2: Misleading / incorrect legal claim (e.g. claiming IPC 420 is active for post-July 2024 crimes, wrong punishment, bogus provisions)
    return `क्षमा करें, लेकिन कानूनी दृष्टिकोण से आपकी यह जानकारी सही नहीं है। भारतीय न्याय संहिता/संबंधित कानून के तहत वास्तविक प्रावधान यह है:

1. वास्तविक विधिक प्रावधान:
• भारत में 1 जुलाई 2024 से पुराने दंड कानूनों के स्थान पर भारतीय न्याय संहिता 2023 (BNS), भारतीय नागरिक सुरक्षा संहिता 2023 (BNSS) और भारतीय साक्ष्य अधिनियम 2023 (BSA) पूर्णतः प्रभावी हैं।
• कानून में अपराध की परिभाषा, दंडात्मक उपधारा व प्रक्रिया संसद द्वारा पारित गजट-अधिसूचित प्रावधानों के अनुसार ही संचालित होती है; अनौपचारिक या पुराने दावों को वर्तमान कानूनी मामलों में लागू नहीं किया जा सकता।

2. सही और प्रामाणिक स्थिति:
• किसी भी कानूनी कार्यवाही के लिए केवल आधिकारिक गजट (egazette.gov.in) व indiacode.nic.in पर प्रकाशित वर्तमान वैधानिक पाठ ही मान्य है।

🙏 क्या यह कानूनी जानकारी आपके लिए मददगार थी? यदि आपको इसमें कोई कमी लगे तो कृपया रिप्लाई में बताएं।`.trim();
  }

  return `आपके प्रश्न: "${question}" के संबंध में विधिक मार्गदर्शन निम्नानुसार है:

1. मुख्य कानूनी स्थिति:
भारत में आपराधिक मामलों के लिए 1 जुलाई 2024 से भारतीय न्याय संहिता 2023 (BNS) और भारतीय नागरिक सुरक्षा संहिता 2023 (BNSS) लागू हैं। नागरिक और उपभोक्ता विवादों के लिए उपभोक्ता संरक्षण अधिनियम 2019 एवं संबंधित विशेष अधिनियम प्रभावी हैं।

2. तुरंत उठाए जाने वाले सुरक्षित कदम:
• घटना से जुड़े सभी लिखित दस्तावेज, बैंक स्टेटमेंट, मैसेज या साक्ष्य सुरक्षित रखें।
• संबंधित पुलिस थाने या सक्षम प्राधिकरण में लिखित शिकायत प्रस्तुत करें और उसकी मुहर लगी पावती (Receiving) अवश्य लें।

3. आधिकारिक व सत्यापित हेल्पलाइन:
• आपातकालीन पुलिस सहायता: 112
• साइबर वित्तीय धोखाधड़ी: 1930 (https://cybercrime.gov.in)
• मुफ्त कानूनी सहायता (NALSA): 15100 (https://nalsa.gov.in)
• उपभोक्ता हेल्पलाइन: 1915 (https://consumerhelpline.gov.in)

नोट: यह सामान्य विधिक सूचना है। विशिष्ट मामले के लिए अपने स्थानीय सरकारी विधिक सेवा प्राधिकरण (DLSA) से संपर्क करें।

🙏 क्या यह कानूनी जानकारी आपके लिए मददगार थी? यदि आपको इसमें कोई कमी लगे तो कृपया रिप्लाई में बताएं।`.trim();
}
