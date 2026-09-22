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
  ArrowUp,
  Send,
  Loader2,
} from "lucide-react";
import { LegalResearchResult } from "../types";
import { VoiceInputButton } from "./VoiceInputButton";
import { LegalSectionDisplay, FormattedLegalContent } from "./LegalTextFormatter";
import { useLanguage, SUPPORTED_LANGUAGES } from "../context/LanguageContext";

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

function parseFormatBText(
  text: string,
  query: string,
  state?: string,
  district?: string,
  userFacts?: string,
  sources: Array<{ title: string; url: string }> = [],
  verificationDate?: string,
  isHardFailed?: boolean,
  hardFailReason?: string
): LegalResearchResult {
  const lines = text.split("\n").map((l) => l.trim());

  // 1. Legal problem
  let legalProblem = "";
  const problemIdx = lines.findIndex((l) => /1\.\s*समस्या\s*क्या\s*है/i.test(l));
  if (problemIdx !== -1) {
    const probLines: string[] = [];
    for (let i = problemIdx + 1; i < lines.length && i < problemIdx + 10; i++) {
      if (/^[2-7]\./.test(lines[i]) || /^[🔴🟠🟢⚖️]/.test(lines[i])) break;
      if (lines[i]) probLines.push(lines[i].replace(/^[•\-\*]\s*/, ""));
    }
    legalProblem = probLines.join(" ");
  }
  if (!legalProblem) {
    legalProblem = query;
  }

  // 2. What to do / Safest next step
  let safestNextStep = "";
  const nextStepLine = lines.find((l) => /पहला\s*कदम\s*:/i.test(l));
  if (nextStepLine) {
    safestNextStep = nextStepLine.replace(/^.*पहला\s*कदम\s*:\s*/i, "").trim();
  } else {
    const whatToDoIdx = lines.findIndex((l) => /2\.\s*क्या\s*करें/i.test(l));
    if (whatToDoIdx !== -1) {
      for (let i = whatToDoIdx + 1; i < lines.length && i < whatToDoIdx + 5; i++) {
        if (lines[i].startsWith("•") || lines[i].startsWith("-")) {
          safestNextStep = lines[i].replace(/^[•\-\*]\s*/, "").trim();
          break;
        }
      }
    }
  }
  if (!safestNextStep) {
    safestNextStep = "नजदीकी संबंधित थाने या सक्षम प्राधिकारी के समक्ष लिखित आवेदन दें।";
  }

  // 3. Applicable Law & Section
  let actName = "";
  let sectionNumber = "";
  let sectionTitle = "";
  const actLine = lines.find((l) => /•?\s*(?:कानून\/Code|कानून)\s*:/i.test(l));
  if (actLine) {
    actName = actLine.replace(/^.*(?:कानून\/Code|कानून)\s*:\s*/i, "").trim();
  }
  const secLine = lines.find((l) => /•?\s*धारा\s*:/i.test(l));
  if (secLine) {
    sectionNumber = secLine.replace(/^.*धारा\s*:\s*/i, "").trim();
  }
  const titleLine = lines.find((l) => /•?\s*(?:धारा\s*का\s*विषय|विषय)\s*:/i.test(l));
  if (titleLine) {
    sectionTitle = titleLine.replace(/^.*(?:धारा\s*का\s*विषय|विषय)\s*:\s*/i, "").trim();
  }

  if (!actName && !sectionNumber) {
    const secMatch = text.match(/(?:धारा|Section)\s*(\d+[A-Za-z]?(?:\(\d+\)(?:\([a-z]\))?)?)\s*(?:of\s+)?([^\n,।]+)?/i);
    if (secMatch) {
      sectionNumber = secMatch[1];
      actName = secMatch[2]?.trim() || "भारतीय न्याय संहिता, 2023 (BNS)";
    } else {
      actName = "भारतीय न्याय संहिता, 2023 (BNS) व सुसंगत अधिनियम";
      sectionNumber = "सुसंगत विधिक प्रावधान";
    }
  }

  // Punishment & Fine
  let punishment = "";
  let fineAmount = "";
  const punIdx = lines.findIndex((l) => /🔴\s*सजा/i.test(l) || /सजा\s*:/i.test(l));
  if (punIdx !== -1) {
    const punLines: string[] = [];
    for (let i = punIdx + 1; i < lines.length && i < punIdx + 5; i++) {
      if (/^[🟠🟢•]/.test(lines[i]) || /^[3-7]\./.test(lines[i])) break;
      if (lines[i]) punLines.push(lines[i].replace(/^[•\-\*]\s*/, ""));
    }
    punishment = punLines.join("; ") || "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।";
  } else {
    punishment = "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।";
  }

  const fineIdx = lines.findIndex((l) => /🟠\s*जुर्माना/i.test(l) || /जुर्माना\s*:/i.test(l));
  if (fineIdx !== -1) {
    const fineLines: string[] = [];
    for (let i = fineIdx + 1; i < lines.length && i < fineIdx + 5; i++) {
      if (/^[🟢•]/.test(lines[i]) || /^[3-7]\./.test(lines[i])) break;
      if (lines[i]) fineLines.push(lines[i].replace(/^[•\-\*]\s*/, ""));
    }
    fineAmount = fineLines.join("; ") || "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।";
  } else {
    fineAmount = "इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।";
  }

  // Next step
  let nextStep = "";
  const nextLine = lines.find((l) => /•?\s*अगला\s*कदम\s*:/i.test(l));
  if (nextLine) {
    nextStep = nextLine.replace(/^.*अगला\s*कदम\s*:\s*/i, "").trim();
  }

  // Authority / Where to go
  let authority = "";
  const authLine = lines.find((l) => /•?\s*संबंधित\s*अधिकारी(?:\/प्राधिकरण)?\s*:/i.test(l));
  if (authLine) {
    authority = authLine.replace(/^.*संबंधित\s*अधिकारी(?:\/प्राधिकरण)?\s*:\s*/i, "").trim();
  } else {
    const whereIdx = lines.findIndex((l) => /5\.\s*कहाँ\s*जाएँ/i.test(l));
    if (whereIdx !== -1) {
      for (let i = whereIdx + 1; i < lines.length && i < whereIdx + 4; i++) {
        if (lines[i]) {
          authority = lines[i].replace(/^[•\-\*]\s*/, "").trim();
          break;
        }
      }
    }
  }
  if (!authority) {
    authority = "सक्षम पुलिस थाना / राजस्व न्यायालय / विधिक सेवा प्राधिकरण (DLSA)";
  }

  // Documents
  const requiredDocuments: string[] = [];
  const docIdx = lines.findIndex((l) => /4\.\s*जरूरी\s*कागज़/i.test(l));
  if (docIdx !== -1) {
    for (let i = docIdx + 1; i < lines.length && i < docIdx + 10; i++) {
      if (/^[5-7]\./.test(lines[i])) break;
      if (lines[i].startsWith("•") || lines[i].startsWith("-")) {
        requiredDocuments.push(lines[i].replace(/^[•\-\*]\s*/, "").trim());
      }
    }
  }
  if (requiredDocuments.length === 0) {
    requiredDocuments.push(
      "लिखित आवेदन / शिकायत पत्र",
      "पहचान प्रमाण पत्र (आधार / वोटर आईडी)",
      "घटना या लेनदेन से जुड़े साक्ष्य (रसीद, फोटो, स्क्रीनशॉट)"
    );
  }

  // Contacts
  const verifiedContacts: Array<{ name: string; contact: string; portal?: string }> = [];
  const contactIdx = lines.findIndex((l) => /6\.\s*वर्तमान\s*संपर्क\s*जानकारी/i.test(l));
  if (contactIdx !== -1) {
    for (let i = contactIdx + 1; i < lines.length && i < contactIdx + 8; i++) {
      const line = lines[i];
      if (/^[7-9]\./.test(line)) break;
      if (/1930/.test(line)) {
        verifiedContacts.push({ name: "राष्ट्रीय साइबर अपराध हेल्पलाइन", contact: "1930", portal: "https://cybercrime.gov.in" });
      } else if (/1915/.test(line)) {
        verifiedContacts.push({ name: "राष्ट्रीय उपभोक्ता हेल्पलाइन", contact: "1915", portal: "https://consumerhelpline.gov.in" });
      } else if (/112/.test(line)) {
        verifiedContacts.push({ name: "आपातकालीन पुलिस सेवा", contact: "112", portal: "https://112.gov.in" });
      } else if (/181/.test(line)) {
        verifiedContacts.push({ name: "महिला हेल्पलाइन", contact: "181", portal: "https://wcd.nic.in" });
      } else if (/15100/.test(line)) {
        verifiedContacts.push({ name: "राष्ट्रीय विधिक सेवा प्राधिकरण (NALSA)", contact: "15100", portal: "https://nalsa.gov.in" });
      }
    }
  }
  if (verifiedContacts.length === 0) {
    if (/साइबर|ऑनलाइन|खाते|फ्रॉड|पैसे/i.test(text + " " + query)) {
      verifiedContacts.push({ name: "राष्ट्रीय साइबर अपराध हेल्पलाइन", contact: "1930", portal: "https://cybercrime.gov.in" });
    }
    if (/उपभोक्ता|कंज्यूमर|सामान|कंपनी|वारंटी/i.test(text + " " + query)) {
      verifiedContacts.push({ name: "राष्ट्रीय उपभोक्ता हेल्पलाइन", contact: "1915", portal: "https://consumerhelpline.gov.in" });
    }
    verifiedContacts.push(
      { name: "आपातकालीन सहायता / पुलिस हेल्पलाइन", contact: "112", portal: "https://112.gov.in" },
      { name: "राष्ट्रीय विधिक सेवा प्राधिकरण (मुफ्त विधिक सहायता)", contact: "15100", portal: "https://nalsa.gov.in" }
    );
  }

  // Legal Draft extraction
  let generatedDraft: string | undefined = undefined;
  const draftIdx = text.search(/(?:सेवा\s*में|प्रार्थना\s*पत्र|प्राथमिकी\s*दर्ज\s*करने\s*हेतु\s*आवेदन|शिकायत\s*पत्र)/i);
  if (draftIdx !== -1) {
    generatedDraft = text.substring(draftIdx).trim();
  } else if (/fir|शिकायत|मुकदमा|चोरी|हमला|धमकी|कब्जा|आवेदन/i.test(query)) {
    generatedDraft = `सेवा में,
श्रीमान थाना प्रभारी महोदय,
थाना: [थाने का नाम दर्ज करें],
जिला: [${district || "जिले का नाम"}] (${state || "राज्य"})

विषय: ${query} के संबंध में प्राथमिकी (FIR) / कानूनी कार्रवाई हेतु आवेदन।

महोदय,
सविनय निवेदन है कि प्रार्थी [अपना नाम], निवासी [स्थायी पता, मोबाइल नंबर: ________] का रहने वाला हूँ।
घटना का विवरण निम्नलिखित है:
1. यह कि दिनांक [तारीख] को समय लगभग [समय] बजे घटना घटित हुई।
2. यह कि ${userFacts || query}।
3. यह कि उक्त कृत्य से प्रार्थी को भारी मानसिक व आर्थिक आघात पहुँचा है और यह ${actName} की ${sectionNumber} के तहत संज्ञेय अपराध है।

अतः श्रीमान जी से सविनय प्रार्थना है कि उक्त मामले में तत्काल प्राथमिकी (FIR) दर्ज कर दोषियों के विरुद्ध सख्त वैधानिक कार्रवाई करने की कृपा करें।

संलग्न साक्ष्य:
1. पहचान पत्र की छायाप्रति
2. आवश्यक दस्तावेज / साक्ष्य

भवदीय,
हस्ताक्षर: ____________
नाम: [अपना पूरा नाम]
दिनांक: [आज की तिथि]
मोबाइल नंबर: [अपना नंबर]`;
  }

  const isStateLaw = Boolean(state) || /राजस्व|land\s*revenue|कोड|संहिता.*2006|संहिता.*1959/i.test(actName);

  return {
    question: query,
    state,
    district,
    legalProblem,
    applicableLaw: `${actName} - ${sectionNumber}`,
    legalSectionDetails: {
      actName,
      sectionNumber,
      sectionTitle: sectionTitle || undefined,
      punishment,
      fineAmount,
      firstStep: safestNextStep,
      nextStep: nextStep || "लिखित पावती (Receiving) अवश्य लें",
      authority,
      isStateLaw,
      state: state || (isStateLaw ? "संबंधित राज्य" : undefined),
      lawType: isStateLaw ? "राज्यीय कानून / राजस्व संहिता" : "केंद्रीय कानून (BNS / संहिता 2023)",
      provisionGeneral: `${actName} की ${sectionNumber} के अंतर्गत इस प्रकार की विधिक परिस्थिति में स्पष्ट विधिक उपचार परिभाषित है।`,
      caseApplication: `नागरिक द्वारा बताए गए तथ्यों के अनुसार यह मामला ${actName} के अंतर्गत विचारणीय है।`,
      factsDependence: "यह धारा/कानून मामले की विशिष्ट परिस्थितियों और साक्ष्यों पर निर्भर करता है।",
    },
    safestNextStep,
    formatBContent: text,
    requiredDocuments,
    authorityAndForum: authority,
    verifiedContacts,
    officialSources: sources.length > 0 ? sources : [
      { title: "India Code (आधिकारिक डिजिटल वैधानिक संग्रह)", url: "https://www.indiacode.nic.in" },
      { title: "ई-गजट भारत सरकार (The Gazette of India)", url: "https://egazette.gov.in" }
    ],
    verificationDate: verificationDate || new Date().toLocaleDateString("hi-IN"),
    needsStateOrDistrict: false,
    requiresDraft: Boolean(generatedDraft),
    generatedDraft,
    isNewTopic: true,
    isVerified: !isHardFailed,
    isOverallVerified: !isHardFailed,
    hardFailReason,
  };
}

export const LegalWebSearch: React.FC<LegalWebSearchProps> = ({
  onOpenDraft,
  onSaveNewTopic,
}) => {
  const { currentLanguage, setLanguageByCode, t } = useLanguage();
  const [query, setQuery] = useState<string>("");
  const [userState, setUserState] = useState<string>("");
  const [userDistrict, setUserDistrict] = useState<string>("");
  const [userFacts, setUserFacts] = useState<string>("");
  const [needDraft, setNeedDraft] = useState<boolean>(true);
  const [showLocationFilters, setShowLocationFilters] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [streamingSources, setStreamingSources] = useState<Array<{ title: string; url: string }>>([]);
  const [streamingStatus, setStreamingStatus] = useState<string>("");
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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    isSubmittingRef.current = true;
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText("");
    setStreamingSources([]);
    setStreamingStatus("आधिकारिक सरकारी पोर्टलों पर लाइव कानूनी खोज व धारा सत्यापन प्रारंभ...");
    setErrorMessage(null);
    setSavedSuccess(false);
    currentSubmissionId.current += 1;

    let accumulatedText = "";
    let receivedSources: Array<{ title: string; url: string }> = [];
    let doneData: any = null;

    try {
      const response = await fetch("/api/ask-assistant-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuery,
          state: userState.trim(),
          district: userDistrict.trim(),
          userFacts: userFacts.trim(),
          generateDraft: needDraft,
          language: currentLanguage.code,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`सर्वर से उत्तर प्राप्त नहीं हो सका (${response.status})।`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported by browser/response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const payloadStr = trimmed.replace(/^data:\s*/, "");
          if (payloadStr === "[DONE]") break;

          try {
            const eventData = JSON.parse(payloadStr);

            if (eventData.type === "start") {
              setStreamingStatus(eventData.message || "सरकारी पोर्टलों पर खोज प्रारंभ...");
            } else if (eventData.type === "sources") {
              receivedSources = eventData.sources || [];
              setStreamingSources(receivedSources);
              setStreamingStatus("आधिकारिक विधिक विश्लेषण तैयार हो रहा है...");
            } else if (eventData.type === "chunk" && eventData.text) {
              accumulatedText += eventData.text;
              setStreamingText(accumulatedText);
            } else if (eventData.type === "done") {
              doneData = eventData;
            } else if (eventData.type === "error") {
              console.warn("SSE stream error message:", eventData.message);
              if (!accumulatedText.trim()) {
                throw new Error(eventData.message || "स्ट्रीमिंग में अस्थाई समस्या आई।");
              }
            }
          } catch (jsonErr: any) {
            if (jsonErr?.message && jsonErr.message.includes("स्ट्रीमिंग")) {
              throw jsonErr;
            }
            // Ignore incomplete partial JSON lines
          }
        }
      }

      // Process any trailing bytes in buffer
      if (buffer.trim().startsWith("data:")) {
        const payloadStr = buffer.trim().replace(/^data:\s*/, "");
        try {
          const eventData = JSON.parse(payloadStr);
          if (eventData.type === "done") {
            doneData = eventData;
          } else if (eventData.type === "chunk" && eventData.text) {
            accumulatedText += eventData.text;
            setStreamingText(accumulatedText);
          }
        } catch {}
      }

      const finalText = doneData?.fullText || accumulatedText;
      if (!finalText.trim()) {
        throw new Error("कानूनी विश्लेषण प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।");
      }

      const parsedResult = parseFormatBText(
        finalText,
        cleanQuery,
        userState.trim(),
        userDistrict.trim(),
        userFacts.trim(),
        receivedSources.length > 0 ? receivedSources : doneData?.sources || [],
        doneData?.verificationDate,
        doneData?.isHardFailed,
        doneData?.hardFailReason
      );

      setResult(parsedResult);
      lastSubmittedQuery.current = cleanQuery;
      isFreshInputPending.current = true;
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Stream search aborted by user or new query.");
        return;
      }

      console.error("Streaming search error:", err);

      // If text was partially streamed (>= 40 chars), render what was parsed rather than failing completely
      if (accumulatedText.trim().length >= 40) {
        const partialResult = parseFormatBText(
          accumulatedText,
          cleanQuery,
          userState.trim(),
          userDistrict.trim(),
          userFacts.trim(),
          receivedSources.length > 0 ? receivedSources : doneData?.sources || []
        );
        setResult(partialResult);
        lastSubmittedQuery.current = cleanQuery;
        isFreshInputPending.current = true;
      } else {
        // Fallback to standard JSON endpoint if stream produced no chunks
        try {
          setStreamingStatus("बैकअप कानूनी सेवा से उत्तर प्राप्त किया जा रहा है...");
          const fallbackRes = await fetch("/api/research-new-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: cleanQuery,
              state: userState.trim() || undefined,
              district: userDistrict.trim() || undefined,
              userFacts: userFacts.trim() || undefined,
              generateDraft: needDraft,
            }),
          });
          const fallbackJson = await fallbackRes.json();
          if (fallbackRes.ok && fallbackJson.success && fallbackJson.data) {
            setResult(fallbackJson.data);
            lastSubmittedQuery.current = cleanQuery;
            isFreshInputPending.current = true;
            return;
          }
        } catch (fallbackErr) {
          console.warn("Fallback research error:", fallbackErr);
        }

        setErrorMessage(
          err.message || "खोज व सत्यापन में समस्या आई। कृपया पुनः प्रयास करें।"
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      isSubmittingRef.current = false;
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCopyText = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.formatBContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleCopyHtml = () => {
    if (!result) return;

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

  useEffect(() => {
    if (hardFail.isHardFailed) {
      console.log(
        `[Justice Ji Audit Report (Client Log)] STATUS: OVERALL RESULT: FAIL (${hardFail.reason})`
      );
    }
  }, [hardFail.isHardFailed, hardFail.reason]);

  return (
    <div className="space-y-5 pb-32 sm:pb-36 min-h-[calc(100vh-140px)] flex flex-col justify-between">
      {/* Top Content Area */}
      <div className="space-y-5 flex-1">
        {/* 1. WELCOME HERO (जब तक कोई सर्च या परिणाम न हो) */}
        {!result && !isLoading && !isStreaming && (
          <div className="space-y-6 pt-2 sm:pt-6 animate-in fade-in duration-300">
            {/* Center Greeting & Identity */}
            <div className="text-center max-w-2xl mx-auto space-y-3 px-2">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-700 text-amber-50 shadow-md mb-1 ring-4 ring-amber-100 dark:ring-amber-950/60">
                <Scale className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight font-serif">
                {t("heroGreeting")}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
                {t("heroSubtitle")}
              </p>
            </div>

            {/* Quick 1-Click Suggestion Cards (Gemini Style Grid) */}
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-stone-400 mb-2.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t("quickSuggestionsHeading")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {POPULAR_NOVEL_QUERIES.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleSelectPreset(item);
                      setTimeout(() => {
                        handleSearchAndResearch();
                      }, 50);
                    }}
                    className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-stone-900 hover:bg-amber-50/70 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all text-left group shadow-xs hover:shadow-sm cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-950/60 text-stone-600 dark:text-stone-300 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                          {item.category}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors shrink-0" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white group-hover:text-amber-950 dark:group-hover:text-amber-300 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-snug">
                      {item.facts}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sleek Trust & Rules Strip */}
            <div className="max-w-4xl mx-auto bg-amber-950 dark:bg-stone-900 text-amber-100 dark:text-stone-200 rounded-xl p-3.5 sm:p-4 border border-amber-900 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span>
                  <strong>{t("liveWebSearchTitle")}</strong> {t("liveWebSearchDesc")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-300 dark:text-stone-400 text-[11px] shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("rulesEnforcedBadge")}</span>
              </div>
            </div>
          </div>
        )}

      {/* Real-time Streaming Response View */}
      {isStreaming && (
        <div className="bg-white rounded-2xl border-2 border-amber-500/80 shadow-lg p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>लाइव विधिक विश्लेषण व धारा सत्यापन</span>
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                ⚡ लाइव स्ट्रीमिंग
              </span>
            </div>
            <div className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{streamingStatus || "AI द्वारा सीधे टाइप हो रहा है..."}</span>
            </div>
          </div>

          {/* Live discovered sources */}
          {streamingSources.length > 0 && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
              <div className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-700" />
                <span>प्राप्त आधिकारिक वैधानिक स्रोत (.gov.in / indiacode.nic.in):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {streamingSources.map((src, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white border border-stone-300 text-stone-700 font-medium shadow-2xs"
                  >
                    <span>🏛️</span>
                    <span className="truncate max-w-xs">{src.title || src.url}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Real-time streaming content chunk-by-chunk */}
          <div className="p-4 sm:p-5 bg-stone-50/60 rounded-xl border border-stone-200 text-stone-800 leading-relaxed text-sm font-['Yantramanav',sans-serif]">
            {streamingText ? (
              <div className="relative">
                <FormattedLegalContent content={streamingText} />
                <span className="inline-block w-2 h-4 ml-1 bg-amber-600 animate-pulse align-middle" />
              </div>
            ) : (
              <div className="flex items-center gap-3 py-8 justify-center text-stone-600 text-sm">
                <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <span>{streamingStatus || "आधिकारिक गजट व विधिक संहिताओं का विश्लेषण किया जा रहा है..."}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback loading indicator when loading but not streaming yet */}
      {isLoading && !isStreaming && (
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
      {result && !isStreaming && (
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
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    ⚠️ असत्यापित
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
                    {result.requiredDocuments.slice(0, 4).map((doc, idx) => (
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
          {result.generatedDraft && (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
              <div className="bg-amber-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-200" />
                  <h4 className="text-sm font-bold">
                    तैयार कानूनी शिकायत / FIR ड्राफ्ट (Ready-to-use Legal Draft)
                  </h4>
                  {hardFail.isHardFailed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                      ⚠️ असत्यापित
                    </span>
                  )}
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

              <div className="p-5 font-mono text-xs sm:text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap bg-stone-50/60 dark:bg-stone-800/60 leading-relaxed border-b border-stone-200 dark:border-stone-800 max-h-96 overflow-y-auto">
                {result.generatedDraft}
              </div>
              <div className="px-5 py-2 text-[11px] text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 flex items-center justify-between border-t border-stone-200 dark:border-stone-800">
                <span>* इस ड्राफ्ट में खाली स्थान [_____] को अपने सही विवरण व साक्ष्य संलग्न कर प्रस्तुत करें।</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">वर्तमान BNSS 2023 व BNS धाराओं पर आधारित</span>
              </div>
            </div>
          )}

          {/* 3. LEGAL PROVISIONS & STATUTORY DETAILS (कानूनी धाराएं व दंडात्मक उपधारा संदर्भ) */}
          <div className="bg-amber-50/70 dark:bg-stone-900/90 rounded-xl border-2 border-amber-300/80 dark:border-amber-700/60 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-800 dark:text-amber-400" />
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  लागू कानूनी धाराएं व वैधानिक संदर्भ (Statutory Reference — BNS / संहिता)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {result.legalSectionDetails?.lawType && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-amber-200/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    {result.legalSectionDetails.lawType}
                  </span>
                )}
                {hardFail.isHardFailed ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                    UNVERIFIED (असत्यापित) — वैधानिक साक्ष्य अपूर्ण
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-md font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    आधिकारिक कानून से सत्यापित
                  </span>
                )}
              </div>
            </div>

            {/* 4 Pillars of Legal Section: Section, Punishment, Fine (Universal Accuracy Engine Sub-clause priority) */}
            <div className="bg-white dark:bg-stone-900/90 rounded-lg p-4 border border-amber-200/90 dark:border-stone-800 shadow-2xs">
              <LegalSectionDisplay
                details={result.legalSectionDetails}
                applicableLawFallback={result.applicableLaw}
              />
            </div>

            {/* 4 Essential Breakdown Points for Legal Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div className="bg-white dark:bg-stone-900/90 rounded-lg p-3.5 border border-amber-200/90 dark:border-stone-800 space-y-1">
                <div className="font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                  <span>
                    {result.legalSectionDetails?.isStateLaw
                      ? "राज्य अधिनियम एवं धारा (State Act & Section):"
                      : "अधिनियम एवं धारा (Act & Section):"}
                  </span>
                </div>
                {result.legalSectionDetails?.state && (
                  <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    राज्य: {result.legalSectionDetails.state}
                  </div>
                )}
                <div className="text-sm font-bold text-stone-900 dark:text-white">
                  {result.legalSectionDetails?.actName || "भारतीय न्याय संहिता, 2023 / विशेष कानून"}
                </div>
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {result.legalSectionDetails?.sectionNumber || result.applicableLaw}
                </div>
                {result.legalSectionDetails?.sectionTitle && (
                  <div className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    विषय: {result.legalSectionDetails.sectionTitle}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-stone-900/90 rounded-lg p-3.5 border border-amber-200/90 dark:border-stone-800 space-y-1">
                <div className="font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Scale className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                  <span>कानून में यह प्रावधान है:</span>
                </div>
                <div className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">
                  {result.legalSectionDetails?.provisionGeneral ||
                    "इस विषय में सुसंगत अधिनियम के तहत वैधानिक प्रक्रिया व प्रावधान परिभाषित हैं।"}
                </div>
              </div>

              <div className="bg-white dark:bg-stone-900/90 rounded-lg p-3.5 border border-amber-200/90 dark:border-stone-800 space-y-1">
                <div className="font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>आपके मामले में यह लागू हो सकता है:</span>
                </div>
                <div className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">
                  {result.legalSectionDetails?.caseApplication ||
                    "नागरिक द्वारा बताए गए तथ्यों और परिस्थितियों के आधार पर यह लागू हो सकता है।"}
                </div>
              </div>

              <div className="bg-white dark:bg-stone-900/90 rounded-lg p-3.5 border border-amber-200/90 dark:border-stone-800 space-y-1">
                <div className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>यह तथ्य/परिस्थिति पर निर्भर है:</span>
                </div>
                <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/60 p-2 rounded border border-amber-300/80 dark:border-amber-800 leading-relaxed">
                  {result.legalSectionDetails?.factsDependence ||
                    "यह धारा/कानून मामले की परिस्थितियों पर निर्भर करता है।"}
                </div>
              </div>
            </div>
          </div>

          {/* Format B Website Content Box */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
            <div className="bg-stone-50 dark:bg-stone-800/80 px-5 py-3 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                  Justice Ji वेबसाइट कंटेंट (मानक Format B)
                </h4>
                {hardFail.isHardFailed && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    ⚠️ असत्यापित
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 font-semibold text-stone-700 dark:text-stone-200 cursor-pointer shadow-2xs transition-all"
                  title="पूरा टेक्स्ट कॉपी करें"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">{t("copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                      <span>{t("copyText")}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyHtml}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 font-semibold text-stone-700 dark:text-stone-200 cursor-pointer shadow-2xs transition-all"
                  title="HTML कोड कॉपी करें"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">{t("htmlCopied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                      <span>{t("copyHtml")}</span>
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
                        <span>{t("topicSaved")}</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5 text-white" />
                        <span>{t("addToTopics")}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Content Display */}
            <div className="p-5 sm:p-6 text-sm text-stone-800 dark:text-stone-100 leading-relaxed font-['Yantramanav',sans-serif] bg-white dark:bg-stone-900">
              <FormattedLegalContent
                content={result.formatBContent}
                isVerified={!hardFail.isHardFailed}
                failReason={hardFail.reason}
              />
            </div>
          </div>

          {/* Official Verification Sources & Unverified Notes (Rule 12 & 15) */}
          <div className="bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
              <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>सत्यापित आधिकारिक वेब स्रोत (Official Government & Legal Sources):</span>
              </div>
              <span className="text-stone-500 dark:text-stone-400">जांच तिथि: {result.verificationDate}</span>
            </div>

            {result.officialSources && result.officialSources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.officialSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-300 hover:border-amber-300 dark:hover:border-amber-700 transition-all font-medium text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                    <span className="truncate max-w-xs">{src.title || src.url}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 dark:text-stone-400">
                आधिकारिक विधिक संहिता (BNS/BNSS 2023 गजट) और राष्ट्रीय विधिक सेवा पोर्टल के अनुसार संकलित।
              </p>
            )}

            {result.unverifiedNote && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
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

      {/* 2. GEMINI-STYLE FLOATING BOTTOM SEARCH BAR (पेज के नीचे फिक्स्ड / स्टिकी) */}
      <div className="sticky bottom-2 sm:bottom-4 z-40 w-full max-w-4xl mx-auto px-1 sm:px-2 pt-2">
        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mb-2 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-2xl text-xs sm:text-sm text-red-700 flex items-center justify-between shadow-md animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expandable Location & Facts Popover / Drawer */}
        {showLocationFilters && (
          <div className="mb-2.5 p-3.5 sm:p-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-300 dark:border-stone-700 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-white">
                <MapPin className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>{t("locationDrawerTitle")}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationFilters(false)}
                className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 px-2 py-0.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t("stateLabel")}
                </label>
                <select
                  value={userState}
                  onChange={(e) => setUserState(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-xs focus:ring-1 focus:ring-amber-600"
                >
                  <option value="">{t("selectStatePlaceholder")}</option>
                  {INDIAN_STATES.map((st, i) => (
                    <option key={i} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t("districtLabel")}
                </label>
                <input
                  type="text"
                  value={userDistrict}
                  onChange={(e) => setUserDistrict(e.target.value)}
                  placeholder={t("districtPlaceholder")}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-xs focus:ring-1 focus:ring-amber-600 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t("factsLabel")}
                </label>
                <input
                  type="text"
                  value={userFacts}
                  onChange={(e) => setUserFacts(e.target.value)}
                  placeholder={t("factsPlaceholder")}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-xs focus:ring-1 focus:ring-amber-600 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={needDraft}
                  onChange={(e) => setNeedDraft(e.target.checked)}
                  className="w-4 h-4 text-amber-700 rounded border-stone-300 dark:border-stone-600 focus:ring-amber-600"
                />
                <span className="font-semibold text-stone-800 dark:text-stone-200 text-[11px]">
                  {t("autoDraftCheckbox")}
                </span>
              </label>

              {(userState || userDistrict || userFacts) && (
                <button
                  type="button"
                  onClick={() => {
                    setUserState("");
                    setUserDistrict("");
                    setUserFacts("");
                  }}
                  className="text-[11px] text-amber-800 dark:text-amber-400 hover:underline"
                >
                  {t("removeFilters")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Gemini-Style Main Input Capsule Bar */}
        <form
          id="gemini-search-form"
          onSubmit={handleSearchAndResearch}
          className="relative flex items-center bg-white dark:bg-stone-800 rounded-full border border-stone-300 dark:border-stone-700 shadow-lg hover:shadow-xl focus-within:shadow-xl focus-within:border-amber-600 focus-within:ring-3 focus-within:ring-amber-500/20 transition-all p-1.5 sm:p-2"
        >
          {/* Left Controls: Voice, Location Pill & Language Dropdown */}
          <div className="flex items-center gap-1 pl-1 shrink-0">
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

            {/* Location Filter Button with State / District Label and Alert Badge */}
            <button
              type="button"
              onClick={() => setShowLocationFilters((prev) => !prev)}
              title={userState ? `चुना हुआ राज्य: ${userState}${userDistrict ? `, ${userDistrict}` : ""}` : t("suggestedLocationTip")}
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                userState || userDistrict || userFacts
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                  : "bg-stone-100 dark:bg-stone-700/60 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span className="hidden sm:inline">
                {userState ? `${userState}${userDistrict ? ` • ${userDistrict}` : ""}` : t("locationButton")}
              </span>
              {(userState || userDistrict || userFacts) ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="hidden md:inline text-[10px] px-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-normal">
                  {t("optionalBadge")}
                </span>
              )}
            </button>

            {/* Language Selection Pill inside search bar */}
            <div className="relative inline-flex items-center">
              <Globe className="w-3 h-3 text-stone-400 dark:text-stone-500 absolute left-2 pointer-events-none" />
              <select
                aria-label="खोज भाषा / Search Language"
                value={currentLanguage.code}
                onChange={(e) => setLanguageByCode(e.target.value)}
                className="pl-6 pr-4 py-1 text-[11px] font-semibold bg-stone-100 dark:bg-stone-700/60 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600 rounded-full focus:outline-none cursor-pointer appearance-none"
                title="भाषा चुनें / Language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="dark:bg-stone-800">
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Central Textarea */}
          <textarea
            value={query}
            onFocus={handleQueryFocus}
            onKeyDown={handleQueryKeyDown}
            onBeforeInput={handleQueryBeforeInput}
            onPaste={handleQueryPaste}
            onChange={handleQueryChange}
            placeholder={t("searchPlaceholder")}
            rows={1}
            className="flex-1 bg-transparent px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base text-stone-900 dark:text-stone-100 focus:outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 font-medium resize-none max-h-24 leading-normal"
            required
          />

          {/* Right Controls: Clear and Search Button */}
          <div className="flex items-center gap-1 pr-0.5 shrink-0">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  isFreshInputPending.current = false;
                }}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                title={t("clearButton")}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Circular Search Button */}
            <button
              type="submit"
              disabled={isLoading || isSubmittingRef.current || !query.trim()}
              title={t("searchButton")}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:hover:bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Search className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </form>

        {/* Micro note below input */}
        <div className="text-center mt-1.5">
          <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 font-medium">
            Justice Ji विधिक सूचना प्रणाली • नई संहिताएं BNS / BNSS / BSA 2023 से 100% गजट-सत्यापित
            {!userState && (
              <span className="hidden sm:inline text-amber-700 dark:text-amber-400 ml-1.5 font-normal">
                (सुझाव: राज्य कानून या स्थानीय संशोधन के लिए 'स्थान' जोड़ सकते हैं)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
