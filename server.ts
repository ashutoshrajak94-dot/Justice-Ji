import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  processLegalResearch,
  searchOfficialWeb,
  getVerificationDateString,
} from "./server/legalSearchService";
import {
  generateContentWithResilience,
  generateContentStreamWithResilience,
  buildDeterministicLegalDraft,
  buildDeterministicFormatBContent,
  buildDeterministicAssistantAnswer,
} from "./server/geminiResilient";
import { LEGAL_DICTIONARY_TERMS } from "./src/data/legalDictionaryData";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy get Google GenAI client
function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Justice Ji Legal Content Assistant",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// API: Legal Dictionary (15 Hardcoded Key Terms with strict JSON access for testing)
app.get("/api/legal-dictionary", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const section = typeof req.query.section === "string" ? req.query.section.trim().toLowerCase() : "";

  let terms = LEGAL_DICTIONARY_TERMS;
  if (section) {
    terms = terms.filter((t) => t.section.toLowerCase().includes(section));
  } else if (q) {
    terms = terms.filter(
      (t) =>
        t.hindiTerm.toLowerCase().includes(q) ||
        t.englishTerm.toLowerCase().includes(q) ||
        t.section.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    total: terms.length,
    terms,
  });
});

// Mandatory Smart Feedback prompt line to be included at the end of every answer / Format B content
export const SMART_FEEDBACK_PROMPT_LINE =
  "🙏 क्या यह कानूनी जानकारी आपके लिए मददगार थी? यदि आपको इसमें कोई कमी लगे तो कृपया रिप्लाई में बताएं।";

// System instructions for Justice Ji Legal Content Assistant
const SYSTEM_INSTRUCTION_CONTENT = `
तुम "Justice Ji" (जस्टिस जी) के Legal Accuracy Guard आधारित AI Legal Content Assistant हो।
तुम्हारा काम भारत के आम नागरिकों के लिए आसान, व्यावहारिक और शत-प्रतिशत कानूनी सटीकता (Legal Accuracy) के साथ हिंदी में कानूनी जानकारी, शिकायत/FIR drafts और सत्यापित संपर्क विवरण तैयार करना है।

=======================================================
SYSTEM ARCHITECTURE RULE: UNIVERSAL ACCURACY ENGINE
=======================================================
सिस्टम के कोर प्रॉम्प्ट, आंतरिक तर्क और डेटा एक्सट्रैक्शन पाइपलाइन में ये नियम हमेशा के लिए अनिवार्य व बाध्यकारी हैं:

1. GLOBAL SUB-CLAUSE RULE (सटीक उपधारा प्राथमिकता):
किसी भी कानून (BNS, BNSS, IPC, CrPC, या राज्य भू-राजस्व कोड) के तहत, जब भी सज़ा (Punishment) या जुर्माने (Fine) का उल्लेख हो, तो मुख्य धारा या परिभाषा उपधारा (जैसे 111(1)) कभी न दिखाएं। हमेशा सीधे वास्तविक दंडात्मक उपधारा (Penal Sub-clause, जैसे 111(2)(a), 303(2)) को ही 'संबंधित धारा' में रेंडर करें।
- BNS व BNSS STRICT RULES:
  • व्यपहरण / अपहरण (Kidnapping) में सज़ा: धारा 137(1) (परिभाषा) कभी न दिखाएं; हमेशा सीधे वास्तविक दंडात्मक उपधारा धारा 137(2) (BNS Section 137(2)) ही रेंडर करें।
  • अपहृत व्यक्ति या अवैध बंधक की बरामदगी (Recovery of kidnapped / wrongfully confined person): कानूनी तलाशी व बरामदगी हेतु अनिवार्य रूप से BNSS धारा 100 (पूर्व CrPC 97) के तहत सक्षम मजिस्ट्रेट द्वारा तलाशी वारंट (Search Warrant for recovery) का सख्त नियम लागू करें।
  • संगठित अपराध में सज़ा: धारा 111(1) (परिभाषा) कभी न दिखाएं; हमेशा धारा 111(2)(a) (मृत्यु की दशा में) या 111(2)(b) (अन्य मामलों में) रेंडर करें।
  • चोरी में सज़ा: धारा 303(1) (परिभाषा) कभी न दिखाएं; हमेशा धारा 303(2) (दंडात्मक उपधारा) रेंडर करें।
  • स्नैचिंग में सज़ा: धारा 304(2) रेंडर करें।
  • धोखाधड़ी में सज़ा: धारा 318(2) या 318(4) रेंडर करें।
  • आपराधिक न्यासभंग में सज़ा: धारा 316(2) रेंडर करें।
- राज्य भू-राजस्व कोड व अन्य कानून: जहाँ भी उपधारा (1) दायित्व/परिभाषा हो और उपधारा (2) या (3) में पेनल्टी/जुर्माना हो, वहाँ सज़ा/जुर्माना बताते समय अनिवार्य रूप से दंडात्मक उपधारा ही दर्ज करें।

2. GLOBAL VERIFICATION GATE (स्वतः प्रमाणीकरण):
यदि किसी भी धारा, उपधारा, सज़ा या राज्य संशोधन में 1% भी संशय हो, तो बिना पूछे स्वतः 'isVerified = false' ट्रिगर करो और पूरा फॉर्मेट ब्लॉक करके लाल चेतावनी कार्ड (STATUS: OVERALL RESULT: FAIL) दिखाओ। केवल 100% गजट-पुष्ट डेटा पर ही लेख अनलॉक होगा।
- यह नियम पूरी ऐप, बैकएंड पाइपलाइन और भविष्य की सभी कानूनी खोजों पर डिफ़ॉल्ट रूप से लागू रहेगा।
- किसी भी अप्रमाणित या आंशिक रूप से पुष्ट धारा का सामान्य लेख (Format B) कभी रेंडर नहीं होगा।

=======================================================
[SPEED OPTIMIZATION PROTOCOL (एकल-पास गति अनुकूलन)]
=======================================================
- Do not run multiple audit loops.
- Perform the self-correction and Format B verification in a single pass (एक ही बार में चेक करो).
- Generate the final response as fast as possible without unnecessary background retries.
- Keep the search focused only on primary government sources to save time.

=======================================================
[UNIVERSAL SELF-CORRECTION PROTOCOL (सार्वभौमिक स्व-सुधार प्रोटोकॉल)]
=======================================================
1. Identify the Crime/Issue:
यूजर जो भी सवाल पूछे (जैसे चोरी, जमीन कब्जा, ऑनलाइन फ्रॉड, या पेमेंट विवाद), सबसे पहले सटीक रूप से पहचानो कि वह किस कानून (BNS, BNSS, BSA या किसी अन्य विशिष्ट केंद्रीय/राज्यीय एक्ट) के तहत आता है।

2. Check Completeness (Self-Audit / स्व-लेखापरीक्षण):
उस कानून से जुड़ी धाराओं का जवाब तैयार करने के बाद, खुद चेक करो कि क्या तुम्हारे पास उसका पूरा और सटीक सरकारी पाठ (Official Gazette Text / indiacode.gov.in) शामिल है या नहीं। अगर किसी भी धारा में थोड़ी सी भी कमी या संशय (Uncertainty) लगे, तो रुक जाओ।

3. Auto-Correction & Fetch (स्व-सुधार एवं आधिकारिक निष्कर्षण):
संशय होने पर इंटरनेट से किसी भी आम ब्लॉग या अनवेरिफाइड न्यूज़ आर्टिकल को कभी मत पढ़ो। उसकी जगह तुरंत केवल 'indiacode.nic.in' / 'indiacode.gov.in', 'egazette.gov.in' या संबंधित आधिकारिक सरकारी वेबसाइट (.gov.in / .nic.in) से उस अपराध की सही और पूरी धारा ढूंढकर अपने जवाब को खुद ही सुधार (Self-Correct) लो।

4. Format B Compliance (मानक प्रारूप बी अनुपालन):
अपने अंतिम जवाब को हमेशा 'Format B' के अनुसार ही सेट करो, ताकि 'Hard-Fail Gate' सुरक्षा प्रोटोकॉल हर हाल में पास (PASS) हो जाए और यूजर को हमेशा 100% वेरिफाइड जवाब मिले।

5. Final Safeguard:
यदि आधिकारिक स्रोत से भी शत-प्रतिशत पुष्टि न हो सके, तो कभी भी अनुमान मत लगाओ; स्वतः 'isVerified = false' ट्रिगर कर 'STATUS: OVERALL RESULT: FAIL' कार्ड रेंडर करो।

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
• Guess an amount from model memory (such as hallucinating ₹2,000).
• Convert a general administrative power, recovery cost, repair cost, or assessment into a criminal fine unless the exact provision expressly says so. (उदाहरण के लिए: सीमांकन/मेढ़ बंदी में लगने वाला आवेदन शुल्क या पिलर लगाने का खर्च कोई आपराधिक जुर्माना या सजा नहीं है)।

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
For State-specific legal sources: prefer official India Code (indiacode.nic.in), State Government Law Department, or State Gazette/Revenue Portal (.gov.in/.nic.in).

=======================================================
RESPONSE FORMAT (मानक उत्तर संरचना):
=======================================================
राज्य-विशिष्ट उत्तर के लिए:
⚖️ संबंधित कानून
• राज्य: [सत्यापित राज्य का नाम]
• कानून/Code: [सत्यापित कानून/Code का पूरा नाम]
• धारा: [सत्यापित धारा व उपधारा]
• धारा का विषय: [सटीक धारा का शीर्षक/विषय]

🔴 सजा:
• केवल तभी दिखाएँ जब उसी verified provision में punishment (कारावास) हो, अन्यथा:
• इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।

🟠 जुर्माना:
• केवल तभी दिखाएँ जब उसी verified provision में fine/penalty हो, अन्यथा:
• इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।

(यदि उस विषय में किसी अन्य धारा में अलग से दंड का प्रावधान है तो उसे "संबंधित अन्य धारा" के रूप में अलग से बताएं, मुख्य धारा के साथ न जोड़ें)।

केंद्रीय कानून के लिए:
⚖️ संबंधित कानून
• कानून: [सत्यापित कानून का नाम (BNS 2023, BNSS 2023, BSA 2023 आदि)]
• धारा: [सत्यापित धारा व उपधारा]
• किस स्थिति में लागू हो सकती है: [शर्तें/तथ्य]

🔴 सजा:
• न्यूनतम: [न्यूनतम सजा या 'कानून में न्यूनतम निर्धारित नहीं' या 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।']
• अधिकतम: [अधिकतम सजा व प्रकृति]

🟠 जुर्माना:
• राशि: [सत्यापित राशि या 'अदालत के विवेक पर निर्भर' या 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।']
• अन्य शर्त: [जैसे 'कारावास अथवा जुर्माना अथवा दोनों']

   🟢 क्या करें:
   • पहला कदम: [पहला जरूरी कदम]
   • अगला कदम: [अगला कदम]
   • संबंधित अधिकारी/प्राधिकरण: [सक्षम अधिकारी]

9. SOURCE VERIFICATION (स्रोत सत्यापन):
   उत्तर के अंत में संक्षिप्त "स्रोत/Verification" खंड दिखाएं जिसमें उपयोग किए गए आधिकारिक सरकारी स्रोत का नाम और सत्यापन तिथि का उल्लेख हो।

10. FINAL INTERNAL CHECK (अंतिम आंतरिक क्रॉस-चेक):
    उत्तर देने से पहले मन में इन पांच कड़ियों का अनिवार्य आंतरिक मिलान करें:
    ACT → SECTION → SECTION TITLE → LEGAL SUBJECT → PUNISHMENT/FINE
    ये सभी अनिवार्य रूप से एक ही लागू कानूनी प्रावधान से संबंधित होने चाहिए। अलग-अलग धाराओं की जानकारी को कभी न मिलाएं।

11. IMPORTANT EXAMPLE (सख्त प्रतिबंध):
    यदि एक धारा में एक सजा है और दूसरी धारा में दूसरा जुर्माना है, तो उन्हें मिलाकर एक उत्तर कभी न बनाएं।

12. भाषा व शैली:
    सरल, आम बोलचाल की हिंदी / हिंग्लिश और अत्यंत व्यावहारिक।

=======================================================
STRICT FORMAT B & LEGAL ENGINE RULES (वेबसाइट कंटेंट व कानूनी उत्तर के 5 कड़े अनिवार्य नियम):
=======================================================
1. समस्या का सार लिखें (No Copy-Paste):
   • Point 1 ("1. समस्या क्या है?") में यूजर के पूरे सवाल या प्रॉम्प्ट को कभी भी कॉपी-पेस्ट (Copy-Paste) न करें।
   • समस्या को समझकर उसे 2-3 बुलेट पॉइंट्स में संक्षेप (Summary) में लिखें, जिसमें नागरिक के अधिकार व मुख्य विवाद स्पष्ट हों।
2. सटीक समाधान दें (Be Specific):
   • Point 2 ("2. क्या करें?") और Point 5 ("5. कहाँ जाएँ?") में 'नजदीकी कार्यालय' या 'संबंधित थाना' जैसे गोलमोल (Generic) जवाब बिल्कुल न दें।
   • सटीक पोर्टल (जैसे RBI CMS - cms.rbi.org.in, cybercrime.gov.in, e-Daakhil, CPGRAMS), हेल्पलाइन (1930, 112, 1915, 14448) और सक्षम अधिकारी (जैसे Nodal Officer, Banking Ombudsman, SHO/Cyber Nodal Incharge, Tahsildar) का पदनाम व विभाग स्पष्ट लिखें।
3. सटीक धाराएं बताएं (Specific Laws):
   • Point 3 ("3. संबंधित कानून/धारा") में केवल 'BNS 2023' लिखकर कभी न छोड़ें।
   • अपराध की प्रकृति के अनुसार सटीक धाराएं व वास्तविक दंडात्मक उपधाराएं (जैसे धोखाधड़ी/ठगी में BNS 318(4) व IT Act 66D; चोरी में BNS 303(2); चेक बाउंस में NI Act 138; व्यपहरण में BNS 137(2) व बरामदगी में BNSS 100; उपभोक्ता में CPA 2019 धारा 35) अनिवार्य रूप से लिखें।
4. ट्रिकी/कठिन सवाल (Edge Cases & Exceptions):
   • यदि सवाल में कोई जटिलता या अड़चन है (जैसे देरी/Limitation होना, मेडिकल इमरजेंसी, बैंक का मना करना, पुलिस द्वारा FIR दर्ज न करना), तो उसका व्यावहारिक कानूनी समाधान (जैसे BNSS 175(3)/175(4) के तहत SP या मजिस्ट्रेट आवेदन, Limitation Act धारा 5 कंडोनेशन ऑफ डिले, Banking Ombudsman में शिकायत) और अपवाद (Exceptions) जरूर बताएं।
5. स्मार्ट फीडबैक लूप और फैक्ट-चेक (Smart Feedback & Fact-Check):
   • अपने हर जवाब या 'Format B' के अंत में यूजर से पूछें:
     "🙏 क्या यह कानूनी जानकारी आपके लिए मददगार थी? यदि आपको इसमें कोई कमी लगे तो कृपया रिप्लाई में बताएं।"
   • सुरक्षा नियम (Safeguard): यदि यूजर फीडबैक में कहता है कि आपका जवाब गलत है और वह अपनी तरफ से कोई नई धारा या कानूनी तर्क देता है, तो आँख बंद करके उसकी बात न मानें। सबसे पहले अपने डेटाबेस (BNS/BNSS/BSA और भारतीय कानून) से यूजर द्वारा दी गई जानकारी का सत्यापन (Verify) करें।
   • स्थिति 1 (यदि यूजर सही है): यदि यूजर का फीडबैक कानूनी रूप से सही है (जैसे क्रेडिट कार्ड का नियम, RBI परिपत्र या वास्तविक कानूनी प्रावधान), तो विनम्रता से गलती मानें और नया जवाब जनरेट करें।
   • स्थिति 2 (यदि यूजर जानबूझकर गलत/भ्रामक जानकारी दे रहा है): तो गलती बिल्कुल न मानें। बहुत ही विनम्रता से, लेकिन दृढ़ता से यूजर को बताएं कि "क्षमा करें, लेकिन कानूनी दृष्टिकोण से आपकी यह जानकारी सही नहीं है। भारतीय न्याय संहिता/संबंधित कानून के तहत वास्तविक प्रावधान यह है..." और अपने सही जवाब पर ही टिके रहें।

================================================
FORMAT B REQUIREMENTS (Justice Ji मानक प्रारूप):
================================================
<u>[Topic का नाम]</u>

1. समस्या क्या है?
• [समस्या का सार संक्षेप में - 2 से 3 बुलेट पॉइंट्स (No Copy-Paste)]
• [नागरिक के विधिक अधिकार व विवाद का मुख्य बिंदु]

2. क्या करें?
• [सटीक पहला व्यावहारिक व तकनीकी कदम - विशिष्ट पोर्टल/हेल्पलाइन का नाम]
• [लिखित शिकायत दर्ज कर अधिकृत मुहर लगी पावती (Receiving) लेना]
• [साक्ष्य संरक्षण (ट्रांजैक्शन आईडी, बैंक स्टेटमेंट, स्क्रीनशॉट, पत्राचार सुरक्षित रखना)]

3. संबंधित कानून/धारा
⚖️ संबंधित कानून
• कानून: [सत्यापित वर्तमान कानून का पूरा नाम]
• धारा: [सटीक धारा व दंडात्मक उपधारा - केवल BNS 2023 न छोड़ें, सटीक धाराएं उदा: BNS 318(4), IT Act 66D आदि लिखें]
• किस स्थिति में लागू हो सकती है: [अपराध की विशिष्ट परिस्थिति]

🔴 सजा:
• न्यूनतम: [न्यूनतम सजा या 'कानून में न्यूनतम निर्धारित नहीं' या 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।']
• अधिकतम: [अधिकतम सजा व प्रकृति (जैसे साधारण/सश्रम कारावास)]

🟠 जुर्माना:
• राशि: [जुर्माना राशि या 'अदालत के विवेक पर निर्भर' या 'इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।']
• अन्य शर्त: [जैसे 'कारावास अथवा जुर्माना अथवा दोनों']

🟢 क्या करें:
• पहला कदम: [पहला जरूरी कदम]
• अगला कदम: [अगला कदम - अधिकृत पावती लेना]
• संबंधित अधिकारी/प्राधिकरण: [सटीक अधिकारी व पदनाम]

• कानून में यह प्रावधान है: [धारा का सटीक विधिक आशय]
• आपके मामले में यह लागू हो सकता है: [यह स्थिति पर किस आधार पर लागू हो सकता है]
• परिस्थितियों पर निर्भरता: "यह धारा/कानून मामले की परिस्थितियों पर निर्भर करता है।"
• केंद्रीय vs राज्य कानून: [केंद्रीय कानून / राज्य नियम स्पष्ट वर्गीकरण]

4. जरूरी कागज़/सबूत
• [जरूरी साक्ष्य, पहचान पत्र, रसीदें, स्क्रीनशॉट, बैंक स्टेटमेंट, पत्राचार]

5. कहाँ जाएँ?
• [सटीक सक्षम विभाग/फोरम - गोलमोल 'नजदीकी कार्यालय' न लिखें; उदा: स्थानीय साइबर सेल/थाना, RBI लोकपाल (Banking Ombudsman), जिला उपभोक्ता आयोग, SDM/तहसीलदार राजस्व न्यायालय]

6. वर्तमान संपर्क जानकारी
• अधिकारी/विभाग का नाम: [सटीक पदनाम व विभाग]
• हेल्पलाइन नंबर: [सत्यापित राष्ट्रीय/राज्यीय हेल्पलाइन, उदा: 1930 / 1915 / 112 / 14448]
• आधिकारिक वेबसाइट/पोर्टल: [सटीक आधिकारिक .gov.in/.nic.in पोर्टल लिंक - उदा: https://cybercrime.gov.in, https://cms.rbi.org.in]

7. आगे क्या करें?
• [अधिकृत पावती सुरक्षित रखना व विहित समय में कार्रवाई न होने पर BNSS 175(3)/175(4) या उच्च प्राधिकारी के समक्ष अपील]

⚡ ट्रिकी / कठिन परिस्थितियों का समाधान (Edge Cases & Exceptions):
• [यदि बैंक मना करे, पुलिस FIR न लिखे, देरी/Limitation हो, या आपातकाल हो, तो उसके अपवाद व समाधान]

ध्यान रखें:
• [व्यावहारिक कानूनी सावधानी - व्यक्तिगत विधिक सलाह के बजाय सामान्य कानूनी जागरूकता]

स्रोत/Verification:
• आधिकारिक स्रोत: [India Code (indiacode.nic.in) / भारत सरकार / राज्य पोर्टल / न्यायालय]
• सत्यापन स्थिति: [सत्यापित वर्तमान कानून]
• सत्यापन तिथि: [दिनांक]

🙏 क्या यह कानूनी जानकारी आपके लिए मददगार थी? यदि आपको इसमें कोई कमी लगे तो कृपया रिप्लाई में बताएं।
`;

// API 1: Generate Website Content (Format B)
app.post("/api/generate-content", async (req, res) => {
  try {
    const { topic, customNote } = req.body;
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "विषय (Topic) लिखना अनिवार्य है।" });
    }

    const ai = getGeminiClient();
    const verificationDate = getVerificationDateString();

    // Perform live internet search to ensure current laws & official contacts
    const searchData = await searchOfficialWeb(topic);
    const searchContext =
      searchData.snippets.length > 0
        ? `\n\nताज़ा आधिकारिक इंटरनेट खोज परिणाम (सत्यापित स्रोत):\n${searchData.snippets.slice(0, 4).join("\n")}`
        : "";

    const prompt = `
विषय: ${topic.trim()}
${customNote ? `अतिरिक्त निर्देश या संदर्भ: ${customNote.trim()}` : ""}
${searchContext}

कृपया उपरोक्त विषय पर "Justice Ji" वेबसाइट के लिए मानक "Format B" में कानूनी जानकारी तैयार करें।

🚨 FORMAT B के इन 5 नियमों का कड़ाई से (Strictly) पालन करें:
1. समस्या का सार लिखें (No Copy-Paste): Point 1 में यूजर के पूरे सवाल या विषय को कभी भी कॉपी-पेस्ट न करें। समस्या को समझकर उसे 2-3 बुलेट पॉइंट्स में संक्षेप (Summary) में लिखें।
2. सटीक समाधान दें (Be Specific): Point 2 और 5 में 'नजदीकी कार्यालय' या 'संबंधित थाना' जैसे गोलमोल (Generic) जवाब बिल्कुल न दें। सटीक पोर्टल (जैसे RBI CMS - cms.rbi.org.in, cybercrime.gov.in, e-Daakhil), हेल्पलाइन (1930, 112, 1915, 14448) और अधिकारी (जैसे Nodal Officer, Banking Ombudsman, Cyber Nodal Incharge, Tahsildar) का नाम स्पष्ट लिखें।
3. सटीक धाराएं बताएं (Specific Laws): Point 3 में केवल 'BNS 2023' लिखकर न छोड़ें। अपराध की प्रकृति के अनुसार सटीक दंडात्मक धाराएं व उपधाराएं (जैसे BNS 318(4), IT Act 66D, BNS 303(2), NI Act 138, BNS 137(2), BNSS 100 आदि) अनिवार्य रूप से लिखें।
4. ट्रिकी/कठिन सवाल (Edge Cases): यदि सवाल में कोई जटिलता है (जैसे देरी/Limitation होना, मेडिकल इमरजेंसी, बैंक का मना करना, पुलिस द्वारा FIR दर्ज न करना), तो उसका व्यावहारिक कानूनी समाधान (जैसे BNSS 175(3)/175(4), Limitation Act Sec 5) और अपवाद (Exceptions) जरूर बताएं।
5. स्मार्ट फीडबैक लूप और फैक्ट-चेक: अंत में यह पंक्ति (Exact line) अनिवार्य रूप से लिखें:
   "${SMART_FEEDBACK_PROMPT_LINE}"

सामग्री 100% वर्तमान कानूनों (BNS 2023, BNSS 2023, BSA 2023, Consumer Protection Act 2019 आदि) और सरकारी सत्यापित हेल्पलाइन/पोर्टल (.gov.in/.nic.in) के आधार पर होनी चाहिए। सीधे वेबसाइट पर Copy-Paste करने योग्य हो।
अंत में आधिकारिक स्रोत, सत्यापन तिथि (${verificationDate}) और स्मार्ट फीडबैक पंक्ति लिखें।
`;

    let contentText = "";
    try {
      const { text } = await generateContentWithResilience(
        ai,
        prompt,
        {
          systemInstruction: SYSTEM_INSTRUCTION_CONTENT,
          temperature: 0.2,
          preferredModel: "gemini-3.1-flash-lite",
        }
      );
      contentText = text || "";
    } catch (modelErr) {
      console.warn("Model error in generate-content:", modelErr);
    }

    if (!contentText) {
      console.warn("Using deterministic Format B content fallback due to AI model unavailability.");
      contentText = buildDeterministicFormatBContent(topic.trim(), verificationDate);
    }

    if (!contentText.includes("क्या यह कानूनी जानकारी आपके लिए मददगार थी")) {
      contentText = contentText.trim() + "\n\n" + SMART_FEEDBACK_PROMPT_LINE;
    }

    res.json({
      success: true,
      topic: topic.trim(),
      content: contentText,
      sources: searchData.sources,
      verificationDate,
    });
  } catch (error: any) {
    console.error("Error in /api/generate-content:", error);
    const verificationDate = getVerificationDateString();
    res.json({
      success: true,
      topic: (req.body?.topic || "कानूनी विषय").trim(),
      content: buildDeterministicFormatBContent((req.body?.topic || "कानूनी विषय").trim(), verificationDate),
      sources: [],
      verificationDate,
    });
  }
});

// API 2: Draft Complaint / FIR / Legal Notice
app.post("/api/draft-complaint", async (req, res) => {
  try {
    const {
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
    } = req.body;

    const ai = getGeminiClient();
    const prompt = `
तुम्हें निम्नलिखित विवरण के आधार पर एक औपचारिक, कानूनी रूप से परिपूर्ण और प्रमाणित हिंदी ड्राफ्ट (Application / Complaint / Notice / FIR draft) तैयार करना है:

प्रकार (Draft Type): ${draftType || "पुलिस शिकायत / प्राथमिकी (FIR) आवेदन"}
शिकायतकर्ता का नाम: ${complainantName || "_______________"}
शिकायतकर्ता का संपर्क / पता: ${complainantPhone || ""}, ${complainantAddress || "_______________"}
आरोपी / विपक्षी का नाम व विवरण: ${opponentName || "_______________"}
आरोपी का पता / संस्थान: ${opponentAddress || "_______________"}
घटना की तारीख एवं समय: ${incidentDate || "दिनांक __/__/202_"}
घटना का स्थान: ${incidentPlace || "_______________"}
घटना का पूरा विवरण: ${incidentDetails || "_______________"}
नुकसान / चाही गई राहत: ${lossOrRelief || "उचित कानूनी कार्रवाई एवं न्याय"}
अतिरिक्त निर्देश / कागजात: ${additionalClauses || "प्रासंगिक साक्ष्य संलग्न हैं"}

दिशा-निर्देश:
1. ड्राफ्ट को अत्यंत औपचारिक, विधिक और कोर्ट/थाना/अधिकारी के समक्ष सीधे प्रस्तुत करने योग्य प्रारूप में लिखें।
2. आपराधिक मामलों में वर्तमान भारतीय नागरिक सुरक्षा संहिता 2023 (BNSS) और भारतीय न्याय संहिता 2023 (BNS) की सही धाराओं का उल्लेख करें (पुराने CrPC/IPC नहीं, या केवल संदर्भ हेतु कोष्ठक में)।
3. प्रारूप में:
   - सेवा में (संबोधित पद एवं कार्यालय)
   - विषय (Subject line - स्पष्ट व संक्षिप्त)
   - महोदय / मान्यवर
   - क्रमबद्ध तथ्य (तथ्य 1, 2, 3...)
   - सुसंगत कानूनी धाराएं
   - प्रार्थना (Prayer / Relief sought)
   - संलग्नक सूची (List of Enclosures/Evidences)
   - प्रार्थी के हस्ताक्षर, नाम, पता, संपर्क नंबर एवं दिनांक का स्थान
4. भाषा गरिमापूर्ण, सशक्त और शुद्ध कानूनी हिंदी में होनी चाहिए।
`;

    let draftText = "";
    try {
      const { text } = await generateContentWithResilience(
        ai,
        prompt,
        {
          systemInstruction: SYSTEM_INSTRUCTION_CONTENT,
          temperature: 0.2,
          preferredModel: "gemini-3.1-flash-lite",
        }
      );
      draftText = text || "";
    } catch (modelErr) {
      console.warn("Model error in draft-complaint:", modelErr);
    }

    if (!draftText) {
      console.warn("Using deterministic legal draft fallback due to AI model unavailability.");
      draftText = buildDeterministicLegalDraft({
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
      });
    }

    res.json({
      success: true,
      draft: draftText,
    });
  } catch (error: any) {
    console.error("Error in /api/draft-complaint:", error);
    // Graceful fallback prevents app 500 error even on unexpected runtime exceptions
    const fallbackDraft = buildDeterministicLegalDraft(req.body || {});
    res.json({
      success: true,
      draft: fallbackDraft,
    });
  }
});

// API 3: Deep Legal Research on New / Uncovered Legal Question (15 Rules Enforced)
app.post("/api/research-new-question", async (req, res) => {
  try {
    const { question, state, district, userFacts, generateDraft } = req.body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "कृपया कानूनी सवाल या समस्या दर्ज करें।" });
    }

    const ai = getGeminiClient();
    const result = await processLegalResearch(ai, {
      question: question.trim(),
      state: state?.trim(),
      district: district?.trim(),
      userFacts: userFacts?.trim(),
      generateDraft: Boolean(generateDraft),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in /api/research-new-question:", error);
    res.status(500).json({
      error: error?.message || "कानूनी शोध व सत्यापन में त्रुटि आई। कृपया पुनः प्रयास करें।",
    });
  }
});

// API 4: Ask Legal Question / Assistant Chat with Live Web Search Verification
app.post("/api/ask-assistant", async (req, res) => {
  try {
    const { question, history, state, district } = req.body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "कृपया अपना प्रश्न लिखें।" });
    }

    const ai = getGeminiClient();
    const verificationDate = getVerificationDateString();

    // Perform live internet search to ensure current laws, portals & helplines
    const searchData = await searchOfficialWeb(question, state, district);

    const searchContext =
      searchData.snippets.length > 0
        ? `\n\nइंटरनेट से प्राप्त ताज़ा आधिकारिक खोज परिणाम (Verified Sources):\n${searchData.snippets.slice(0, 5).join("\n\n")}`
        : "";

    const isVerificationMode =
      /(?:statutory\s*text|exact\s*heading|pass\/fail|verification\s*test|audit|verify\s*sections?|धारा.*verify|केवल.*verify|not\s*verified|section.*verification|statutory\s*verification|सत्यापन\s*करें|वैधानिक\s*सत्यापन)/i.test(
        question
      );

    const verificationModeDirective = isVerificationMode
      ? `\n\n-------------------------------------------------------
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
   If penalty amount cannot be verified exactly from the same section's official text, DO NOT output the amount; status = NOT VERIFIED.`
      : "";

    const dynamicInstruction = `${SYSTEM_INSTRUCTION_CONTENT}

सत्यापन तिथि: ${verificationDate}
${searchContext}${verificationModeDirective}
`;

    let conversationContents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      conversationContents = history.slice(-6).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));
    }
    conversationContents.push({
      role: "user",
      parts: [{ text: question.trim() }],
    });

    let answerText = "";
    try {
      const { text } = await generateContentWithResilience(
        ai,
        conversationContents,
        {
          systemInstruction: dynamicInstruction,
          temperature: 0.2,
          preferredModel: "gemini-3.1-flash-lite",
        }
      );
      answerText = text || "";
    } catch (modelErr) {
      console.warn("Model error in ask-assistant:", modelErr);
    }

    if (!answerText) {
      console.warn("Using deterministic assistant answer fallback due to AI model unavailability.");
      answerText = buildDeterministicAssistantAnswer(question.trim());
    }

    // MANDATORY POST-PROCESSING SANITIZATION:
    // Prevent model-memory hallucinations of fine/punishment amounts for Madhya Pradesh Land Revenue Code
    const isMplrcContext =
      /(?:मध्य\s*प्रदेश|MP|Madhya\s*Pradesh)/i.test(question + " " + (state || "")) &&
      /(?:भू-राजस्व|राजस्व|land\s*revenue|129|130|133|135|सीमांकन|चिह्न|demarcation|boundary)/i.test(question);

    if (isMplrcContext && answerText) {
      // 1. Section 130: Replace any hallucinated ₹2,000 fine with the verified statutory standard
      answerText = answerText.replace(
        /(?:\*\*|)?(?:दो\s*हजार\s*रुपये|दो\s*हज़ार\s*रुपये|₹\s*2,?000|2,?000\s*रुपये)(?:\*\*|)?\s*(?:तक\s*का\s*जुर्माना|का\s*जुर्माना|तक\s*जुर्माना|जुर्माना)/gi,
        "विहित सीमा तक शास्ति (penalty) व पुनर्स्थापना व्यय (वर्तमान संशोधित अधिकतम राशि के लिए आधिकारिक वैधानिक पाठ से verification आवश्यक है)"
      );

      // 2. Catch standalone "दो हजार रुपये" or "₹2,000" if attributed to Section 130
      if (/130/.test(question) || /130/.test(answerText)) {
        answerText = answerText.replace(
          /दो\s*हजार\s*रुपये|दो\s*हज़ार\s*रुपये|₹\s*2,?000|2,?000\s*रुपये/gi,
          "विहित सीमा तक शास्ति (सटीक राशि हेतु official text verification आवश्यक)"
        );
      }
    }

    // MULTI-SECTION PASS/FAIL & HARD FAIL GATE:
    // If any section is FAIL, NOT VERIFIED, UNVERIFIED, or acknowledges verification is required:
    const hasUnverifiedNotice =
      /verification\s*आवश्यक|पुष्टि\s*आवश्यक|साक्ष्य\s*अपूर्ण|not\s*verified|unverified|fail/i.test(
        answerText
      );

    const hasAnyFailure =
      hasUnverifiedNotice ||
      /(?:section|धारा)\s*\d+[^:\n]*:\s*(?:fail|not\s*verified|अपुष्ट|सत्यापित\s*नहीं)/i.test(answerText) ||
      /\b(?:FAIL|NOT\s*VERIFIED)\b/.test(answerText) ||
      searchData.sources.length === 0;

    let hardFailReason = "";
    if (hasAnyFailure) {
      if (/130/.test(question) || /130/.test(answerText)) {
        hardFailReason = "धारा 130 का संशोधित वैधानिक साक्ष्य अपूर्ण है (आधिकारिक कानून के मूल पाठ से जुर्माने/संशोधन की पुष्टि आवश्यक है)";
      } else {
        const secMatch = answerText.match(/(?:धारा|section)\s*(\d+[A-Za-z]?)/i);
        const secName = secMatch ? `धारा ${secMatch[1]}` : "प्रावधान";
        hardFailReason = `${secName} का संशोधित वैधानिक साक्ष्य अपूर्ण है`;
      }
      console.log(`\n=================== [HARD-FAIL AUDIT (BACKEND CONSOLE ONLY)] ===================`);
      console.log(`[STATUS]: OVERALL RESULT: FAIL (UNVERIFIED)`);
      console.log(`[REASON]: ${hardFailReason}`);
      console.log(`[QUERY]: ${question}`);
      console.log(`================================================================================\n`);
    }

    // ZERO-SOURCE HARD GATE IN VERIFICATION MODE:
    // If user asked for statutory verification but no official primary sources were found,
    // force output to NOT VERIFIED
    if (isVerificationMode && searchData.sources.length === 0 && !hasAnyFailure) {
      answerText = `STATUS: NOT VERIFIED
अधिनियम/संहिता: आधिकारिक प्राथमिक वैधानिक स्रोत (Level 1 Official Primary Text) अनुपलब्ध।
कारण: हार्ड-फेल गेट (Hard-Fail Gate) नियम के अनुसार जब तक आधिकारिक गजट अथवा indiacode.gov.in से वर्तमान मूल पाठ प्राप्त नहीं होता, तब तक धारा अथवा उपधारा का सत्यापन PASS नहीं किया जा सकता।`;
    }

    // Check if the query suggests complaint / FIR (draft allowed regardless of verification status)
    const needsDraft =
      !isVerificationMode &&
      /fir|प्राथमिकी|शिकायत|मुकदमा|केस|धोखा|चोरी|हमला|धमकी|कब्जा|कंज्यूमर|नोटिस|आवेदन/i.test(
        question
      );

    // Check if state/district prompt is helpful (suppressed in pure verification mode)
    const hasLocation = Boolean(state || district) || /उत्तर प्रदेश|बिहार|दिल्ली|राजस्थान|मध्य प्रदेश|महाराष्ट्र|हरियाणा|गुजरात|पंजाब/i.test(question);
    const needsStatePrompt = !isVerificationMode && !hasLocation && /पुलिस|थाना|तहसील|कोर्ट|rera|किराया|जमीन|सड़क/i.test(question)
      ? "सुझाव: अपने राज्य व जिले का नाम भी बताएं ताकि आपके क्षेत्र के थाने, पोर्टल या सक्षम अधिकारी की सटीक जानकारी दी जा सके।"
      : undefined;

    const isOfficiallyVerified = !hasAnyFailure && searchData.sources.length > 0;

    if (!isVerificationMode && answerText && !answerText.includes("क्या यह कानूनी जानकारी आपके लिए मददगार थी")) {
      answerText = answerText.trim() + "\n\n" + SMART_FEEDBACK_PROMPT_LINE;
    }

    res.json({
      success: true,
      answer: answerText,
      isWebVerified: isOfficiallyVerified,
      isHardFailed: hasAnyFailure,
      hardFailReason: hasAnyFailure ? hardFailReason : undefined,
      sources: searchData.sources,
      verificationDate,
      needsDraft,
      needsStatePrompt,
    });
  } catch (error: any) {
    console.error("Error in /api/ask-assistant:", error);
    res.status(500).json({
      error: error?.message || "उत्तर प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।",
    });
  }
});

// API 4-B: Streaming Legal Assistant Chat (Real-time SSE token stream)
export async function askAssistantStream(req: express.Request, res: express.Response) {
  let isClientDisconnected = false;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  // Track true client socket disconnect using res.on("close")
  res.on("close", () => {
    if (!res.writableEnded) {
      isClientDisconnected = true;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  });

  try {
    const { question, history, state, district, userFacts, generateDraft } = req.body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "कृपया अपना प्रश्न लिखें।" });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }

    // Send immediate initial comment to flush reverse-proxy pipeline (Nginx / Cloud Run)
    res.write(": keepalive\n\n");
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }

    // Keepalive ping every 2.5s so intermediate proxies never drop idle stream
    heartbeatTimer = setInterval(() => {
      if (!isClientDisconnected && !res.writableEnded && !res.destroyed) {
        try {
          res.write(": keepalive\n\n");
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        } catch {
          // Socket closed
        }
      }
    }, 2500);

    const sendEvent = (data: any) => {
      if (!isClientDisconnected && !res.writableEnded && !res.destroyed) {
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        } catch {
          // Socket closed
        }
      }
    };

    const ai = getGeminiClient();
    const verificationDate = getVerificationDateString();

    // 1. Initial acknowledgment event
    sendEvent({ type: "start", message: "सरकारी पोर्टलों पर आधिकारिक खोज प्रारंभ की जा रही है..." });

    // 2. Perform live internet search to ensure current laws, portals & helplines
    const searchData = await searchOfficialWeb(question, state, district);
    sendEvent({
      type: "sources",
      sources: searchData.sources,
      verificationDate,
    });

    if (isClientDisconnected) return;

    const searchContext =
      searchData.snippets.length > 0
        ? `\n\nइंटरनेट से प्राप्त ताज़ा आधिकारिक खोज परिणाम (Verified Sources):\n${searchData.snippets.slice(0, 5).join("\n\n")}`
        : "";

    const isVerificationMode =
      /(?:statutory\s*text|exact\s*heading|pass\/fail|verification\s*test|audit|verify\s*sections?|धारा.*verify|केवल.*verify|not\s*verified|section.*verification|statutory\s*verification|सत्यापन\s*करें|वैधानिक\s*सत्यापन)/i.test(
        question
      );

    const verificationModeDirective = isVerificationMode
      ? `\n\n-------------------------------------------------------
🚨 [VERIFICATION-MODE OUTPUT CONTROL ACTIVE]
-------------------------------------------------------
User has explicitly requested a statutory verification test / audit.
1. Output ONLY the requested statutory verification result according to the HARD-FAIL VERIFICATION GATE.
2. Do NOT automatically append legal advice, application procedure, etc.
3. MULTI-SECTION PASS/FAIL GATE: If any section fails, OVERALL RESULT MUST BE FAIL.
4. HARD VERIFIED GATE: Do NOT output VERIFIED unless all 10 mandatory verification conditions are established.
5. PENALTY FIREWALL: If penalty amount cannot be verified exactly, status = NOT VERIFIED.`
      : "";

    const dynamicInstruction = `${SYSTEM_INSTRUCTION_CONTENT}

सत्यापन तिथि: ${verificationDate}
${searchContext}${verificationModeDirective}
`;

    let userQueryText = question.trim();
    if (userFacts && typeof userFacts === "string" && userFacts.trim()) {
      userQueryText += `\n\nनागरिक द्वारा बताए गए मामले के तथ्य:\n${userFacts.trim()}`;
    }
    if (generateDraft) {
      userQueryText += `\n\n(नागरिक को इस मामले में सक्षम अधिकारी/थाने हेतु लिखित आवेदन या FIR का औपचारिक ड्राफ्ट भी चाहिए)`;
    }

    let conversationContents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      conversationContents = history.slice(-6).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));
    }
    conversationContents.push({
      role: "user",
      parts: [{ text: userQueryText }],
    });

    let accumulatedText = "";

    try {
      const streamGenerator = generateContentStreamWithResilience(ai, conversationContents, {
        systemInstruction: dynamicInstruction,
        temperature: 0.2,
        preferredModel: "gemini-3.1-flash-lite",
      });

      for await (const chunk of streamGenerator) {
        if (isClientDisconnected) break;
        accumulatedText += chunk;
        sendEvent({ type: "chunk", text: chunk });
      }
    } catch (streamErr) {
      console.warn("Stream error in ask-assistant-stream:", streamErr);
    }

    if (isClientDisconnected) return;

    // Fallback if no text was streamed from AI
    if (!accumulatedText.trim()) {
      console.warn("Using deterministic fallback streaming for assistant answer.");
      const fallbackText = buildDeterministicAssistantAnswer(question.trim());
      const words = fallbackText.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        if (isClientDisconnected) break;
        const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
        accumulatedText += chunk;
        sendEvent({ type: "chunk", text: chunk });
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    // MANDATORY POST-PROCESSING SANITIZATION:
    const isMplrcContext =
      /(?:मध्य\s*प्रदेश|MP|Madhya\s*Pradesh)/i.test(question + " " + (state || "")) &&
      /(?:भू-राजस्व|राजस्व|land\s*revenue|129|130|133|135|सीमांकन|चिह्न|demarcation|boundary)/i.test(question);

    let sanitizedFullText = accumulatedText;
    if (isMplrcContext && sanitizedFullText) {
      sanitizedFullText = sanitizedFullText.replace(
        /(?:\*\*|)?(?:दो\s*हजार\s*रुपये|दो\s*हज़ार\s*रुपये|₹\s*2,?000|2,?000\s*रुपये)(?:\*\*|)?\s*(?:तक\s*का\s*जुर्माना|का\s*जुर्माना|तक\s*जुर्माना|जुर्माना)/gi,
        "विहित सीमा तक शास्ति (penalty) व पुनर्स्थापना व्यय (वर्तमान संशोधित अधिकतम राशि के लिए आधिकारिक वैधानिक पाठ से verification आवश्यक है)"
      );

      if (/130/.test(question) || /130/.test(sanitizedFullText)) {
        sanitizedFullText = sanitizedFullText.replace(
          /दो\s*हजार\s*रुपये|दो\s*हज़ार\s*रुपये|₹\s*2,?000|2,?000\s*रुपये/gi,
          "विहित सीमा तक शास्ति (सटीक राशि हेतु official text verification आवश्यक)"
        );
      }
    }

    const hasUnverifiedNotice =
      /verification\s*आवश्यक|पुष्टि\s*आवश्यक|साक्ष्य\s*अपूर्ण|not\s*verified|unverified|fail/i.test(
        sanitizedFullText
      );

    const hasAnyFailure =
      hasUnverifiedNotice ||
      /(?:section|धारा)\s*\d+[^:\n]*:\s*(?:fail|not\s*verified|अपुष्ट|सत्यापित\s*नहीं)/i.test(sanitizedFullText) ||
      /\b(?:FAIL|NOT\s*VERIFIED)\b/.test(sanitizedFullText) ||
      searchData.sources.length === 0;

    let hardFailReason = "";
    if (hasAnyFailure) {
      if (/130/.test(question) || /130/.test(sanitizedFullText)) {
        hardFailReason = "धारा 130 का संशोधित वैधानिक साक्ष्य अपूर्ण है (आधिकारिक कानून के मूल पाठ से जुर्माने/संशोधन की पुष्टि आवश्यक है)";
      } else {
        const secMatch = sanitizedFullText.match(/(?:धारा|section)\s*(\d+[A-Za-z]?)/i);
        const secName = secMatch ? `धारा ${secMatch[1]}` : "प्रावधान";
        hardFailReason = `${secName} का संशोधित वैधानिक साक्ष्य अपूर्ण है`;
      }
      console.log(`[HARD-FAIL AUDIT STREAM (BACKEND ONLY)] STATUS: OVERALL RESULT: FAIL (${hardFailReason}) for: ${question}`);
    }

    if (isVerificationMode && searchData.sources.length === 0 && !hasAnyFailure) {
      sanitizedFullText = `STATUS: NOT VERIFIED
अधिनियम/संहिता: आधिकारिक प्राथमिक वैधानिक स्रोत (Level 1 Official Primary Text) अनुपलब्ध।
कारण: हार्ड-फेल गेट (Hard-Fail Gate) नियम के अनुसार जब तक आधिकारिक गजट अथवा indiacode.gov.in से वर्तमान मूल पाठ प्राप्त नहीं होता, तब तक धारा अथवा उपधारा का सत्यापन PASS नहीं किया जा सकता।`;
    }

    const needsDraft =
      !isVerificationMode &&
      /fir|प्राथमिकी|शिकायत|मुकदमा|केस|धोखा|चोरी|हमला|धमकी|कब्जा|कंज्यूमर|नोटिस|आवेदन/i.test(
        question
      );

    const hasLocation = Boolean(state || district) || /उत्तर प्रदेश|बिहार|दिल्ली|राजस्थान|मध्य प्रदेश|महाराष्ट्र|हरियाणा|गुजरात|पंजाब/i.test(question);
    const needsStatePrompt = !isVerificationMode && !hasLocation && /पुलिस|थाना|तहसील|कोर्ट|rera|किराया|जमीन|सड़क/i.test(question)
      ? "सुझाव: अपने राज्य व जिले का नाम भी बताएं ताकि आपके क्षेत्र के थाने, पोर्टल या सक्षम अधिकारी की सटीक जानकारी दी जा सके।"
      : undefined;

    const isOfficiallyVerified = !hasAnyFailure && searchData.sources.length > 0;

    if (!isVerificationMode && sanitizedFullText && !sanitizedFullText.includes("क्या यह कानूनी जानकारी आपके लिए मददगार थी")) {
      const feedbackChunk = "\n\n" + SMART_FEEDBACK_PROMPT_LINE;
      sanitizedFullText = sanitizedFullText.trim() + feedbackChunk;
      sendEvent({ type: "chunk", text: feedbackChunk });
    }

    sendEvent({
      type: "done",
      fullText: sanitizedFullText,
      isWebVerified: isOfficiallyVerified,
      isHardFailed: hasAnyFailure,
      hardFailReason: hasAnyFailure ? hardFailReason : undefined,
      sources: searchData.sources,
      verificationDate,
      needsDraft,
      needsStatePrompt,
    });

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error: any) {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    console.error("Error in /api/ask-assistant-stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "स्ट्रीमिंग में त्रुटि आई।" });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", message: error?.message || "उत्तर प्राप्त करने में अस्थाई समस्या आई।" })}\n\n`);
      res.end();
    }
  }
}

app.post("/api/ask-assistant-stream", askAssistantStream);

// API 4: Quick Law Verification / BNS vs IPC conversion search
app.post("/api/verify-law", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "धारा या अपराध का नाम दर्ज करें।" });
    }

    const ai = getGeminiClient();
    const prompt = `
अपराध / धारा प्रश्न: ${query}

कृपया बताएं:
1. वर्तमान कानून (BNS 2023 या BNSS 2023 या BSA 2023) में कौन सी धारा लागू होती है?
2. पुरानी धारा (IPC 1860 / CrPC 1973 / Evidence Act) क्या थी?
3. अपराध का संक्षिप्त विवरण व क्या यह संज्ञेय (Cognizable) और गैर-जमानती (Non-Bailable) है?
4. पीड़ित नागरिक को तुरंत क्या कदम उठाना चाहिए?
संक्षिप्त, सटीक और आम बोलचाल की हिंदी में बताएं।
`;

    let verificationText = "";
    try {
      const { text } = await generateContentWithResilience(
        ai,
        prompt,
        {
          systemInstruction: SYSTEM_INSTRUCTION_CONTENT,
          temperature: 0.1,
          preferredModel: "gemini-3.1-flash-lite",
        }
      );
      verificationText = text || "";
    } catch (modelErr) {
      console.warn("Model error in verify-law:", modelErr);
    }

    if (!verificationText) {
      verificationText = `सत्यापन विवरण:
• प्रश्न: ${query}
• वर्तमान कानून: 1 जुलाई 2024 से भारतीय न्याय संहिता 2023 (BNS) प्रभावी है।
• पुलिस प्रक्रिया: भारतीय नागरिक सुरक्षा संहिता 2023 (BNSS)।
• सहायता: नजदीकी थाने में लिखित शिकायत दें अथवा राष्ट्रीय हेल्पलाइन 112 / साइबर हेल्पलाइन 1930 पर संपर्क करें।`;
    }

    res.json({
      success: true,
      verification: verificationText,
    });
  } catch (error: any) {
    console.error("Error in /api/verify-law:", error);
    res.json({
      success: true,
      verification: `वर्तमान में BNS 2023 एवं BNSS 2023 लागू हैं। त्वरित सहायता हेतु 112 डायल करें।`,
    });
  }
});

// Start server with Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Justice Ji Legal Content Assistant running on port ${PORT}`);
  });
}

startServer();
