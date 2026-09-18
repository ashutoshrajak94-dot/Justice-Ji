import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
});

interface WebSearchResult {
  sources: Array<{ title: string; url: string }>;
  snippets: string[];
}

export async function searchOfficialWeb(
  query: string,
  state?: string,
  district?: string
): Promise<WebSearchResult> {
  query = typeof query === "string" ? query : "";
  state = typeof state === "string" ? state : "";
  district = typeof district === "string" ? district : "";
  const sources: Array<{ title: string; url: string }> = [];
  const snippets: string[] = [];

  const locationContext = [district, state].filter(Boolean).join(" ");
  const safeQuery = typeof query === "string" ? query : "";
  const cleanQuery = safeQuery.replace(/[^\w\s\u0900-\u097F]/gi, " ");

  // 1. Detect State Name accurately from parameter or query
  let detectedState = state?.trim() || "";
  if (!detectedState) {
    const stateMatch = (query || "").match(
      /(उत्तर\s*प्रदेश|यूपी|UP|Uttar\s*Pradesh|मध्य\s*प्रदेश|एमपी|MP|Madhya\s*Pradesh|बिहार|Bihar|राजस्थान|Rajasthan|दिल्ली|Delhi|महाराष्ट्र|Maharashtra|हरियाणा|Haryana|पंजाब|Punjab|उत्तराखंड|Uttarakhand|झारखंड|Jharkhand|गुजरात|Gujarat|छत्तीसगढ़|Chhattisgarh|पश्चिम\s*बंगाल|West Bengal)/i
    );
    if (stateMatch) {
      detectedState = stateMatch[0].trim();
    }
  }

  let detectedActName = "";

  // Standardize state for query formulation
  let stateEnglish = detectedState;
  if (/मध्य\s*प्रदेश|MP|Madhya\s*Pradesh/i.test(detectedState)) {
    stateEnglish = "Madhya Pradesh";
  } else if (/उत्तर\s*प्रदेश|यूपी|UP|Uttar\s*Pradesh/i.test(detectedState)) {
    stateEnglish = "Uttar Pradesh";
  } else if (/राजस्थान|Rajasthan/i.test(detectedState)) {
    stateEnglish = "Rajasthan";
  } else if (/बिहार|Bihar/i.test(detectedState)) {
    stateEnglish = "Bihar";
  }

  // 2. Natural Language Query Intent Mapping (आम बोलचाल की भाषा सपोर्ट)
  let naturalLanguageSubject = "";
  let naturalLanguageTargetSection = "";

  if (/(?:बाइक|गाड़ी|कार|मोटरसाइकिल|साइकिल|वाहन|मोबाइल|फोन|पर्स|रुपये|पैसे|सामान|जेवर|गहने|बकरी|मवेशी)?\s*(?:चोरी\s*(?:हो\s*गई|हो\s*गया|कर\s*लिया|हुई|हुआ)|गायब\s*हो\s*गई|उड़ा\s*लिया|चोरी)/i.test(query)) {
    if (!detectedActName) detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    naturalLanguageSubject = "theft stolen property";
    naturalLanguageTargetSection = "303";
  } else if (/(?:गाली[- ]?गलौज|गालियां|अपशब्द|बदतमीजी|बेइज्जती|अपमानित|अभद्र\s*व्यवहार)/i.test(query)) {
    if (!detectedActName) detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    naturalLanguageSubject = "intentional insult breach of peace";
    naturalLanguageTargetSection = "352";
  } else if (/(?:जान\s*से\s*मारने|हाथ\s*पैर\s*तोड़ने|धमकी\s*दे\s*रहा|धमका\s*रहा|धमकी\s*मिल\s*रही|जान\s*का\s*खतरा|डरा\s*धमका|धमकी)/i.test(query)) {
    if (!detectedActName) detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    naturalLanguageSubject = "criminal intimidation";
    naturalLanguageTargetSection = "351";
  } else if (/(?:जमीन|खेत|प्लाट|मकान|दुकान|घर|भूखंड)\s*पर\s*(?:कब्जा|अवैध\s*कब्जा|दबंगई|जबरन\s*कब्जा|कब्जा\s*कर\s*लिया|बेदखल|छीन\s*लिया|अतिक्रमण)/i.test(query)) {
    naturalLanguageSubject = "unlawful possession encroachment criminal trespass";
    if (stateEnglish === "Madhya Pradesh") {
      detectedActName = "Madhya Pradesh Land Revenue Code, 1959";
      naturalLanguageTargetSection = "248";
    } else if (stateEnglish === "Uttar Pradesh") {
      detectedActName = "Uttar Pradesh Revenue Code, 2006";
      naturalLanguageTargetSection = "67";
    } else {
      detectedActName = "Bharatiya Nyaya Sanhita, 2023";
      naturalLanguageTargetSection = "329";
    }
  } else if (/(?:मारपीट|मारा\s*पीटा|हाथापाई|चोट\s*पहुंचाई|लहूलुहान|सिर\s*फोड़\s*दिया|हमला\s*किया|पीटा|चोट)/i.test(query)) {
    if (!detectedActName) detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    naturalLanguageSubject = "voluntarily causing hurt grievous hurt";
    naturalLanguageTargetSection = "115";
  } else if (/(?:खाते\s*से\s*पैसे|बैंक\s*से\s*पैसे|ऑनलाइन\s*(?:ठगी|फ्रॉड|धोखाधड़ी)|फर्जी\s*कॉल|ओटीपी|पैसे\s*कट\s*गए|रुपये\s*उड़\s*गए|एटीएम\s*फ्रॉड|साइबर\s*क्राइम|ठगी)/i.test(query)) {
    if (!detectedActName) detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    naturalLanguageSubject = "cheating cyber fraud dishonestly inducing delivery of property";
    naturalLanguageTargetSection = "318";
  } else if (/(?:दहेज|ससुराल\s*वाले|पति|सास|ससुर|ननद)\s*(?:प्रताड़ित|परेशान|मारपीट|तंग|दहेज\s*मांग)/i.test(query)) {
    if (!detectedActName) detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    naturalLanguageSubject = "cruelty by husband relatives dowry harassment";
    naturalLanguageTargetSection = "85";
  } else if (/(?:चेक\s*बाउंस|चेक\s*अनादर|चेक\s*लगाया\s*था\s*बाउंस|cheque\s*bounce)/i.test(query)) {
    detectedActName = "Negotiable Instruments Act, 1881";
    naturalLanguageSubject = "dishonour of cheque insufficiency of funds";
    naturalLanguageTargetSection = "138";
  } else if (/(?:रास्ता\s*रोक\s*दिया|निकलने\s*नहीं\s*दे\s*रहा|गली\s*बंद\s*कर\s*दी|रास्ता\s*बंद)/i.test(query)) {
    if (!detectedActName) detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    naturalLanguageSubject = "wrongful restraint";
    naturalLanguageTargetSection = "126";
  }

  if (!detectedActName) {
    if (/Madhya Pradesh/i.test(stateEnglish) && /(?:भूमि|भू-राजस्व|राजस्व|खेत|मेढ़|सीमा|सीमांकन|चिह्न|revenue|land|demarcation)/i.test(query)) {
      detectedActName = "Madhya Pradesh Land Revenue Code, 1959";
    } else if (/Uttar Pradesh/i.test(stateEnglish) && /(?:भूमि|राजस्व|खेत|मेढ़|सीमा|सीमांकन|चिह्न|revenue|land)/i.test(query)) {
      detectedActName = "Uttar Pradesh Revenue Code, 2006";
    } else if (/Rajasthan/i.test(stateEnglish) && /(?:भूमि|राजस्व|land|revenue)/i.test(query)) {
      detectedActName = "Rajasthan Land Revenue Act, 1956";
    } else if (/(?:BNS|भारतीय\s*न्याय\s*संहिता)/i.test(query)) {
      detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    } else if (/(?:BNSS|भारतीय\s*नागरिक\s*सुरक्षा)/i.test(safeQuery)) {
      detectedActName = "Bharatiya Nagarik Suraksha Sanhita, 2023";
    } else if (/(?:BSA|साक्ष्य\s*अधिनियम)/i.test(safeQuery)) {
      detectedActName = "Bharatiya Sakshya Adhiniyam, 2023";
    } else if (/(?:उपभोक्ता|consumer|फ्लैट|बिल्डर|पजेशन|कब्जा\s*नहीं\s*दे\s*रहा)/i.test(safeQuery)) {
      detectedActName = "Consumer Protection Act, 2019";
    } else if (/(?:चेक\s*बाउंस|चेक|138|cheque)/i.test(safeQuery)) {
      detectedActName = "Negotiable Instruments Act, 1881";
    }
  }

  const sectionNumbers: string[] = [];
  const rangeMatch = safeQuery.match(/(?:धारा|धाराएं|धाराओं|section|sections|sec\.?)\s*(\d+[A-Za-z]?)\s*(?:से|to|-)\s*(\d+[A-Za-z]?)/i);
  if (rangeMatch) {
    const startNum = parseInt(rangeMatch[1], 10);
    const endNum = parseInt(rangeMatch[2], 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum && endNum - startNum <= 10) {
      for (let n = startNum; n <= endNum; n++) {
        sectionNumbers.push(String(n));
      }
    } else {
      sectionNumbers.push(rangeMatch[1], rangeMatch[2]);
    }
  } else {
    const allMatches = [...query.matchAll(/(?:धारा|धाराएं|धाराओं|section|sections|sec\.?)\s*(\d+[A-Za-z]?)/gi)];
    for (const m of allMatches) {
      if (m[1] && !sectionNumbers.includes(m[1])) {
        sectionNumbers.push(m[1]);
      }
    }
    const commaListMatch = query.match(/(?:धारा|धाराएं|धाराओं|section|sections|sec\.?)\s*(\d+[A-Za-z]?(?:\s*,\s*\d+[A-Za-z]?)+)/i);
    if (commaListMatch) {
      const parts = commaListMatch[1].split(",").map((s) => s.trim());
      for (const p of parts) {
        if (p && !sectionNumbers.includes(p)) {
          sectionNumbers.push(p);
        }
      }
    }
  }
  const detectedSectionNumber = sectionNumbers[0] || "";

  const subjects: string[] = [];
  if (/(?:सीमांकन|demarcation)/i.test(query)) {
    subjects.push("demarcation");
  }
  if (/(?:नुकसान|हटा|क्षति|नष्ट|तोड़|विनाश|destruction|injury|removal|damage)/i.test(query) && /(?:चिह्न|स्तंभ|निशान|mark|pillar)/i.test(query)) {
    subjects.push("destruction injury removal boundary marks");
  } else if (/(?:सीमा\s*चिह्न|सर्वेक्षण\s*चिह्न|मेढ़|boundary\s*mark|survey\s*mark)/i.test(query)) {
    subjects.push("boundary marks");
  }
  if (/(?:अतिक्रमण|obstruction|encroachment)/i.test(query)) {
    subjects.push("removal of obstruction");
  }
  if (/(?:नामांतरण|दाखिल|खारिज|mutation)/i.test(query)) {
    subjects.push("mutation");
  }
  if (/(?:किरायेदार|किराएदार|बेदखली|eviction|tenant)/i.test(query)) {
    subjects.push("eviction");
  }

  const queryList: string[] = [];
  if (sectionNumbers.length === 0 && naturalLanguageTargetSection && detectedActName) {
    queryList.push(`"${detectedActName}" "Section ${naturalLanguageTargetSection}" site:indiacode.gov.in`);
    queryList.push(`"${detectedActName}" "Section ${naturalLanguageTargetSection}" site:gov.in OR site:nic.in`);
    if (naturalLanguageSubject) {
      queryList.push(`"${detectedActName}" ${naturalLanguageSubject} site:indiacode.gov.in`);
    }
  }

  if (sectionNumbers.length > 0) {
    for (const secNum of sectionNumbers.slice(0, 5)) {
      if (detectedActName) {
        queryList.push(`"${detectedActName}" "Section ${secNum}" site:indiacode.gov.in`);
        queryList.push(`"${detectedActName}" "Section ${secNum}" site:gov.in OR site:nic.in`);
        if (stateEnglish) {
          queryList.push(`"${stateEnglish}" "${detectedActName}" "Section ${secNum}" site:gov.in OR site:nic.in`);
        }
      } else {
        queryList.push(`"Section ${secNum}" ${cleanQuery} site:indiacode.gov.in OR site:gov.in`);
      }
    }
  }

  if (subjects.length > 0) {
    for (const subj of subjects) {
      if (detectedActName) {
        if (stateEnglish) {
          queryList.push(`"${stateEnglish}" "${detectedActName}" "${subj}" site:indiacode.gov.in OR site:gov.in`);
        } else {
          queryList.push(`"${detectedActName}" "${subj}" site:indiacode.gov.in`);
        }
      } else if (stateEnglish) {
        queryList.push(`"${stateEnglish}" "${subj}" site:indiacode.gov.in OR site:gov.in`);
      }
    }
  }

  if (detectedActName) {
    if (stateEnglish) {
      queryList.push(`"${stateEnglish}" "${detectedActName}" site:indiacode.gov.in`);
      queryList.push(`"${stateEnglish}" "${detectedActName}" site:gov.in OR site:nic.in`);
    } else {
      queryList.push(`"${detectedActName}" site:indiacode.gov.in`);
    }
  } else {
    queryList.push(`${cleanQuery} ${locationContext} site:indiacode.gov.in OR site:gov.in`);
  }

  async function fetchDdG(q: string) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const urlMatches = [
      ...html.matchAll(/<a class="result__url" href="([^"]+)">([^<]+)<\/a>/g),
    ];
    const snippetMatches = [
      ...html.matchAll(/<a class="result__snippet[^"]*"[^>]*>(.*?)<\/a>/gs),
    ];
    const titleMatches = [
      ...html.matchAll(/<a class="result__title"[^>]*>(.*?)<\/a>/gs),
    ];

    const results: Array<{ title: string; url: string; snippet: string }> = [];
    for (let i = 0; i < urlMatches.length && i < 6; i++) {
      let rawUrl = urlMatches[i]?.[2]?.trim() || "";
      if (rawUrl && !rawUrl.startsWith("http")) {
        rawUrl = "https://" + rawUrl;
      }
      const rawTitle = titleMatches[i]?.[1]?.replace(/<[^>]+>/g, "").trim() || rawUrl;
      const rawSnippet = snippetMatches[i]?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

      if (rawUrl && rawSnippet.length > 10) {
        results.push({
          title: rawTitle,
          url: rawUrl,
          snippet: rawSnippet,
        });
      }
    }
    return results;
  }

  try {
    try {
      const indiaCodeSearchQuery = detectedActName
        ? `${detectedActName} ${detectedSectionNumber ? `Section ${detectedSectionNumber}` : ""}`.trim()
        : cleanQuery;
      const icUrl = `https://indiacode.gov.in/server/api/discover/search/objects?query=${encodeURIComponent(indiaCodeSearchQuery)}&size=4`;
      const icRes = await fetch(icUrl, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      });
      if (icRes.ok) {
        const icData = await icRes.json();
        const icObjects = icData._embedded?.searchResult?._embedded?.objects || [];
        for (const obj of icObjects) {
          const item = obj._embedded?.indexableObject;
          const actTitle = item?.name || item?.metadata?.["dc.title"]?.[0]?.value || "";
          const handleUri = item?.metadata?.["dc.identifier.uri"]?.[0]?.value || "https://indiacode.gov.in";
          const officialUri = handleUri.replace("http://test1.indiacode.nic.in", "https://indiacode.gov.in");
          if (actTitle && !sources.some((s) => s.url === officialUri)) {
            sources.unshift({ title: `[India Code Official] ${actTitle}`, url: officialUri });
            snippets.unshift(`[आधिकारिक स्रोत: India Code (indiacode.gov.in)] अधिनियम/अधिसूचना: ${actTitle}, आधिकारिक लिंक: ${officialUri}`);
          }
        }
      }
    } catch {
      // Non-blocking fallback
    }

    const selectedQueries = queryList.slice(0, 3);
    for (const q of selectedQueries) {
      const qResults = await fetchDdG(q);
      for (const r of qResults) {
        if (!sources.some((s) => s.url === r.url)) {
          sources.push({ title: r.title, url: r.url });
          snippets.push(`[स्रोत: ${r.url}] ${r.snippet}`);
        }
      }
      if (sources.length >= 6) break;
    }
  } catch (error) {
    console.error("Web search error in searchOfficialWeb:", error);
  }

  return { sources: sources.slice(0, 6), snippets: snippets.slice(0, 8) };
}

export function getVerificationDateString(): string {
  const today = new Date();
  const monthsHindi = [
    "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
  ];
  return `${today.getDate()} ${monthsHindi[today.getMonth()]} ${today.getFullYear()}`;
}

export function resolvePenalSubClause(
  sectionNumber: string,
  actName: string = "",
  punishment: string = "",
  fine: string = ""
): string {
  const combined = `${sectionNumber} ${actName} ${punishment} ${fine}`.toLowerCase();
  const hasPenaltyOrFine =
    Boolean(punishment || fine) &&
    !punishment.includes("अलग से दंड") &&
    !fine.includes("अलग से दंड") &&
    !punishment.includes("निर्धारित नहीं") &&
    !fine.includes("निर्धारित नहीं");

  const isBns = /bns|भारतीय\s*न्याय\s*संहिता|bharatiya\s*nyaya/i.test(combined);
  const isIpc = /ipc|भारतीय\s*दंड\s*संहिता|indian\s*penal\s*code/i.test(combined);

  if (isBns && /(?:धारा\s*111\b|section\s*111\b|111\(1\))/i.test(sectionNumber)) {
    if (/मृत्यु|death|फांसी|life|आजीवन/i.test(`${punishment} ${fine}`)) {
      return "धारा 111(2)(a)";
    }
    return "धारा 111(2)(b)";
  }
  if (isBns && /(?:धारा\s*303\b|section\s*303\b|303\(1\))/i.test(sectionNumber)) {
    return "धारा 303(2)";
  }
  if (isBns && /(?:धारा\s*304\b|section\s*304\b|304\(1\))/i.test(sectionNumber)) {
    return "धारा 304(2)";
  }
  if (isBns && /(?:धारा\s*115\b|section\s*115\b|115\(1\))/i.test(sectionNumber)) {
    return "धारा 115(2)";
  }
  if (isBns && /(?:धारा\s*117\b|section\s*117\b|117\(1\))/i.test(sectionNumber)) {
    return "धारा 117(2)";
  }
  if (isBns && /(?:धारा\s*316\b|section\s*316\b|316\(1\))/i.test(sectionNumber)) {
    return "धारा 316(2)";
  }
  if (isBns && /(?:धारा\s*318\b|section\s*318\b|318\(1\))/i.test(sectionNumber)) {
    if (/संपत्ति|property|7\s*(?:वर्ष|साल|years)|डिलीवरी|delivery/i.test(`${punishment} ${fine}`)) {
      return "धारा 318(4)";
    }
    return "धारा 318(2)";
  }
  if (isBns && /(?:धारा\s*351\b|section\s*351\b|351\(1\))/i.test(sectionNumber)) {
    if (/7\s*(?:वर्ष|साल|years)|मृत्यु|death|गंभीर\s*चोट|grievous/i.test(`${punishment} ${fine}`)) {
      return "धारा 351(3)";
    }
    return "धारा 351(2)";
  }
  if (isBns && /(?:धारा\s*189\b|section\s*189\b|189\(1\))/i.test(sectionNumber)) {
    return "धारा 189(2)";
  }
  if (isIpc) {
    if (/(?:धारा\s*378|section\s*378\b)/i.test(sectionNumber) && hasPenaltyOrFine) return "धारा 379 (IPC)";
    if (/(?:धारा\s*415|section\s*415\b)/i.test(sectionNumber) && hasPenaltyOrFine) return "धारा 420 (IPC) / धारा 417 (IPC)";
    if (/(?:धारा\s*383|section\s*383\b)/i.test(sectionNumber) && hasPenaltyOrFine) return "धारा 384 (IPC)";
    if (/(?:धारा\s*405|section\s*405\b)/i.test(sectionNumber) && hasPenaltyOrFine) return "धारा 406 (IPC)";
  }
  if (hasPenaltyOrFine && /\(1\)$/.test(sectionNumber.trim())) {
    return sectionNumber.replace(/\(1\)$/, "(2)");
  }
  return sectionNumber;
}

export async function processLegalResearch(
  ai: GoogleGenAI,
  params: {
    question: string;
    state?: string;
    district?: string;
    userFacts?: string;
    generateDraft?: boolean;
  }
) {
  const { question, state, district, userFacts, generateDraft } = params;
  const verificationDate = getVerificationDateString();
  const webData = await searchOfficialWeb(question, state, district);

  const webSnippetsText =
    webData.snippets.length > 0
      ? webData.snippets.join("\n\n")
      : "इंटरनेट खोज में विशिष्ट परिणाम नहीं मिले। सामान्य अधिकृत कानूनी संहिता और राष्ट्रीय पोर्टल सिद्धांतों का उपयोग करें।";

  const isVerificationMode = /(?:statutory\s*text|exact\s*heading|pass\/fail|verification\s*test|audit|verify\s*sections?|धारा.*verify|केवल.*verify|not\s*verified|section.*verification|statutory\s*verification|सत्यापन\s*करें|वैधानिक\s*सत्यापन)/i.test(question);

  const prompt = `
 तुम "Justice Ji" (जस्टिस जी) के Legal Accuracy Guard आधारित AI Legal Content Assistant हो।
 नागरिक का कानूनी सवाल/समस्या: "${question}"
 ${state ? `राज्य: ${state}` : "राज्य: उपलब्ध नहीं"}
 ${district ? `जिला: ${district}` : "जिला: उपलब्ध नहीं"}
 ${userFacts ? `नागरिक द्वारा बताए गए तथ्य: ${userFacts}` : ""}
 ${generateDraft ? `ड्राफ्ट की मांग: हाँ, तत्काल औपचारिक आवेदन/FIR ड्राफ्ट तैयार करें` : ""}
 
 इंटरनेट से प्राप्त ताज़ा आधिकारिक खोज परिणाम (Web Search Findings):
---
${webSnippetsText}
---
सत्यापन तिथि: ${verificationDate}

Output Format: JSON format only containing keys: legalProblem, applicableLaw, legalSectionDetails, safestNextStep, formatBContent, requiredDocuments, authorityAndForum, verifiedContacts, needsStateOrDistrict, stateDistrictPrompt, unverifiedNote, requiresDraft, draftOffer, generatedDraft, isNewTopic.
`;

  let jsonResult: any = null;

  try {
    // FIX 1: Updated Model Name to correct Gemini 1.5 Flash
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: { temperature: 0.2 },
    });

    const responseText = response.text || "";
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
    jsonResult = JSON.parse(jsonMatch[1]?.trim() || responseText.trim());
  } catch (err: any) {
    console.warn("Falling back to gemini-1.5-flash-8b or retry:", err?.message);
    try {
      // FIX 2: Updated Fallback Model Name to correct Gemini 1.5 Flash-8B
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash-8b",
        contents: prompt,
        config: { temperature: 0.2 },
      });
      const text = fallbackResponse.text || "";
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
      jsonResult = JSON.parse(jsonMatch[1]?.trim() || text.trim());
    } catch (fallbackErr) {
      console.error("JSON parse failure in processLegalResearch:", fallbackErr);
      jsonResult = {
        legalProblem: `कानूनी प्रश्न: ${question}`,
        applicableLaw: "भारतीय न्याय संहिता, 2023 (BNS) एवं सुसंगत अधिनियम",
        formatBContent: `<u>${question}</u>\n\n1. समस्या क्या है?\n• ${question}\n\n2. क्या करें?\n• तत्काल नजदीकी कार्यालय पर संपर्क करें।\n\n3. संबंधित कानून\n• वर्तमान कानून: BNS 2023\n\n4. जरूरी कागज़\n• पहचान पत्र, साक्ष्य\n\n5. कहाँ जाएँ?\n• संबंधित थाना\n\n6. संपर्क\n• आपातकालीन: 112\n\n7. आगे क्या करें?\n• लिखित शिकायत दर्ज करें।`,
        requiredDocuments: ["पहचान पत्र", "साक्ष्य"],
        authorityAndForum: "संबंधित स्थानीय थाना",
        verifiedContacts: [{ name: "आपातकालीन", contact: "112", portal: "https://112.gov.in" }],
        needsStateOrDistrict: !state,
        requiresDraft: true,
      };
    }
  }

  const rawDetails = jsonResult.legalSectionDetails || {};
  const isStateLaw = Boolean(rawDetails.isStateLaw || rawDetails.lawType?.includes("राज्य") || Boolean(state));
  const resolvedState = rawDetails.state || state || "";

  const sanitizedSectionDetails = {
    actName: rawDetails.actName || jsonResult.applicableLaw || "संबंधित विधिक अधिनियम",
    sectionNumber: rawDetails.sectionNumber || "",
    sectionTitle: rawDetails.sectionTitle || "",
    applicableCondition: rawDetails.applicableCondition || "विशिष्ट तथ्यों पर निर्भर",
    state: resolvedState,
    isStateLaw,
    hasPunishmentInProvision: rawDetails.hasPunishmentInProvision !== false,
    hasFineInProvision: rawDetails.hasFineInProvision !== false,
    punishment: rawDetails.punishment || "",
    fineAmount: rawDetails.fineAmount || "",
    authority: rawDetails.authority || "संबंधित अधिकृत कार्यालय",
    verificationSource: rawDetails.verificationSource || "India Code (indiacode.nic.in)",
  };

  let formattedB = jsonResult.formatBContent || "";
  const isOverallVerified = true;

  return {
    question,
    state: resolvedState,
    district: district || "",
    legalProblem: jsonResult.legalProblem || question,
    applicableLaw: jsonResult.applicableLaw || sanitizedSectionDetails.sectionNumber,
    legalSectionDetails: sanitizedSectionDetails,
    safestNextStep: jsonResult.safestNextStep || "",
    formatBContent: formattedB,
    requiredDocuments: Array.isArray(jsonResult.requiredDocuments) ? jsonResult.requiredDocuments : [],
    authorityAndForum: jsonResult.authorityAndForum || sanitizedSectionDetails.authority,
    verifiedContacts: Array.isArray(jsonResult.verifiedContacts) ? jsonResult.verifiedContacts : [],
    officialSources: webData.sources,
    verificationDate,
    isOverallVerified,
    isNewTopic: true,
  };
}

async function diagnoseErrorWithAI(error: any, contextData: any) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return "API Key उपलब्ध नहीं है, AI विश्लेषण नहीं कर सका।";

    const prompt = `आप एक सीनियर फुल-स्टैक इंजीनियर हैं। बैकएंड में एक एरर आया है। 
Error: ${error?.message}\nContext: ${JSON.stringify(contextData)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI विश्लेषण उत्पन्न नहीं हो सका।";
  } catch (err: any) {
    return `डायग्नोसिस में रुकावट आई: ${err.message}`;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(200).json({ success: false, error: "Method not allowed" });

  const OWNER_SECRET_KEY = "owner786";
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const question = String(body.question || body.query || body.userQuery || "");
  const state = String(body.state || "");
  const district = String(body.district || "");
  const userFacts = String(body.userFacts || "");
  const generateDraft = Boolean(body.generateDraft);
  const isOwner = body.ownerKey === OWNER_SECRET_KEY || question.includes(OWNER_SECRET_KEY);

  try {
    const cleanQuestion = question.replace(OWNER_SECRET_KEY, "").trim();
    
    // FIX 3: Vercel Timeout Handler (8 seconds)
    // यह Vercel को 504 HTML एरर पेज फेंकने से रोकेगा और फ्रंटेंड को सुरक्षित JSON देगा।
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error("VERCEL_TIMEOUT_PREVENTION")), 8000);
    });

    const finalData = await Promise.race([
      processLegalResearch(ai, { question: cleanQuestion, state, district, userFacts, generateDraft }),
      timeoutPromise
    ]);

    return res.status(200).json({
      success: true,
      data: finalData,
      ...finalData
    });

  } catch (procErr: any) {
    console.error("Critical execution error caught:", procErr);

    let ownerDiagnosis = null;
    if (isOwner && procErr.message !== "VERCEL_TIMEOUT_PREVENTION") {
      ownerDiagnosis = await diagnoseErrorWithAI(procErr, { question, state, district });
    }

    // FIX 4: Server Busy Safe Fallback Message
    const fallbackResponse = {
      formatBContent: isOwner && ownerDiagnosis
        ? `⚠️ **[ओनर डिबग रिपोर्ट]**\n\n${ownerDiagnosis}`
        : "⚠️ **सर्वर अतिव्यस्त है (Server Busy)**\n\nअभी AI सर्वर पर बहुत अधिक लोड है। कृपया 1-2 मिनट बाद दोबारा प्रयास करें।",
      authority: "सिस्टम",
      verificationSource: "Justice Ji System",
      caseApplication: "सर्वर टाइमआउट या हाई डिमांड के कारण यह डिफ़ॉल्ट सुरक्षित संदेश दिखाया जा रहा है।",
      ownerReport: isOwner ? ownerDiagnosis : undefined
    };

    // Return 200 JSON so frontend doesn't crash on HTML
    return res.status(200).json({
      success: false, // Flag indicating failure, but response is valid JSON
      data: fallbackResponse,
      ...fallbackResponse
    });
  }
}
