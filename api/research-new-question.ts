import { GoogleGenAI } from "@google/genai";

interface WebSearchResult {
  sources: Array<{ title: string; url: string }>;
  snippets: string[];
}

export async function searchOfficialWeb(
  query: string,
  state?: string,
  district?: string
): Promise<WebSearchResult> {
  const sources: Array<{ title: string; url: string }> = [];
  const snippets: string[] = [];

  const locationContext = [district, state].filter(Boolean).join(" ");
  const cleanQuery = query.replace(/[^\w\s\u0900-\u097F]/gi, " ").trim();

  // 1. Detect State Name accurately from parameter or query
  let detectedState = state?.trim() || "";
  if (!detectedState) {
    const stateMatch = query.match(
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
  // Maps common citizen grievances to official acts, subjects, and penal sections
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

  // 3. Identify applicable Act/Code name strictly based on jurisdiction and subject (no guessed section numbers)
  if (!detectedActName) {
    if (/Madhya Pradesh/i.test(stateEnglish) && /(?:भूमि|भू-राजस्व|राजस्व|खेत|मेढ़|सीमा|सीमांकन|चिह्न|revenue|land|demarcation)/i.test(query)) {
      detectedActName = "Madhya Pradesh Land Revenue Code, 1959";
    } else if (/Uttar Pradesh/i.test(stateEnglish) && /(?:भूमि|राजस्व|खेत|मेढ़|सीमा|सीमांकन|चिह्न|revenue|land)/i.test(query)) {
      detectedActName = "Uttar Pradesh Revenue Code, 2006";
    } else if (/Rajasthan/i.test(stateEnglish) && /(?:भूमि|राजस्व|land|revenue)/i.test(query)) {
      detectedActName = "Rajasthan Land Revenue Act, 1956";
    } else if (/(?:BNS|भारतीय\s*न्याय\s*संहिता)/i.test(query)) {
      detectedActName = "Bharatiya Nyaya Sanhita, 2023";
    } else if (/(?:BNSS|भारतीय\s*नागरिक\s*सुरक्षा)/i.test(query)) {
      detectedActName = "Bharatiya Nagarik Suraksha Sanhita, 2023";
    } else if (/(?:BSA|साक्ष्य\s*अधिनियम)/i.test(query)) {
      detectedActName = "Bharatiya Sakshya Adhiniyam, 2023";
    } else if (/(?:उपभोक्ता|consumer|फ्लैट|बिल्डर|पजेशन|कब्जा\s*नहीं\s*दे\s*रहा)/i.test(query)) {
      detectedActName = "Consumer Protection Act, 2019";
    } else if (/(?:चेक\s*बाउंस|चेक|138|cheque)/i.test(query)) {
      detectedActName = "Negotiable Instruments Act, 1881";
    }
  }

  // 3. Extract all section numbers if specifically supplied in the question (handles single or multiple like 127, 128 or 127-130)
  const sectionNumbers: string[] = [];
  const rangeMatch = query.match(/(?:धारा|धाराएं|धाराओं|section|sections|sec\.?)\s*(\d+[A-Za-z]?)\s*(?:से|to|-)\s*(\d+[A-Za-z]?)/i);
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
    // Also catch comma-separated numbers following a section keyword e.g. "धारा 127, 128, 129, 130"
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

  // 4. Extract distinct legal subjects to ensure individual inspection
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

  // 5. Construct tightened queries using authoritative portals: indiacode.gov.in, state revenue portals, and official gazettes
  const queryList: string[] = [];

  // If no specific section was typed by user, but natural language intent identified a target section:
  if (sectionNumbers.length === 0 && naturalLanguageTargetSection && detectedActName) {
    queryList.push(`"${detectedActName}" "Section ${naturalLanguageTargetSection}" site:indiacode.gov.in`);
    queryList.push(`"${detectedActName}" "Section ${naturalLanguageTargetSection}" site:gov.in OR site:nic.in`);
    if (naturalLanguageSubject) {
      queryList.push(`"${detectedActName}" ${naturalLanguageSubject} site:indiacode.gov.in`);
    }
  }

  // If specific sections are requested, search for EACH section individually to guarantee evidence isolation
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

  // Search each distinct subject individually for neighbouring-section isolation
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

  // Act-level official repository query
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
    // 5a. Directly query official India Code repository API for authentic statutory records
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

    // Run up to 3 targeted queries to retrieve isolated provisions
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

// Format verification date
export function getVerificationDateString(): string {
  const today = new Date();
  const monthsHindi = [
    "जनवरी",
    "फरवरी",
    "मार्च",
    "अप्रैल",
    "मई",
    "जून",
    "जुलाई",
    "अगस्त",
    "सितंबर",
    "अक्टूबर",
    "नवंबर",
    "दिसंबर",
  ];
  return `${today.getDate()} ${monthsHindi[today.getMonth()]} ${today.getFullYear()}`;
}

/**
 * GLOBAL SUB-CLAUSE RULE (सटीक उपधारा प्राथमिकता):
 * किसी भी कानून (BNS, BNSS, IPC, CrPC, या राज्य भू-राजस्व कोड) के तहत,
 * जब भी सज़ा (Punishment) या जुर्माने (Fine) का उल्लेख हो, तो मुख्य धारा
 * या परिभाषा उपधारा (जैसे 111(1)) कभी न दिखाएं। हमेशा सीधे वास्तविक
 * दंडात्मक उपधारा (Penal Sub-clause, जैसे 111(2)(a), 303(2)) को ही
 * 'संबंधित धारा' में रेंडर करें।
 */
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

  // 1. BNS Section 111 (Organized crime): 111(1) is definition, 111(2)(a) is death penalty, 111(2)(b) is other penalty
  if (isBns && /(?:धारा\s*111\b|section\s*111\b|111\(1\))/i.test(sectionNumber)) {
    if (/मृत्यु|death|फांसी|life|आजीवन/i.test(`${punishment} ${fine}`)) {
      return "धारा 111(2)(a)";
    }
    return "धारा 111(2)(b)";
  }

  // 2. BNS Section 303 (Theft): 303(1) is definition, 303(2) is penalty
  if (isBns && /(?:धारा\s*303\b|section\s*303\b|303\(1\))/i.test(sectionNumber)) {
    return "धारा 303(2)";
  }

  // 3. BNS Section 304 (Snatching): 304(1) definition, 304(2) penalty
  if (isBns && /(?:धारा\s*304\b|section\s*304\b|304\(1\))/i.test(sectionNumber)) {
    return "धारा 304(2)";
  }

  // 4. BNS Section 115 (Voluntarily causing hurt): 115(1) definition, 115(2) penalty
  if (isBns && /(?:धारा\s*115\b|section\s*115\b|115\(1\))/i.test(sectionNumber)) {
    return "धारा 115(2)";
  }

  // 5. BNS Section 117 (Grievous hurt): 117(1) definition, 117(2) penalty
  if (isBns && /(?:धारा\s*117\b|section\s*117\b|117\(1\))/i.test(sectionNumber)) {
    return "धारा 117(2)";
  }

  // 6. BNS Section 316 (Criminal breach of trust): 316(1) definition, 316(2) penalty
  if (isBns && /(?:धारा\s*316\b|section\s*316\b|316\(1\))/i.test(sectionNumber)) {
    return "धारा 316(2)";
  }

  // 7. BNS Section 318 (Cheating): 318(1) definition, 318(2) simple cheating, 318(4) aggravated cheating
  if (isBns && /(?:धारा\s*318\b|section\s*318\b|318\(1\))/i.test(sectionNumber)) {
    if (/संपत्ति|property|7\s*(?:वर्ष|साल|years)|डिलीवरी|delivery/i.test(`${punishment} ${fine}`)) {
      return "धारा 318(4)";
    }
    return "धारा 318(2)";
  }

  // 8. BNS Section 351 (Criminal intimidation): 351(1) definition, 351(2) penalty, 351(3) aggravated penalty
  if (isBns && /(?:धारा\s*351\b|section\s*351\b|351\(1\))/i.test(sectionNumber)) {
    if (/7\s*(?:वर्ष|साल|years)|मृत्यु|death|गंभीर\s*चोट|grievous/i.test(`${punishment} ${fine}`)) {
      return "धारा 351(3)";
    }
    return "धारा 351(2)";
  }

  // 9. BNS Section 189 (Unlawful assembly): 189(1) definition, 189(2) penalty
  if (isBns && /(?:धारा\s*189\b|section\s*189\b|189\(1\))/i.test(sectionNumber)) {
    return "धारा 189(2)";
  }

  // 10. IPC Legacy Mappings
  if (isIpc) {
    if (/(?:धारा\s*378|section\s*378\b)/i.test(sectionNumber) && hasPenaltyOrFine) {
      return "धारा 379 (IPC)";
    }
    if (/(?:धारा\s*415|section\s*415\b)/i.test(sectionNumber) && hasPenaltyOrFine) {
      return "धारा 420 (IPC) / धारा 417 (IPC)";
    }
    if (/(?:धारा\s*383|section\s*383\b)/i.test(sectionNumber) && hasPenaltyOrFine) {
      return "धारा 384 (IPC)";
    }
    if (/(?:धारा\s*405|section\s*405\b)/i.test(sectionNumber) && hasPenaltyOrFine) {
      return "धारा 406 (IPC)";
    }
  }

  // 11. Generic (1) to (2) replacement if definition subsection (1) was accidentally cited alongside punishment/fine
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

  // Perform real-time internet search
  const webData = await searchOfficialWeb(question, state, district);

  const webSnippetsText =
    webData.snippets.length > 0
      ? webData.snippets.join("\n\n")
      : "इंटरनेट खोज में विशिष्ट परिणाम नहीं मिले। सामान्य अधिकृत कानूनी संहिता और राष्ट्रीय पोर्टल सिद्धांतों का उपयोग करें।";

  const isVerificationMode =
    /(?:statutory\s*text|exact\s*heading|pass\/fail|verification\s*test|audit|verify\s*sections?|धारा.*verify|केवल.*verify|not\s*verified|section.*verification|statutory\s*verification|सत्यापन\s*करें|वैधानिक\s*सत्यापन)/i.test(
      question
    );

  const prompt = `
 तुम "Justice Ji" (जस्टिस जी) के Legal Accuracy Guard आधारित AI Legal Content Assistant हो।
 तुम्हारे पास एक नागरिक का कानूनी सवाल आया है जो शायद पहले से मौजूद विषयों में शामिल नहीं है।
 तुम्हें इस सवाल को अस्वीकार (reject) बिल्कुल नहीं करना है, बल्कि नए विषय के रूप में प्रामाणिक व सत्यापित रूप से विकसित करना है।
 
 =======================================================
 SYSTEM ARCHITECTURE RULE: UNIVERSAL ACCURACY ENGINE
 =======================================================
 कोर प्रॉम्प्ट और डेटा एक्सट्रैक्शन पाइपलाइन में ये 2 स्थायी नियम हमेशा के लिए अनिवार्य व बाध्यकारी हैं:

 1. GLOBAL SUB-CLAUSE RULE (सटीक उपधारा प्राथमिकता):
 किसी भी कानून (BNS, BNSS, IPC, CrPC, या राज्य भू-राजस्व कोड) के तहत, जब भी सज़ा (Punishment) या जुर्माने (Fine) का उल्लेख हो, तो मुख्य धारा या परिभाषा उपधारा (जैसे 111(1)) कभी न दिखाएं। हमेशा सीधे वास्तविक दंडात्मक उपधारा (Penal Sub-clause, जैसे 111(2)(a), 303(2)) को ही 'संबंधित धारा' में रेंडर करें।
 • BNS उदाहरण:
   - संगठित अपराध में सज़ा: धारा 111(1) (परिभाषा) कभी न दिखाएं; हमेशा धारा 111(2)(a) (मृत्यु की दशा में) या 111(2)(b) (अन्य मामलों में) रेंडर करें।
   - चोरी में सज़ा: धारा 303(1) (परिभाषा) कभी न दिखाएं; हमेशा धारा 303(2) (दंडात्मक उपधारा) रेंडर करें।
   - स्नैचिंग में सज़ा: धारा 304(2) रेंडर करें (धारा 304(1) केवल परिभाषा है)।
   - धोखाधड़ी में सज़ा: धारा 318(2) या 318(4) रेंडर करें।
   - आपराधिक न्यासभंग में सज़ा: धारा 316(2) रेंडर करें।
 • राज्य भू-राजस्व कोड व अन्य कानून: जहाँ भी उपधारा (1) दायित्व/परिभाषा हो और उपधारा (2) या (3) में पेनल्टी/जुर्माना हो, वहाँ सज़ा/जुर्माना बताते समय अनिवार्य रूप से दंडात्मक उपधारा ही दर्ज करें।

 2. GLOBAL VERIFICATION GATE (स्वतः प्रमाणीकरण):
 यदि किसी भी धारा, उपधारा, सज़ा या राज्य संशोधन में 1% भी संशय हो, तो बिना पूछे स्वतः 'isVerified = false' ट्रिगर करो और पूरा फॉर्मेट ब्लॉक करके लाल चेतावनी कार्ड (STATUS: OVERALL RESULT: FAIL) दिखाओ। केवल 100% गजट-पुष्ट डेटा पर ही लेख अनलॉक होगा।

 3. NATURAL LANGUAGE QUERY MAPPING (आम बोलचाल की भाषा सपोर्ट):
 यूज़र को कोई कानूनी धारा या जटिल शब्द लिखने की ज़रूरत नहीं है।
 जब कोई नागरिक सीधी आम बोलचाल में अपनी समस्या लिखे (उदा: "मेरी बाइक चोरी हो गई", "पड़ोसी गाली-गलौज कर रहा है", "जमीन पर कब्जा कर लिया", "धमकी मिल रही है", "पैसे कट गए"):
 • सिस्टम स्वतः उसके पीछे का सही अपराध व कानूनी वर्गीकरण पहचाने।
 • सही कानून (BNS / BNSS / राज्य राजस्व संहिता / विशेष अधिनियम) की सटीक दंडात्मक उपधारा से मैप करे (जैसे चोरी → BNS 303(2), गाली-गलौज → BNS 352, धमकी → BNS 351(2), कब्जा → राज्य राजस्व संहिता व BNS 329(3), ठगी/साइबर फ्रॉड → BNS 318(4) व IT Act 66D, मारपीट → BNS 115(2)/117(2))।
 • OUTPUT SIMPLICITY: परिणाम में सबसे पहले आम नागरिक की भाषा में स्पष्ट, सीधी समझाइश (क्या हुआ? और अब क्या कदम उठाएं?) प्रदान करे। कानूनी धाराएं, दंडात्मक उपधारा व वैधानिक साक्ष्य संदर्भ के रूप में नीचे सुव्यवस्थित रहें।

 नागरिक का कानूनी सवाल/समस्या: "${question}"
 ${state ? `राज्य: ${state}` : "राज्य: उपलब्ध नहीं (यदि आवश्यक हो तो पूछें)"}
 ${district ? `जिला: ${district}` : "जिला: उपलब्ध नहीं"}
 ${userFacts ? `नागरिक द्वारा बताए गए तथ्य: ${userFacts}` : ""}
 ${generateDraft ? `ड्राफ्ट की मांग: हाँ, तत्काल औपचारिक आवेदन/FIR ड्राफ्ट तैयार करें` : ""}
 
 ${isVerificationMode ? `-------------------------------------------------------
 🚨 [VERIFICATION-MODE OUTPUT CONTROL ACTIVE]
 -------------------------------------------------------
 User has explicitly requested a statutory verification test / audit.
 1. Output ONLY the requested statutory verification result according to the HARD-FAIL VERIFICATION GATE.
 2. Do NOT automatically append:
    - legal advice
    - application procedure
    - required documents
    - practical steps
    - recommendations
    - unrelated explanations
    unless explicitly requested by the user.
 3. MULTI-SECTION PASS/FAIL GATE:
    If a multi-section verification is requested (e.g. Sections 127–130), ALL sections must independently pass.
    If even ONE section fails (e.g. 127 = PASS, 128 = PASS, 129 = PASS, 130 = FAIL), then OVERALL RESULT MUST BE FAIL.
    Never output OVERALL PASS.
 4. HARD VERIFIED GATE:
    Do NOT output VERIFIED, PASS, EXACT, CURRENT, or OFFICIAL for any section unless all 10 mandatory verification conditions are established from Level 1 official primary statutory text. If evidence is incomplete or unverified, status MUST be FAIL or NOT VERIFIED.
 5. PENALTY FIREWALL:
    If penalty amount cannot be verified exactly from the same section's official text, DO NOT output the amount; status = NOT VERIFIED.
 -------------------------------------------------------` : ""}
 
 इंटरनेट से प्राप्त ताज़ा आधिकारिक खोज परिणाम (Web Search Findings):
---
${webSnippetsText}
---

सत्यापन तिथि: ${verificationDate}

=======================================================
JUSTICE JI — FINAL LEGAL TRUTH & VERIFICATION ENGINE
=======================================================
CORE PURPOSE:
LEGAL ACCURACY > SOURCE AUTHORITY > CURRENTNESS > COMPLETENESS > SPEED
AI को कभी भी केवल अच्छा/विश्वसनीय दिखने वाला उत्तर नहीं बनाना है।
यदि कानून verify नहीं हुआ है तो सही उत्तर: "NOT VERIFIED" होगा।
यह instruction सभी future legal questions पर लागू होगा।

-------------------------------------------------------
PART 1 — ABSOLUTE NO-GUESS RULE
-------------------------------------------------------
कभी भी:
• कानून का section अनुमान से मत बताओ।
• section heading अनुमान से मत बनाओ।
• penalty/fine अनुमान से मत बताओ।
• procedure अनुमान से मत बताओ।
• authority/officer अनुमान से मत बताओ।
• fee अनुमान से मत बताओ।
• documents अनुमान से मत बताओ।
• limitation अनुमान से मत बताओ।
• appeal/revision remedy अनुमान से मत बताओ।
• current law होने का अनुमान मत लगाओ।
यदि evidence नहीं है, तो स्पष्ट रूप से लिखो: "NOT VERIFIED" (या "आधिकारिक कानून के मूल प्रावधान से इस धारा/दंड की पुष्टि नहीं हो पा रही है; verification आवश्यक है।")

-------------------------------------------------------
PART 2 — FIRST IDENTIFY JURISDICTION
-------------------------------------------------------
हर legal question पर सबसे पहले determine करो:
1. State या Central law?
2. कौन-सा State?
3. कौन-सा Act/Code?
4. Act number/year क्या है?
5. Rules/Regulations/Notifications भी relevant हैं या नहीं?
उदाहरण:
यदि प्रश्न Madhya Pradesh के कानून के बारे में है:
Madhya Pradesh law को ही primary jurisdiction मानो।
Chhattisgarh या किसी अन्य State का समान कानून MP law का evidence नहीं है।

-------------------------------------------------------
PART 3 — IDENTIFY THE EXACT LEGAL INSTRUMENT
-------------------------------------------------------
हर answer से पहले determine करो:
ACT / CODE → AMENDING ACTS → RULES → NOTIFICATIONS / ORDERS → CURRENT CONSOLIDATED POSITION
इनमें अंतर बनाए रखो:
• एक amendment Act को मूल Act का पूरा current text मत समझो।
• एक पुराने consolidated document को automatically current मत मानो।

-------------------------------------------------------
PART 4 — CURRENTNESS ENGINE
-------------------------------------------------------
हर statutory provision के लिए यह check अनिवार्य है:
A. Original provision: मूल section क्या था?
B. Amendment history: क्या बाद में substituted, amended, inserted, omitted, renumbered हुआ? क्या penalty, authority, wording बदली?
C. Latest applicable amendment: सबसे नवीन लागू amendment identify करो।
D. Effective date: यदि amendment की commencement/effective date relevant है, उसे verify करो।
E. Current text: सभी applicable amendments को जोड़कर वर्तमान statutory position निर्धारित करो।
पुराने और current text को mix करना STRICTLY PROHIBITED है।

-------------------------------------------------------
PART 5 — SOURCE HIERARCHY
-------------------------------------------------------
Statutory verification में source priority:
LEVEL 1 — PRIMARY OFFICIAL:
• State Government official legislation repository
• Official Gazette
• Official Department publication
• India Code / authoritative government legislation repository (indiacode.gov.in)
• Official rules/notifications
LEVEL 2 — AUTHORITATIVE GOVERNMENT/JUDICIAL:
• High Court / Supreme Court official judgments (केवल corroboration के लिए)
• Government orders/notifications
LEVEL 3 — SECONDARY:
• Indian Kanoon, PRS, legal databases, legal websites, educational websites
Search snippet को proof मत मानो।

-------------------------------------------------------
PART 6 — HARD-FAIL VERIFICATION GATE
-------------------------------------------------------
1. HARD VERIFIED GATE:
The system MUST NOT output:
• VERIFIED
• PASS
• EXACT
• CURRENT
• OFFICIAL
unless EVERY mandatory verification condition has been successfully satisfied.
If even ONE mandatory condition fails or cannot be established:
→ Status MUST be FAIL or NOT VERIFIED.
Never guess, infer, fill gaps, or treat incomplete evidence as verified.

2. MANDATORY EVIDENCE FOR EACH STATUTORY CLAIM (10 MANDATORY ITEMS):
For every section being verified, independently verify:
1. Exact Act/Code name
2. Exact section number
3. Exact current official heading
4. Complete subsection structure
5. Exact statutory text/claim being verified
6. Current amendment status
7. Latest relevant amendment affecting that section
8. Penalty/fine, ONLY if actually present in that section
9. Exact source/document identification
10. Exact location in that source (section/subsection/page or equivalent)
If ANY item is unavailable from Level 1 Primary Official statutory text → NOT VERIFIED / FAIL.

3. CURRENT-LAW CHECK:
Do NOT assume that a consolidated Code/PDF is current.
Before declaring VERIFIED:
• Check whether later amendment Acts modify the section.
• Apply the latest applicable amendment.
• If the consolidated text conflicts with a later amendment Act, the later applicable amendment MUST be considered.
• If current text cannot be reconciled confidently → FAIL / NOT VERIFIED.
Search snippets, summaries, third-party explanations, AI-generated text, or memory are NEVER evidence.

4. NO CROSS-SECTION CONTAMINATION:
Never transfer heading, subsection, penalty, authority, procedure, amount, or legal consequence from one section to another.
Each section must pass independently.

5. PENALTY FIREWALL:
If a penalty/fine is claimed:
• It MUST be explicitly supported by that same section/subsection or a clearly identified applicable amendment.
• Never infer a penalty from another section, Rules, case law, or general knowledge.
If the penalty amount cannot be verified exactly:
→ DO NOT output the amount.
→ Status = NOT VERIFIED.

6. ACT vs RULES vs CASE LAW:
Do not mix Act/Code text, Rules, Notifications, Circulars, Court judgments, or Government webpages as if they are the same statutory source. Identify which legal instrument supports each claim.

7. PASS/FAIL GATE (MULTI-SECTION):
For a multi-section verification such as Sections 127–130:
ALL sections must independently pass.
If even one section fails (e.g. 127 = PASS, 128 = PASS, 129 = PASS, 130 = FAIL):
then OVERALL RESULT = FAIL.
Never output OVERALL PASS.

8. NO FALSE CONFIDENCE:
The system MUST NOT say "verified" merely because a source was found.
A source being official is NOT sufficient.
The exact current statutory claim must also be matched against that source.
If evidence is incomplete, conflicting, outdated, or ambiguous:
→ NOT VERIFIED.

9. VERIFICATION-MODE OUTPUT CONTROL:
When the user asks for statutory verification, output ONLY the requested verification result.
Do NOT automatically append:
• legal advice
• application procedure
• required documents
• practical steps
• recommendations
• unrelated explanations
unless the user separately asks for them.

FINAL RULE:
EVIDENCE FIRST → VALIDATION SECOND → PASS LAST.
NEVER: PASS → then search for evidence.
A claim without complete current evidence MUST FAIL.

MANDATORY LEGAL VERIFICATION PIPELINE:
For every legal answer, especially State-specific law:
STATE 
→ ACT/CODE 
→ EXACT SECTION NUMBER 
→ EXACT OFFICIAL SECTION TITLE 
→ EXACT OFFICIAL SECTION TEXT 
→ LEGAL SUBJECT 
→ SUBSECTION/CLAUSE 
→ PUNISHMENT/FINE (only if present in THAT SAME provision)
A punishment/fine MUST NEVER be transferred from another section.

SOURCE RULES:
1. For Indian laws, prioritize the official statutory source.
2. Prioritize India Code (indiacode.nic.in) and the relevant official State Government law/revenue portal.
3. Search results/snippets are NOT sufficient proof of a section title, section subject, punishment or fine.
4. The system must retrieve/inspect the actual official provision before stating an exact section number, title, or punishment.
5. If the official statutory text cannot be verified, do NOT guess.
6. In that situation explicitly state:
   "आधिकारिक कानून के मूल प्रावधान से इस धारा/दंड की पुष्टि नहीं हो पा रही है; verification आवश्यक है।" ("Official statutory text could not be verified; exact section/punishment requires verification.")

NEIGHBOURING-SECTION ISOLATION (सख्त अलगाव नियम):
When the query contains a section number or when search results contain several nearby sections, or when the user's question involves multiple issues:
- Treat every section as a separate legal provision.
- Verify each section independently.
- Never combine the title/subject/text/punishment of Section A with Section B.
- Do not select a section merely because its keywords are similar.
- The section number, title and text must all refer to the SAME provision.
- If the search result contains multiple sections, isolate the requested/relevant section before extracting any legal conclusion.
- When a question involves multiple distinct issues (such as boundary demarcation AND destruction/removal of boundary marks):
  * Do NOT merge them into one provision.
  * State each provision separately with its own exact section number, exact title, subject, and its own punishment/fine (or explicit "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।").

EXACT SUBJECT MATCH:
- Before returning a section, verify that the actual subject of the official provision matches the user's legal question.
- For example, "demarcation of boundaries" and "destruction/injury/removal of boundary or survey marks" are separate legal subjects unless the official statutory text itself expressly combines them.
- Do not infer that a section is applicable merely because the search result contains words such as "boundary", "demarcation", "survey", "mark", "fine", "penalty", "land", or "revenue".

MP LAND REVENUE CODE SAFETY CHECK:
For the Madhya Pradesh Land Revenue Code, 1959:
- Do not invent or map section numbers from memory.
- Independently verify the official text.
- In particular, do not allow Section 129, 130, 133 or 135 to be automatically treated as interchangeable merely because the user asks about boundary/demarcation/marks.
- Known verified distinction that the system must preserve when official text is retrieved:
  * Section 129 concerns demarcation of boundaries of a survey number/sub-division/plot number. (Official Title: "Demarcation of boundaries of survey number or sub-division of survey number or block number or plot number"). It contains NO punishment, fine, or imprisonment. Demarcation is purely administrative.
  * Section 130 concerns destruction, injury or removal of boundary or survey marks. (Official Title: "Penalty for destruction, injury or removal of boundary or survey marks"). It contains its own statutory provision regarding penalty per mark as determined by the Tahsildar along with restoration expenses, with NO imprisonment.
  * CRITICAL MANDATE ON SECTION 130 PENALTY:
    - NEVER invent, infer, or state "दो हजार रुपये" (₹2,000) or any arbitrary fine amount for Section 130 from model memory! No such flat ₹2,000 fine exists in the statutory text of Section 130.
    - If the exact current amended statutory ceiling of the penalty is not retrieved and verified from current official statutory text in this session, DO NOT GUESS OR STATE A SPECIFIC MONETARY AMOUNT.
    - Instead, explicitly state:
      "धारा 130 में प्रत्येक नष्ट/क्षतिग्रस्त/हटाए गए सीमा या सर्वे चिह्न के लिए विहित सीमा तक शास्ति (penalty) एवं बहाली के खर्च की वसूली का प्रावधान है (कोई कारावास नहीं)। वर्तमान संशोधित अधिकतम जुर्माने की राशि की पुष्टि हेतु आधिकारिक कानून के मूल पाठ से verification आवश्यक है (Official statutory text could not be verified; exact punishment/fine requires verification)।"
  * Do NOT attach the Section 130 fine to Section 129.
  * Do NOT attach any other section's punishment to Section 130.
  * Likewise, do not assign a title or subject to Sections 133 or 135 unless their official current statutory text has actually been retrieved and verified.

PUNISHMENT & FINE ISOLATION:
A punishment, penalty, fine, imprisonment, amount, or monetary consequence may be displayed ONLY when it appears in the SAME VERIFIED SECTION/SUBSECTION being cited.
NEVER:
• Take a section number from one section and punishment from another section.
• Infer a punishment from a related section.
• Assume that a neighbouring section contains the penalty.
• Use an amount found elsewhere in the Act as the punishment for the current section.
• Guess an amount from model memory (specifically NEVER guess ₹2,000).
• Convert an administrative fee, application fee, or cost of pillars into a criminal fine or penalty.

OFFICIAL TEXT RULE:
यदि official source से exact provision का text या exact fine amount उपलब्ध नहीं हो रहा है, तो दूसरे websites या model memory से अनुमान लगाकर section/title/fine पूरा मत करो।
ऐसे मामले में साफ लिखो:
"Official statutory text could not be verified; exact section/punishment requires verification."
(या "आधिकारिक कानून के मूल प्रावधान से इस धारा/दंड की पुष्टि नहीं हो पा रही है; verification आवश्यक है।")

FINAL ANSWER VALIDATION CHECKLIST (FINAL GATE):
Before generating the final answer, perform this internal validation:
[ ] Correct State
[ ] Correct Act/Code
[ ] Correct section number
[ ] Exact official section title
[ ] Official section text retrieved
[ ] Subject matches the provision
[ ] Subsection/clause identified where relevant
[ ] Punishment/fine comes from the SAME section/subsection
[ ] No neighbouring section has been mixed in
[ ] No third-party snippet used as proof
[ ] No information has been guessed from memory (specifically NO guessed ₹2,000 fine)

If ANY check fails:
DO NOT provide a specific section number/title/punishment as fact.
Instead clearly say:
"आधिकारिक कानून के मूल प्रावधान से इस धारा/दंड की पुष्टि नहीं हो पा रही है; verification आवश्यक है।"

STEP 9 — SOURCE REQUIREMENT:
For State-specific legal sources: prefer official India Code, State Government Law Department, or State Gazette/Revenue Portal.

MANDATORY INTERNAL CHECK BEFORE DISPLAYING:
ACT → SECTION → SECTION TITLE → LEGAL SUBJECT → PUNISHMENT/FINE
All five must match the same legal provision.

FOR STATE-SPECIFIC ANSWERS, SHOW THIS EXACT STRUCTURE IN FORMAT B (भाग 3):
⚖️ संबंधित कानून
• राज्य: [सत्यापित राज्य का नाम]
• कानून/Code: [सत्यापित कानून/Code का पूरा नाम]
• धारा: [सत्यापित धारा व उपधारा]
• धारा का विषय: [सटीक धारा का शीर्षक/विषय]

🔴 सजा:
• केवल तभी दिखाएँ जब उसी verified provision में punishment (कारावास) हो।
यदि उस सटीक धारा में कोई सजा निर्धारित नहीं है, तो अनिवार्य रूप से यह लिखें:
"इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"

🟠 जुर्माना:
• केवल तभी दिखाएँ जब उसी verified provision में fine/penalty हो।
यदि उस सटीक धारा में कोई जुर्माना निर्धारित नहीं है, तो अनिवार्य रूप से यह लिखें:
"इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"

Do NOT invent or estimate any fine amount.

FOR CENTRAL LAWS:
सजा व जुर्माना उसी धारा से लें। यदि उस धारा में सजा या जुर्माना नहीं है, तो लिखें:
"इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"

🟢 क्या करें:
• पहला कदम: [पहला जरूरी व्यावहारिक कदम]
• अगला कदम: [अगला कदम - मुहर लगी पावती लेना]
• संबंधित अधिकारी/प्राधिकरण: [सक्षम प्राधिकारी]

स्रोत/Verification:
• आधिकारिक स्रोत: [India Code / राज्य विधिक पोर्टल / सरकारी वेबसाइट]
• सत्यापन स्थिति: आधिकारिक कानून से सत्यापित
• सत्यापन तिथि: ${verificationDate}

=======================================================
OUTPUT FORMAT (केवल और केवल निम्नलिखित मान्य JSON में दें):
=======================================================
{
  "legalProblem": "समस्या का 1-2 पंक्तियों में सरल हिंदी विवरण",
  "applicableLaw": "वर्तमान लागू धारा व कानून (उदा: धारा 24 उत्तर प्रदेश राजस्व संहिता, 2006)",
  "legalSectionDetails": {
    "actName": "कानून/Code का पूरा नाम",
    "sectionNumber": "धारा संख्या व उपधारा",
    "sectionTitle": "धारा का सटीक विषय / शीर्षक (Section Title)",
    "sectionAbout": "धारा किस बारे में है",
    "applicableCondition": "किस स्थिति में लागू हो सकती है (तथ्य व परिस्थितियां)",
    "state": "राज्य का नाम (यदि राज्य कानून हो या राज्य संदर्भ हो, अन्यथा 'केंद्र/अखिल भारतीय')",
    "isStateLaw": true_या_false,
    "hasPunishmentInProvision": true_या_false,
    "hasFineInProvision": true_या_false,
    "punishment": "सजा विवरण (यदि उसी धारा में हो, अन्यथा 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।')",
    "minPunishment": "न्यूनतम सजा (यदि उसी धारा में हो, अन्यथा 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।')",
    "maxPunishment": "अधिकतम सजा व प्रकृति (यदि उसी धारा में हो, अन्यथा 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।')",
    "punishmentNature": "सजा की प्रकृति",
    "fineAmount": "सत्यापित जुर्माना राशि (यदि उसी धारा में हो, अन्यथा 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।')",
    "fineOtherCondition": "अन्य शर्त (उदा: जुर्माना अथवा दोनों)",
    "firstStep": "पहला जरूरी कदम",
    "nextStep": "अगला व्यावहारिक कदम (लिखित पावती लेना)",
    "authority": "संबंधित सक्षम अधिकारी/थाना/राजस्व न्यायालय/प्राधिकरण",
    "verificationSource": "आधिकारिक स्रोत (उदा: India Code - indiacode.nic.in / राज्य राजस्व पोर्टल)",
    "isUncertain": false,
    "uncertaintyMessage": "",
    "neighbouringProvisionsNote": "यदि संबंधित विषय पर अन्य धारा में दंड/प्रावधान है तो उसका पृथक विवरण (उदा: धारा 23/227 में नुकसान पर कार्रवाई)",
    "provisionGeneral": "कानून में यह प्रावधान है...",
    "caseApplication": "आपके मामले में यह लागू हो सकता है...",
    "factsDependence": "यह धारा/कानून मामले की परिस्थितियों पर निर्भर करता है।",
    "lawType": "राज्य कानून (State Law) / केंद्रीय कानून (Central Law)"
  },
  "safestNextStep": "सुरक्षित व्यावहारिक कदम",
  "formatBContent": "Justice Ji का पूरा Format B लेख जिसमें <u>[विषय]</u>, 1. समस्या क्या है?, 2. क्या करें?, 3. संबंधित कानून/धारा (राज्य कानून होने पर: ⚖️ संबंधित कानून, • राज्य:, • कानून/Code:, • धारा:, • धारा का विषय:, 🔴 सजा:, 🟠 जुर्माना: (यदि सजा/जुर्माना उस धारा में न हो तो 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।' लिखें), 🟢 क्या करें:), 4. जरूरी कागज़/सबूत, 5. कहाँ जाएँ?, 6. वर्तमान संपर्क जानकारी, 7. आगे क्या करें?, ध्यान रखें:, स्रोत/Verification:)",
  "requiredDocuments": ["दस्तावेज 1", "दस्तावेज 2", "साक्ष्य 3"],
  "authorityAndForum": "सक्षम विभाग / राजस्व न्यायालय / थाना / आयोग / न्यायालय",
  "verifiedContacts": [
    {
      "name": "विभाग/हेल्पलाइन का नाम",
      "contact": "सत्यापित नंबर या राष्ट्रीय/राज्यीय हेल्पलाइन",
      "portal": "आधिकारिक वेबसाइट लिंक (.gov.in/.nic.in)",
      "note": "टिप्पणी"
    }
  ],
  "needsStateOrDistrict": true_या_false,
  "stateDistrictPrompt": "यदि राज्य/जिला जरूरी है तो पूछने वाला संदेश (अन्यथा खाली)",
  "unverifiedNote": "यदि कोई बात सत्यापित नहीं हो सकी तो उसका विवरण",
  "requiresDraft": true_या_false,
  "draftOffer": "क्या आपको इसके लिए थाने/अधिकारी को देने हेतु लिखित आवेदन या FIR ड्राफ्ट चाहिए?",
  "generatedDraft": "यदि requiresDraft सत्य है तो पूरा औपचारिक हिंदी ड्राफ्ट, अन्यथा खाली",
  "isNewTopic": true
}
`;

  let jsonResult: any = null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    const responseText = response.text || "";
    // Clean JSON from potential markdown wrapping
    const jsonMatch =
      responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [
        null,
        responseText,
      ];
    const candidate = jsonMatch[1]?.trim() || responseText.trim();
    jsonResult = JSON.parse(candidate);
  } catch (err: any) {
    console.warn("Falling back to gemini-3.1-flash-lite or retry:", err?.message);
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });
      const text = fallbackResponse.text || "";
      const jsonMatch =
        text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
      jsonResult = JSON.parse(jsonMatch[1]?.trim() || text.trim());
    } catch (fallbackErr) {
      console.error("JSON parse failure in processLegalResearch:", fallbackErr);
      // Construct a safe structured response
      jsonResult = {
        legalProblem: `कानूनी प्रश्न: ${question}`,
        applicableLaw: "भारतीय न्याय संहिता, 2023 (BNS) एवं सुसंगत अधिनियम",
        formatBContent: `<u>${question}</u>\n\n1. समस्या क्या है?\n• ${question}\n\n2. क्या करें?\n• तत्काल नजदीकी संबंधित कार्यालय या हेल्पलाइन पर संपर्क करें।\n\n3. संबंधित कानून/धारा\n• वर्तमान कानून: BNS 2023 / Consumer Protection Act 2019 / विशेष अधिनियम।\n\n4. जरूरी कागज़/सबूत\n• पहचान पत्र, लेन-देन की रसीद, संचार/चैट रिकॉर्ड।\n\n5. कहाँ जाएँ?\n• संबंधित थाना या सक्षम विधिक प्राधिकरण।\n\n6. वर्तमान संपर्क जानकारी\n• राष्ट्रीय आपातकालीन हेल्पलाइन: 112\n• राष्ट्रीय विधिक सेवा (NALSA): 15100\n• पोर्टल: https://nalsa.gov.in\n\n7. आगे क्या करें?\n• लिखित शिकायत दर्ज कर पावती (Receipt) अवश्य लें।\n\nध्यान रखें:\n• किसी भी अपुष्ट फोन नंबर पर विश्वास न करें, केवल आधिकारिक सरकारी पोर्टल देखें।`,
        requiredDocuments: ["पहचान पत्र (Aadhaar/Voter ID)", "घटना/लेनदेन के साक्ष्य", "लिखित विवरण"],
        authorityAndForum: "संबंधित स्थानीय थाना या सक्षम विधिक प्राधिकरण",
        verifiedContacts: [
          {
            name: "राष्ट्रीय आपातकालीन हेल्पलाइन",
            contact: "112",
            portal: "https://112.gov.in",
            note: "24x7 निःशुल्क सेवा",
          },
          {
            name: "मुफ्त कानूनी सलाह (NALSA)",
            contact: "15100",
            portal: "https://nalsa.gov.in",
            note: "सरकारी विधिक सेवा प्राधिकरण",
          },
        ],
        needsStateOrDistrict: !state,
        stateDistrictPrompt: !state
          ? "कृपया अपने राज्य और जिले का नाम बताएं ताकि हम आपके नजदीकी सक्षम अधिकारी एवं पोर्टल की सटीक जानकारी दे सकें।"
          : "",
        unverifiedNote: "",
        requiresDraft: true,
        draftOffer: "क्या आपको इस मामले में संबंधित अधिकारी को देने हेतु शिकायत पत्र या आवेदन का ड्राफ्ट चाहिए?",
        generatedDraft: "",
        isNewTopic: true,
      };
    }
  }

  // Normalize and strictly sanitize legalSectionDetails
  const rawDetails = jsonResult.legalSectionDetails || {};
  const isStateLaw = Boolean(
    rawDetails.isStateLaw ||
      rawDetails.lawType?.includes("राज्य") ||
      Boolean(state)
  );
  const resolvedState = rawDetails.state || state || "";

  // Inspect section details for demarcation vs damage to marks vs general administrative powers
  const combinedSectionText = `${rawDetails.sectionNumber || ""} ${rawDetails.sectionTitle || ""} ${rawDetails.sectionAbout || ""} ${jsonResult.applicableLaw || ""}`.toLowerCase();
  
  const isDemarcationSection =
    /(?:धारा\s*24|section\s*24|धारा\s*129|section\s*129|धारा\s*111|section\s*111)/i.test(combinedSectionText) &&
    /(?:revenue|राजस्व|land|bhumi|संहिता|code|act)/i.test(`${rawDetails.actName || ""} ${jsonResult.applicableLaw || ""}`) &&
    /(?:सीमांकन|demarcation|सीमा\s*विवाद|boundary)/i.test(combinedSectionText);

  // Check if punishment is in the provision
  const rawPunishment = String(
    rawDetails.punishment || rawDetails.maxPunishment || ""
  ).trim();
  const rawFine = String(rawDetails.fineAmount || "").trim();

  const hasExplicitNoPunishment =
    rawDetails.hasPunishmentInProvision === false ||
    isDemarcationSection ||
    rawPunishment.includes("अलग से दंड") ||
    rawPunishment.includes("निर्धारित नहीं") ||
    rawPunishment === "कोई सजा नहीं" ||
    rawPunishment === "शून्य" ||
    rawPunishment === "";

  const hasExplicitNoFine =
    rawDetails.hasFineInProvision === false ||
    isDemarcationSection ||
    rawFine.includes("अलग से दंड") ||
    rawFine.includes("निर्धारित नहीं") ||
    rawFine === "कोई जुर्माना नहीं" ||
    rawFine === "शून्य" ||
    rawFine === "";

  // Cross-check neighbouring sections for boundary marks/demarcation
  let neighbouringProvisionsNote = rawDetails.neighbouringProvisionsNote || "";
  if (!neighbouringProvisionsNote && (isDemarcationSection || /(?:मेढ़|सीमा|चिह्न|स्तंभ|निशान|boundary|mark)/i.test(question))) {
    if (resolvedState.includes("उत्तर प्रदेश") || resolvedState.includes("यूपी") || (rawDetails.actName || "").includes("उत्तर प्रदेश राजस्व")) {
      neighbouringProvisionsNote = "सीमांकन (धारा 24) में कोई सजा या जुर्माना नहीं है। मेढ़ या सीमा चिह्नों को जानबूझकर नष्ट करने, हटाने या क्षति पहुंचाने पर धारा 23/227 (उत्तर प्रदेश राजस्व संहिता) के अंतर्गत अलग से कार्रवाई व जुर्माना हो सकता है।";
    } else if (resolvedState.includes("मध्य प्रदेश") || (rawDetails.actName || "").includes("मध्य प्रदेश") || /एमपी|MP|Madhya\s*Pradesh/i.test(question)) {
      neighbouringProvisionsNote = "• पृथक कानूनी प्रावधान (धारा 130 MPLRC, 1959): सीमा या सर्वेक्षण चिह्नों को जानबूझकर नष्ट करने, क्षति पहुंचाने या हटाने पर 'धारा 130' (Penalty for destruction, injury or removal of boundary or survey marks) के तहत तहसीलदार द्वारा प्रत्येक चिह्न के लिए विहित सीमा तक जुर्माना अधिरोपित किया जा सकता है (कारावास नहीं)। धारा 129 (सीमांकन) में कोई दंड या जुर्माना नहीं है। दोनों धाराएं पूरी तरह स्वतंत्र हैं और धारा 130 का जुर्माना धारा 129 से नहीं जोड़ा जा सकता।";
    }
  }

  // Ensure isolation when question involves MP Land Revenue Code and demarcation / marks
  const isMpLandCode = (resolvedState.includes("मध्य प्रदेश") || (rawDetails.actName || "").includes("मध्य प्रदेश") || /एमपी|MP|Madhya\s*Pradesh/i.test(question)) &&
    /(?:भूमि|भू-राजस्व|राजस्व|खेत|मेढ़|सीमा|सीमांकन|चिह्न|revenue|land|demarcation)/i.test(question + " " + (rawDetails.actName || ""));

  if (isMpLandCode) {
    const isSection129 = /(?:129)/.test(rawDetails.sectionNumber || "");
    const isSection130 = /(?:130)/.test(rawDetails.sectionNumber || "");

    if (isSection129) {
      // Demarcation has NO punishment, NO imprisonment, NO fine
      rawDetails.hasPunishmentInProvision = false;
      rawDetails.hasFineInProvision = false;
      rawDetails.sectionTitle = rawDetails.sectionTitle || "Demarcation of boundaries of survey number or sub-division of survey number or block number or plot number";
    } else if (isSection130) {
      // Penalty for destruction/injury/removal of boundary marks has penalty fine, NO imprisonment
      rawDetails.hasPunishmentInProvision = false;
      rawDetails.sectionTitle = rawDetails.sectionTitle || "Penalty for destruction, injury or removal of boundary or survey marks";
      // Prevent model-memory hallucination of 2,000 fine
      if (/(?:2,?000|दो\s*हजार|दो\s*हज़ार)/i.test(rawDetails.fineAmount || "")) {
        rawDetails.fineAmount = "विहित सीमा तक शास्ति (सटीक राशि हेतु आधिकारिक verification आवश्यक)";
        rawDetails.fineOtherCondition = "प्रत्येक नष्ट/क्षतिग्रस्त/हटाए गए चिह्न हेतु शास्ति व बहाली का खर्च (कारावास नहीं)";
      }
    }
  }

  const isUncertain = Boolean(rawDetails.isUncertain);
  const uncertaintyMessage =
    rawDetails.uncertaintyMessage ||
    (isUncertain
      ? "आधिकारिक कानून के मूल प्रावधान से इस धारा/दंड की पुष्टि नहीं हो पा रही है, इसलिए मैं अनुमान से धारा या जुर्माने की राशि नहीं बता रहा हूँ।"
      : "");

  // GLOBAL SUB-CLAUSE RULE: Resolve penal sub-clause when punishment or fine is present
  const rawSectionNumber = rawDetails.sectionNumber || jsonResult.applicableLaw || "";
  const resolvedSectionNumber = resolvePenalSubClause(
    rawSectionNumber,
    rawDetails.actName || jsonResult.applicableLaw || "",
    hasExplicitNoPunishment ? "" : rawPunishment,
    hasExplicitNoFine ? "" : (rawDetails.fineAmount || "")
  );

  const sanitizedSectionDetails = {
    actName: rawDetails.actName || jsonResult.applicableLaw || "संबंधित विधिक अधिनियम",
    sectionNumber: resolvedSectionNumber,
    sectionTitle: rawDetails.sectionTitle || rawDetails.sectionAbout || "",
    sectionAbout: rawDetails.sectionAbout || rawDetails.sectionTitle || "संबंधित कानूनी प्रावधान",
    applicableCondition:
      rawDetails.applicableCondition ||
      "मामले के विशिष्ट तथ्यों व परिस्थितियों पर निर्भर",
    state: resolvedState,
    isStateLaw,
    hasPunishmentInProvision: !hasExplicitNoPunishment,
    hasFineInProvision: !hasExplicitNoFine,
    punishment: hasExplicitNoPunishment
      ? "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"
      : rawPunishment,
    minPunishment: hasExplicitNoPunishment
      ? "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"
      : rawDetails.minPunishment || "कानून में न्यूनतम निर्धारित नहीं",
    maxPunishment: hasExplicitNoPunishment
      ? "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"
      : rawDetails.maxPunishment || rawPunishment || "प्रावधान के अनुसार",
    punishmentNature: hasExplicitNoPunishment ? "" : rawDetails.punishmentNature || "",
    fineAmount: hasExplicitNoFine
      ? "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"
      : rawDetails.fineAmount || "अदालत के विवेक पर निर्भर",
    fineOtherCondition: hasExplicitNoFine
      ? "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।"
      : rawDetails.fineOtherCondition || "सत्यापित धारा के अनुसार",
    firstStep:
      rawDetails.firstStep || "सक्षम अधिकारी या थाने में लिखित आवेदन प्रस्तुत करें",
    nextStep:
      rawDetails.nextStep || "शिकायत की मुहर लगी पावती (Receiving) अवश्य लें",
    authority:
      rawDetails.authority ||
      jsonResult.authorityAndForum ||
      "संबंधित अधिकृत कार्यालय / न्यायालय",
    verificationSource:
      rawDetails.verificationSource || "India Code (indiacode.nic.in) / राज्य सरकारी पोर्टल",
    isUncertain,
    uncertaintyMessage,
    neighbouringProvisionsNote,
    provisionGeneral:
      rawDetails.provisionGeneral || "कानून में इस विषय पर वैधानिक प्रावधान उपलब्ध है।",
    caseApplication:
      rawDetails.caseApplication || "नागरिक द्वारा बताए गए तथ्यों के आधार पर लागू हो सकता है।",
    factsDependence:
      rawDetails.factsDependence ||
      "यह धारा/कानून मामले की विशिष्ट परिस्थितियों पर निर्भर करता है।",
    lawType:
      rawDetails.lawType || (isStateLaw ? "राज्य कानून (State Law)" : "केंद्रीय कानून (Central Law)"),
  };

  // Strictly sanitize formatBContent if present
  let formattedB = (jsonResult && jsonResult.formatBContent) ? String(jsonResult.formatBContent) : "• धारा: लागू नहीं\n• सजा: लागू नहीं\n• जुर्माना: लागू नहीं\n• स्रोत: indiacode.nic.in";

  // Apply GLOBAL SUB-CLAUSE RULE to formattedB section line
  if (resolvedSectionNumber && formattedB.includes("• धारा:")) {
    formattedB = formattedB.replace(
      /(•\s*धारा:\s*)(?:धारा\s*[\d\w()/-]+|[^\n]+)/i,
      `$1${resolvedSectionNumber}`
    );
  }

  if (hasExplicitPunishment && formattedB && formattedB.includes("• सजा:")) {
    // Replace any punishment block with explicit no-punishment statement
    formattedB = formattedB.replace(
      /🔴\s*सजा:[^\n]*\n(?:[^\n]*\n)?(?=🟠|🟢|स्रोत|$)/i,
      "🔴 सजा:\n• इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।\n"
    );
  if (hasExplicitNoFine && formattedB && formattedB.includes("• जुर्माना:")) {
      // Replace any fine block with explicit no-fine statement
      formattedB = formattedB.replace(
        /(•\s*जुर्माना:\s*)\n?(?:\s*\n)*(?:[^\n]*\n)?(?=•\s*स्रोत|$)/i,
        "• जुर्माना:\n• इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।\n"
      );
    } else if (isUpLandCode && formattedB && formattedB.includes("• जुर्माना:")) {
    formattedB = formattedB.replace(
      /(?:\*\*|)?(?:दो\s*हजार\s*रुपये|दो\s*हज़ार\s*रुपये|₹\s*2,?000|2,?000\s*रुपये)(?:\*\*|)?/gi,
      "विहित सीमा तक शास्ति (सटीक राशि हेतु official text verification आवश्यक)"
    );
  }

  // GLOBAL VERIFICATION GATE (1% भी संशय होने पर isVerified = false स्वतः ट्रिगर होगा):
  const doubtPattern =
    /(?:संशय|संदेह|संभावित|अपुष्ट|पुष्टि\s*आवश्यक|verification\s*आवश्यक|सत्यापन\s*आवश्यक|साक्ष्य\s*अपूर्ण|गजट\s*साक्ष्य\s*अपूर्ण|not\s*verified|unverified|fail|incomplete\s*evidence|discrepancy|संशोधन\s*की\s*पुष्टि\s*नहीं|अस्पष्ट|अपूर्ण\s*साक्ष्य|1%|पुष्टि\s*नहीं\s*हो\s*सकी|सटीक\s*राशि\s*हेतु|अनुमान\s*से|पुष्टि\s*न\s*होने|साक्ष्य\s*की\s*कमी)/i;

  const hasDoubt =
    isUncertain ||
    Boolean(sanitizedSectionDetails.isUncertain) ||
    doubtPattern.test(sanitizedSectionDetails.fineAmount || "") ||
    doubtPattern.test(sanitizedSectionDetails.punishment || "") ||
    doubtPattern.test(sanitizedSectionDetails.uncertaintyMessage || "") ||
    doubtPattern.test(formattedB) ||
    doubtPattern.test(jsonResult.unverifiedNote || "") ||
    (isMpLandCode && /(?:130)/.test(sanitizedSectionDetails.sectionNumber || question));

  const hasAnyFailure =
    hasDoubt ||
    /(?:section|धारा)\s*\d+[^:\n]*:\s*(?:fail|not\s*verified|अपुष्ट|सत्यापित\s*नहीं)/i.test(formattedB) ||
    /\b(?:FAIL|NOT\s*VERIFIED)\b/.test(formattedB) ||
    webData.sources.length === 0;

  let hardFailReason = "";
  if (hasAnyFailure) {
    if (isMpLandCode && (/(?:130)/.test(sanitizedSectionDetails.sectionNumber || "") || /(?:130)/.test(question))) {
      hardFailReason = "धारा 130 का संशोधित वैधानिक साक्ष्य अपूर्ण है";
    } else if (sanitizedSectionDetails.sectionNumber) {
      hardFailReason = `${sanitizedSectionDetails.sectionNumber} का संशोधित वैधानिक साक्ष्य अपूर्ण है (1% संशय गेट सक्रिय)`;
    } else {
      hardFailReason = "वैधानिक साक्ष्य अपूर्ण है (100% आधिकारिक गजट सत्यापन आवश्यक है)";
    }

    if (/(?:overall\s*(?:result\s*:?\s*)?pass|overall\s*status\s*:?\s*pass|कुल\s*परिणाम\s*:?\s*pass|सभी\s*धाराएं\s*pass)/i.test(formattedB)) {
      formattedB = formattedB.replace(
        /(?:overall\s*(?:result\s*:?\s*)?pass|overall\s*status\s*:?\s*pass|कुल\s*परिणाम\s*:?\s*pass|सभी\s*धाराएं\s*pass)/gi,
        `STATUS: OVERALL RESULT: FAIL (${hardFailReason})`
      );
    }
  }

  const isOverallVerified = !hasAnyFailure;

  // If hard failed, formatBContent must not render as a normal verified article - completely blocked with FAIL status
  if (!isOverallVerified) {
    formattedB = `STATUS: OVERALL RESULT: FAIL (${hardFailReason})\n\n[हार्ड-फेल गेट प्रवर्तन - Hard-Fail Gate Enforced]\n• 1% संशय / अप्रमाणित प्रावधान नियम लागू: किसी भी धारा, उपधारा, सज़ा या राज्य संशोधन में संशय होने पर कानूनी लेख पूर्णतः अवरुद्ध (Blocked) रहेगा।\n• वैधानिक स्थिति: आधिकारिक कानून / राज्य ई-गजट के 100% पुष्ट मूल पाठ के बिना यह सामग्री सत्यापित नहीं मानी जा सकती।\n• अनलॉक शर्त: केवल 100% गजट-पुष्ट डेटा प्राप्त होने पर ही लेख प्रदर्शित होगा।`;
  }

  // Ensure official sources and verification date are attached
  return {
    question,
    state: resolvedState,
    district: district || "",
    legalProblem: jsonResult.legalProblem || question,
    applicableLaw: jsonResult.applicableLaw || sanitizedSectionDetails.sectionNumber,
    legalSectionDetails: sanitizedSectionDetails,
    safestNextStep: isVerificationMode || !isOverallVerified
      ? ""
      : (jsonResult.safestNextStep ||
         "संबंधित विभाग अथवा थाने में लिखित आवेदन प्रस्तुत कर मुहर लगी पावती (Receiving) अवश्य लें, अथवा NALSA 15100 पर निःशुल्क मार्गदर्शन लें।"),
    formatBContent: formattedB,
    requiredDocuments: isVerificationMode || !isOverallVerified
      ? []
      : (Array.isArray(jsonResult.requiredDocuments) ? jsonResult.requiredDocuments : []),
    authorityAndForum: jsonResult.authorityAndForum || sanitizedSectionDetails.authority,
    verifiedContacts: isVerificationMode || !isOverallVerified
      ? []
      : (Array.isArray(jsonResult.verifiedContacts) ? jsonResult.verifiedContacts : []),
    officialSources: webData.sources,
    verificationDate,
    isOverallVerified,
    hardFailReason: !isOverallVerified ? hardFailReason : undefined,
    needsStateOrDistrict: isVerificationMode || !isOverallVerified ? false : Boolean(jsonResult.needsStateOrDistrict),
    stateDistrictPrompt: isVerificationMode || !isOverallVerified ? "" : (jsonResult.stateDistrictPrompt || ""),
    unverifiedNote: !isOverallVerified ? hardFailReason : (jsonResult.unverifiedNote || ""),
    requiresDraft: isVerificationMode || !isOverallVerified ? false : Boolean(jsonResult.requiresDraft),
    draftOffer: isVerificationMode || !isOverallVerified ? "" : (jsonResult.draftOffer || ""),
    generatedDraft: isVerificationMode || !isOverallVerified ? "" : (jsonResult.generatedDraft || ""),
    isNewTopic: true,
  };
}
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const question = body.question || body.query || body.userQuery || "";
    const state = body.state || "";
    const district = body.district || "";
    const userFacts = body.userFacts || "";
    const generateDraft = Boolean(body.generateDraft);

    const result = await processLegalResearch(question, state, district, userFacts, generateDraft);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
