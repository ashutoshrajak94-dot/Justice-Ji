import React from "react";
import { LegalSectionDetail } from "../types";

export interface LegalSectionDisplayProps {
  details?: LegalSectionDetail;
  applicableLawFallback?: string;
  isVerified?: boolean;
  failReason?: string;
}

/**
 * Dedicated display for Legal Section, Punishment, and Fine
 * strictly respecting the 4 instructions:
 * 1. Legal Section: Act Name, Section number, What section deals with
 * 2. Punishment: Minimum, Maximum, Nature (imprisonment)
 * 3. Fine: Penalty amount or Court's discretion
 * 4. FONT COLORS:
 *    • धारा / Section → Blue
 *    • सजा / Punishment → Red
 *    • जुर्माना / Fine → Orange
 *    CRITICAL: NO colored backgrounds, NO boxes, NO borders, NO highlights.
 *    Only the text/font color changes.
 */
/**
 * Dedicated display for Legal Section, Punishment, Fine, and Actions
 * strictly respecting the 12-point Legal Verification and Cross-Check rules:
 *
 * 1. EXACT SECTION VERIFICATION:
 *    • कानून: Current Act/Law name
 *    • धारा: Exact section & subsection in BLUE font (#1d4ed8 / text-blue-700)
 *    • किस स्थिति में लागू हो सकती है: Exactly what conditions apply
 *
 * 2. PUNISHMENT CROSS-CHECK:
 *    • 🔴 सजा: in RED font (#dc2626 / text-red-700)
 *    • न्यूनतम: Minimum punishment (Red)
 *    • अधिकतम: Maximum punishment & nature (Red)
 *
 * 3. FINE CROSS-CHECK:
 *    • 🟠 जुर्माना: in ORANGE font (#ea580c / text-orange-600)
 *    • राशि: Exact fine amount or discretion (Orange)
 *    • अन्य शर्त: Additional condition or terms (Orange)
 *
 * 4. WHAT TO DO (🟢 क्या करें):
 *    • पहला कदम
 *    • अगला कदम
 *    • संबंधित अधिकारी/प्राधिकरण
 *
 * 5. UNCERTAINTY RULE:
 *    "इस जानकारी की आधिकारिक पुष्टि आवश्यक है, इसलिए बिना सत्यापन के धारा/सजा/जुर्माना बताना उचित नहीं होगा।"
 *
 * CRITICAL RULE: NO colored backgrounds, NO boxes, NO borders, NO highlights.
 * Only the text/font color changes.
 */
export const LegalSectionDisplay: React.FC<LegalSectionDisplayProps> = ({
  details,
  applicableLawFallback,
  isVerified,
  failReason,
}) => {
  if (!details && !applicableLawFallback) return null;

  // Strict verification check: block rendering if isVerified === false
  if (isVerified === false) {
    return (
      <div className="p-3.5 sm:p-4 bg-red-50 border-2 border-red-600 rounded-lg text-red-950 font-bold text-xs sm:text-sm my-2 flex items-center gap-2">
        <span className="text-red-600 text-lg">🚨</span>
        <span>STATUS: OVERALL RESULT: FAIL ({failReason || "वैधानिक साक्ष्य अपूर्ण है"})</span>
      </div>
    );
  }

  // Uncertainty Rule (Rule 7)
  if (details?.isUncertain || details?.uncertaintyMessage) {
    return (
      <div className="py-2.5 font-['Yantramanav',sans-serif] text-sm sm:text-base leading-relaxed text-amber-900 font-semibold italic">
        ⚠️ {details.uncertaintyMessage || "इस जानकारी की आधिकारिक पुष्टि आवश्यक है, इसलिए बिना सत्यापन के धारा/सजा/जुर्माना बताना उचित नहीं होगा।"}
      </div>
    );
  }

  const actName = details?.actName || "भारतीय न्याय संहिता, 2023 / विशेष अधिनियम";
  const sectionNumber = details?.sectionNumber || applicableLawFallback || "सत्यापित धारा";
  const sectionTitleOrSubject =
    details?.sectionTitle ||
    details?.sectionAbout ||
    "प्रावधान का विधिक विषय";
  const applicableCondition =
    details?.applicableCondition ||
    details?.sectionAbout ||
    details?.provisionGeneral ||
    "";

  // Check if punishment is absent or explicit "अलग से दंड नहीं"
  const hasNoPunishment =
    details?.hasPunishmentInProvision === false ||
    details?.punishment?.includes("अलग से दंड") ||
    details?.minPunishment?.includes("अलग से दंड") ||
    details?.maxPunishment?.includes("अलग से दंड") ||
    (!details?.punishment && !details?.maxPunishment);

  const minPunishment =
    details?.minPunishment || "कानून में न्यूनतम निर्धारित नहीं / लागू नहीं";
  const maxPunishment =
    details?.maxPunishment ||
    details?.punishment ||
    (details?.punishmentNature ? `प्रकृति: ${details.punishmentNature}` : "") ||
    "अधिकतम सजा आधिकारिक संहिता के अनुसार";

  // Check if fine is absent or explicit "अलग से दंड/जुर्माना नहीं"
  const hasNoFine =
    details?.hasFineInProvision === false ||
    details?.fineAmount?.includes("अलग से दंड") ||
    details?.fine?.includes("अलग से दंड") ||
    (!details?.fineAmount && !details?.fine);

  const fineAmount =
    details?.fineAmount ||
    details?.fine ||
    "अदालत के विवेक पर निर्भर";
  const fineOtherCondition =
    details?.fineOtherCondition ||
    details?.fineDiscretion ||
    "जुर्माने से भी दंडनीय / अदालत के विवेक पर निर्भर";

  const isFineUnverified =
    Boolean(fineAmount && /verification\s*आवश्यक|पुष्टि\s*आवश्यक|अपुष्ट|not\s*verified|unverified/i.test(fineAmount));
  const isPunishmentUnverified =
    Boolean(
      (details?.punishment && /verification\s*आवश्यक|पुष्टि\s*आवश्यक|अपुष्ट|not\s*verified|unverified/i.test(details.punishment)) ||
      (details?.maxPunishment && /verification\s*आवश्यक|पुष्टि\s*आवश्यक|अपुष्ट|not\s*verified|unverified/i.test(details.maxPunishment))
    );

  const firstStep =
    details?.firstStep || "घटना के तुरंत बाद संबंधित आधिकारिक पोर्टल या थाने में शिकायत दर्ज कराएं।";
  const nextStep =
    details?.nextStep || "मुहर लगी लिखित पावती (Receiving) या शिकायत संदर्भ संख्या सुरक्षित रखें।";
  const authority =
    details?.authority || "संबंधित क्षेत्राधिकार का सक्षम विधिक प्राधिकरण / न्यायालय";

  return (
    <div className="py-2 space-y-3 font-['Yantramanav',sans-serif] text-sm sm:text-base leading-relaxed text-stone-900">
      {/* ⚖️ संबंधित कानून */}
      <div className="space-y-1">
        <div className="font-bold text-stone-900 flex items-center gap-1.5 text-base sm:text-lg">
          <span>⚖️</span>
          <span>संबंधित कानून</span>
        </div>
        {details?.state && (
          <div className="text-stone-800 text-xs sm:text-sm pl-4">
            <span className="font-semibold text-stone-600">• राज्य: </span>
            <span className="text-stone-900 font-medium">{details.state}</span>
          </div>
        )}
        <div className="text-stone-800 text-xs sm:text-sm pl-4">
          <span className="font-semibold text-stone-600">• कानून/Code: </span>
          <span className="text-stone-900 font-medium">{actName}</span>
        </div>
        {/* Blue font for Section */}
        <div className="text-blue-700 font-semibold text-sm sm:text-base pl-4 tracking-tight">
          • धारा: {sectionNumber}
        </div>
        {/* Section title / subject */}
        <div className="text-stone-700 text-xs sm:text-sm pl-4">
          <span className="font-semibold text-stone-600">• धारा का विषय: </span>
          <span className="text-stone-800">{sectionTitleOrSubject}</span>
        </div>
        {applicableCondition && applicableCondition !== sectionTitleOrSubject && (
          <div className="text-stone-700 text-xs sm:text-sm pl-4">
            <span className="font-semibold text-stone-600">• किस स्थिति में लागू हो सकती है: </span>
            <span className="text-stone-800">{applicableCondition}</span>
          </div>
        )}
        {details?.neighbouringProvisionsNote && (
          <div className="text-stone-700 text-xs sm:text-sm pl-4">
            <span className="font-semibold text-stone-600">• संबंधित अन्य धारा/प्रावधान: </span>
            <span className="text-stone-800">{details.neighbouringProvisionsNote}</span>
          </div>
        )}
        {(details?.isUncertain || details?.uncertaintyMessage) && (
          <div className="text-stone-700 text-xs sm:text-sm pl-4 font-medium">
            • {details.uncertaintyMessage || "आधिकारिक कानून के मूल प्रावधान से इस धारा/दंड की पुष्टि नहीं हो पा रही है, इसलिए मैं अनुमान से धारा या जुर्माने की राशि नहीं बता रहा हूँ।"}
          </div>
        )}
      </div>

      {/* 🔴 सजा: in Red font without boxes or backgrounds */}
      <div className="space-y-1">
        <div className="font-bold text-red-700 flex items-center gap-1.5 text-base">
          <span>🔴</span>
          <span>सजा:</span>
        </div>
        {hasNoPunishment ? (
          <div className="text-red-700 font-medium text-xs sm:text-sm pl-4">
            • इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।
          </div>
        ) : isPunishmentUnverified ? (
          <div className="text-red-700 font-bold text-xs sm:text-sm pl-4 bg-red-50 py-1 px-2 rounded border border-red-200">
            • सजा: अपुष्ट / UNVERIFIED (आधिकारिक कानून के मूल पाठ से सत्यापन आवश्यक है)
          </div>
        ) : (
          <>
            <div className="text-red-700 font-medium text-xs sm:text-sm pl-4">
              • न्यूनतम: {minPunishment}
            </div>
            <div className="text-red-700 font-semibold text-xs sm:text-sm pl-4">
              • अधिकतम: {maxPunishment}
            </div>
          </>
        )}
      </div>

      {/* 🟠 जुर्माना: in Orange font without boxes or backgrounds */}
      <div className="space-y-1">
        <div className="font-bold text-orange-600 flex items-center gap-1.5 text-base">
          <span>🟠</span>
          <span>जुर्माना:</span>
        </div>
        {hasNoFine ? (
          <div className="text-orange-600 font-medium text-xs sm:text-sm pl-4">
            • इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है।
          </div>
        ) : isFineUnverified ? (
          <div className="text-red-700 font-bold text-xs sm:text-sm pl-4 bg-red-50 py-1 px-2 rounded border border-red-200">
            • जुर्माना: अपुष्ट / UNVERIFIED (आधिकारिक गजट / मूल पाठ से सत्यापन आवश्यक है)
          </div>
        ) : (
          <>
            <div className="text-orange-600 font-semibold text-xs sm:text-sm pl-4">
              • राशि: {fineAmount}
            </div>
            {fineOtherCondition && !fineOtherCondition.includes("अलग से दंड") && (
              <div className="text-orange-600 font-medium text-xs sm:text-sm pl-4">
                • अन्य शर्त: {fineOtherCondition}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🟢 क्या करें: */}
      <div className="space-y-1">
        <div className="font-bold text-stone-900 flex items-center gap-1.5 text-base">
          <span>🟢</span>
          <span>क्या करें:</span>
        </div>
        <div className="text-stone-800 text-xs sm:text-sm pl-4">
          <span className="font-semibold text-stone-700">• पहला कदम: </span>
          <span>{firstStep}</span>
        </div>
        <div className="text-stone-800 text-xs sm:text-sm pl-4">
          <span className="font-semibold text-stone-700">• अगला कदम: </span>
          <span>{nextStep}</span>
        </div>
        <div className="text-stone-800 text-xs sm:text-sm pl-4">
          <span className="font-semibold text-stone-700">• संबंधित अधिकारी/प्राधिकरण: </span>
          <span>{authority}</span>
        </div>
      </div>

      {/* Source Verification */}
      {details?.verificationSource && (
        <div className="text-xs text-stone-500 pt-1 border-t border-stone-100">
          <span className="font-semibold text-stone-600">स्रोत/Verification: </span>
          <span>{details.verificationSource}</span>
        </div>
      )}

      {/* Fact dependence disclaimer */}
      {details?.factsDependence && (
        <div className="text-xs text-stone-600 italic">
          * {details.factsDependence}
        </div>
      )}
    </div>
  );
};

export interface LegalVerificationState {
  isVerified: boolean;
  reason: string;
}

/**
 * Resolves whether legal content satisfies statutory verification.
 * If explicitIsVerified is explicitly provided, it strictly governs.
 * Otherwise, scans content for hard-fail / unverified markers.
 */
export function resolveLegalVerification(
  content: string,
  explicitIsVerified?: boolean,
  explicitFailReason?: string
): LegalVerificationState {
  // If explicitly passed as false, strictly fail
  if (explicitIsVerified === false) {
    return {
      isVerified: false,
      reason: explicitFailReason || "वैधानिक साक्ष्य अपूर्ण है (isVerified = false)",
    };
  }

  if (!content) {
    return { isVerified: true, reason: "" };
  }

  // 1. Explicit FAIL or NOT VERIFIED markers
  if (
    /(?:STATUS:\s*OVERALL\s*RESULT:\s*FAIL|STATUS:\s*NOT\s*VERIFIED|OVERALL\s*RESULT:\s*FAIL)/i.test(
      content
    )
  ) {
    const match = content.match(/FAIL\s*\(([^)]+)\)/i);
    return {
      isVerified: false,
      reason:
        explicitFailReason ||
        (match ? match[1] : "वैधानिक साक्ष्य अपूर्ण है (STATUS: OVERALL RESULT: FAIL)"),
    };
  }

  // 2. Section 130 check: if unverified or requires verification
  const isSec130 = /(?:धारा\s*130|section\s*130)/i.test(content);
  if (
    isSec130 &&
    (/(?:verification\s*आवश्यक|पुष्टि\s*आवश्यक|अपुष्ट|not\s*verified|unverified|साक्ष्य\s*अपूर्ण)/i.test(
      content
    ) ||
      content.includes("NOT VERIFIED") ||
      content.includes("FAIL"))
  ) {
    return {
      isVerified: false,
      reason: explicitFailReason || "धारा 130 का संशोधित वैधानिक साक्ष्य अपूर्ण है",
    };
  }

  // 3. GLOBAL VERIFICATION GATE: 1% भी संशय होने पर isVerified = false
  const doubtPattern =
    /(?:संशय|संदेह|संभावित|अपुष्ट|पुष्टि\s*आवश्यक|verification\s*आवश्यक|सत्यापन\s*आवश्यक|साक्ष्य\s*अपूर्ण|गजट\s*साक्ष्य\s*अपूर्ण|not\s*verified|unverified|fail|incomplete\s*evidence|discrepancy|संशोधन\s*की\s*पुष्टि\s*नहीं|अस्पष्ट|अपूर्ण\s*साक्ष्य|1%|पुष्टि\s*नहीं\s*हो\s*सकी|सटीक\s*राशि\s*हेतु|अनुमान\s*से|पुष्टि\s*न\s*होने|साक्ष्य\s*की\s*कमी)/i;

  if (explicitIsVerified !== true && doubtPattern.test(content)) {
    const match = content.match(/(?:धारा|section)\s*(\d+[A-Za-z]?)[^.\n]*(?:verification|पुष्टि|अपुष्ट|संशय|साक्ष्य)/i);
    const sec = match ? `धारा ${match[1]}` : "कानूनी प्रावधान";
    return {
      isVerified: false,
      reason: explicitFailReason || `${sec} का संशोधित वैधानिक साक्ष्य अपूर्ण है (1% संशय गेट सक्रिय)`,
    };
  }

  // If explicitly true, allow
  if (explicitIsVerified === true) {
    return { isVerified: true, reason: "" };
  }

  return { isVerified: true, reason: "" };
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
  actContext: string = "",
  punishmentContext: string = "",
  fineContext: string = ""
): string {
  const combined = `${sectionNumber} ${actContext} ${punishmentContext} ${fineContext}`.toLowerCase();
  const hasPenaltyOrFine =
    Boolean(punishmentContext || fineContext) &&
    !punishmentContext.includes("अलग से दंड") &&
    !fineContext.includes("अलग से दंड") &&
    !punishmentContext.includes("निर्धारित नहीं") &&
    !fineContext.includes("निर्धारित नहीं");

  const isBns = /bns|भारतीय\s*न्याय\s*संहिता|bharatiya\s*nyaya/i.test(combined);
  const isIpc = /ipc|भारतीय\s*दंड\s*संहिता|indian\s*penal\s*code/i.test(combined);

  // 1. BNS Section 111 (Organized crime): 111(1) is definition, 111(2)(a) is death penalty, 111(2)(b) is other penalty
  if (isBns && /(?:धारा\s*111\b|section\s*111\b|111\(1\))/i.test(sectionNumber)) {
    if (/मृत्यु|death|फांसी|life|आजीवन/i.test(`${punishmentContext} ${fineContext}`)) {
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
    if (/संपत्ति|property|7\s*(?:वर्ष|साल|years)|डिलीवरी|delivery/i.test(`${punishmentContext} ${fineContext}`)) {
      return "धारा 318(4)";
    }
    return "धारा 318(2)";
  }

  // 8. BNS Section 351 (Criminal intimidation): 351(1) definition, 351(2) penalty, 351(3) aggravated penalty
  if (isBns && /(?:धारा\s*351\b|section\s*351\b|351\(1\))/i.test(sectionNumber)) {
    if (/7\s*(?:वर्ष|साल|years)|मृत्यु|death|गंभीर\s*चोट|grievous/i.test(`${punishmentContext} ${fineContext}`)) {
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

export interface FormattedLegalContentProps {
  content: string;
  className?: string;
  /**
   * Strictly enforces a boolean verification state:
   * • If false: Blocks the rendering of legal article text and forces display of FAIL status warning instead.
   * • If true: Permits rendering of verified legal article text.
   * • If undefined: Evaluates content text for statutory unverified/fail indicators.
   */
  isVerified?: boolean;
  failReason?: string;
}

/**
 * Parses and renders legal text (like Format B or Assistant responses).
 * STRICT VERIFICATION ENFORCEMENT:
 * If isVerified is false (or verification fails):
 * • Blocks the rendering of legal article text completely.
 * • Forces display of the FAIL status warning instead.
 *
 * When verified (isVerified === true):
 * • धारा / Section lines have Blue text font color (#1d4ed8)
 * • सजा / Punishment lines have Red text font color (#dc2626)
 * • जुर्माना / Fine lines have Orange text font color (#ea580c)
 * • Uncertainty lines styled cleanly
 * And strictly NO colored backgrounds, boxes, borders, or highlights.
 */
export const FormattedLegalContent: React.FC<FormattedLegalContentProps> = ({
  content,
  className = "",
  isVerified,
  failReason,
}) => {
  if (!content) return null;

  const verification = resolveLegalVerification(content, isVerified, failReason);

  // STRICT ENFORCEMENT: If isVerified is false, BLOCK rendering of legal article text
  // and force display of the FAIL status warning instead.
  if (!verification.isVerified) {
    return (
      <div
        id="legal-content-fail-warning"
        className={`p-5 sm:p-6 bg-red-50 border-2 border-red-600 rounded-xl text-red-950 shadow-md space-y-4 my-2 font-['Yantramanav',sans-serif] ${className}`}
      >
        <div className="flex items-start gap-3 border-b border-red-200 pb-3.5">
          <div className="p-2 bg-red-600 text-white rounded-lg shrink-0 mt-0.5 shadow-2xs">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-1 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-black bg-red-600 text-white tracking-wide uppercase">
              <span>Hard-Fail Gate Enforced</span>
              <span>•</span>
              <span>isVerified = false</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-red-700 tracking-tight">
              STATUS: OVERALL RESULT: FAIL ({verification.reason})
            </h3>
            <p className="text-xs sm:text-sm text-red-800 font-semibold">
              कानूनी लेख का पाठ अवरुद्ध (Legal Article Text Rendering Blocked)
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-stone-800 bg-white/95 p-4 sm:p-5 rounded-lg border border-red-200 leading-relaxed shadow-2xs">
          <div className="font-bold text-red-950 text-sm flex items-center gap-2 border-b border-red-100 pb-2">
            <span className="text-red-600 font-bold">⚠️</span>
            <span>हार्ड-फेल सत्यापन रिपोर्ट (Hard-Fail Audit Report):</span>
          </div>
          <div className="space-y-2 text-stone-800">
            <div>
              <span className="font-bold text-red-900">1. सत्यापन स्थिति (Verification State):</span>{" "}
              <span className="font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                isVerified = false [FAIL]
              </span>
            </div>
            <div>
              <span className="font-bold text-red-900">2. विफलता का कारण (Reason):</span>{" "}
              <span className="text-stone-900 font-semibold">{verification.reason}</span>
            </div>
            <div>
              <span className="font-bold text-red-900">3. हार्ड-फेल नियम:</span> Justice Ji के अनिवार्य कानूनी नियमों (PART 6 — HARD-FAIL VERIFICATION GATE) के अनुसार, यदि किसी भी धारा का कोई भी भाग (जैसे पेनल्टी, अमेंडमेंट, उपधारा, अथॉरिटी) Level 1 आधिकारिक गजट या मूल अधिनियम से 100% सत्यापित नहीं है, तो सामान्य कानूनी लेख का पाठ प्रदर्शित करना पूर्णतः वर्जित है।
            </div>
            <div>
              <span className="font-bold text-red-900">4. अनिवार्य निर्देश:</span> जब तक संबंधित राज्य ई-गजट या प्राथमिक कानून से धारा, उपधारा व दंड की सटीक पुष्टि नहीं हो जाती, तब तक किसी भी अनौपचारिक अथवा अनुमानित कानूनी दावे को प्रकाशित न करें।
            </div>
          </div>
        </div>

        <div className="text-xs text-red-700 italic border-t border-red-200 pt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 font-semibold">
            LEGAL ACCURACY &gt; SOURCE AUTHORITY &gt; UNVERIFIED ARTICLES STRICTLY BLOCKED
          </span>
          <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200">
            Justice Ji Hard-Fail Protocol
          </span>
        </div>
      </div>
    );
  }

  // Only if isVerified is true, continue rendering article lines:
  const lines = content.split("\n");

  // Track context for multi-line sections like 🔴 सजा or 🟠 जुर्माना
  let inPunishmentContext = false;
  let inFineContext = false;

  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          inPunishmentContext = false;
          inFineContext = false;
          return <div key={idx} className="h-2" />;
        }

        // Hard-Fail Gate: Red Warning Banner for STATUS: OVERALL RESULT: FAIL or NOT VERIFIED
        if (/^STATUS:\s*(?:OVERALL\s*RESULT:\s*FAIL|NOT\s*VERIFIED)/i.test(trimmed)) {
          return (
            <div
              key={idx}
              className="p-3.5 sm:p-4 bg-red-50 border-2 border-red-600 rounded-xl text-red-900 font-black text-sm sm:text-base leading-snug my-2.5 shadow-sm flex items-start gap-2.5"
            >
              <span className="text-red-600 text-xl shrink-0">🚨</span>
              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-wider text-red-600">
                  HARD-FAIL GATE ENFORCED
                </div>
                <div className="text-red-800 font-bold">{trimmed}</div>
              </div>
            </div>
          );
        }

        // Check Uncertainty Rule (Rule 7)
        if (
          trimmed.includes("इस जानकारी की आधिकारिक पुष्टि आवश्यक है") ||
          trimmed.includes("बिना सत्यापन के धारा/सजा/जुर्माना बताना उचित नहीं होगा")
        ) {
          return (
            <div
              key={idx}
              className="text-amber-800 font-semibold italic text-sm sm:text-base leading-relaxed py-1"
            >
              ⚠️ {line}
            </div>
          );
        }

        // Section start markers
        if (/^🔴\s*सजा/i.test(trimmed) || /^सजा\s*:/i.test(trimmed) || /^•\s*सजा\s*:/i.test(trimmed)) {
          inPunishmentContext = true;
          inFineContext = false;
          return (
            <div
              key={idx}
              className="text-red-700 font-semibold text-sm sm:text-base leading-relaxed"
            >
              {line}
            </div>
          );
        }

        if (
          /^🟠\s*जुर्माना/i.test(trimmed) ||
          /^जुर्माना\s*:/i.test(trimmed) ||
          /^•\s*जुर्माना\s*:/i.test(trimmed)
        ) {
          inFineContext = true;
          inPunishmentContext = false;
          return (
            <div
              key={idx}
              className="text-orange-600 font-semibold text-sm sm:text-base leading-relaxed"
            >
              {line}
            </div>
          );
        }

        if (/^(🟢\s*क्या करें|⚖️\s*संबंधित कानून|[0-9]+\.\s+|स्रोत\/Verification)/i.test(trimmed)) {
          inPunishmentContext = false;
          inFineContext = false;
        }

        // Lines stating no separate punishment or fine
        if (trimmed.includes("इस धारा में अलग से दंड/जुर्माना निर्धारित नहीं है") || trimmed.includes("अलग से दंड/जुर्माना निर्धारित नहीं है")) {
          if (inFineContext) {
            return (
              <div
                key={idx}
                className="text-orange-600 font-medium text-xs sm:text-sm leading-relaxed pl-3 sm:pl-4"
              >
                {line}
              </div>
            );
          }
          return (
            <div
              key={idx}
              className="text-red-700 font-medium text-xs sm:text-sm leading-relaxed pl-3 sm:pl-4"
            >
              {line}
            </div>
          );
        }

        // Check if line is a धारा / Section item (Rule 1 & 8)
        // Matches: "• धारा:", "धारा:", "धारा संख्या:", "Section:" etc.
        const isSectionLine =
          /^(•\s*)?(धारा|धारा संख्या|Section)\s*[:\/-]/i.test(trimmed) ||
          /^धारा\s+\d+/i.test(trimmed);

        if (isSectionLine) {
          inPunishmentContext = false;
          inFineContext = false;

          let displayLine = line;
          // Apply GLOBAL SUB-CLAUSE RULE (सटीक उपधारा प्राथमिकता):
          // If content mentions punishment or fine, resolve section line to exact penal sub-clause
          if (content.includes("🔴 सजा:") || content.includes("🟠 जुर्माना:") || content.includes("सजा") || content.includes("जुर्माना")) {
            displayLine = line.replace(
              /(•\s*धारा:\s*)(.*)/i,
              (_, prefix, sec) => `${prefix}${resolvePenalSubClause(sec, content, content, content)}`
            );
          }

          return (
            <div
              key={idx}
              className="text-blue-700 font-semibold text-sm sm:text-base leading-relaxed pl-3 sm:pl-4"
            >
              {displayLine}
            </div>
          );
        }

        // Check if line is state / act / subject item under legal section
        if (/^(•\s*)?(राज्य|कानून\/Code|कानून|अधिनियम|धारा का विषय|किस स्थिति में लागू)\s*[:\/-]/i.test(trimmed)) {
          return (
            <div
              key={idx}
              className="text-stone-800 text-xs sm:text-sm leading-relaxed pl-3 sm:pl-4"
            >
              {line}
            </div>
          );
        }

        // Check if line is under Punishment context (e.g. • न्यूनतम:, • अधिकतम:)
        if (
          inPunishmentContext &&
          /^(•\s*)?(न्यूनतम|अधिकतम|सजा की प्रकृति|प्रकृति)\s*[:\/-]/i.test(trimmed)
        ) {
          return (
            <div
              key={idx}
              className="text-red-700 font-semibold text-sm sm:text-base leading-relaxed pl-3 sm:pl-4"
            >
              {line}
            </div>
          );
        }

        // Standalone punishment lines
        const isPunishmentLine =
          /^(•\s*)?(सजा|सजा का प्रावधान|दण्ड|Punishment)\s*[:\/-]/i.test(trimmed) ||
          /^सजा\s*:/i.test(trimmed);

        if (isPunishmentLine) {
          return (
            <div
              key={idx}
              className="text-red-700 font-semibold text-sm sm:text-base leading-relaxed"
            >
              {line}
            </div>
          );
        }

        // Check if line is under Fine context (e.g. • राशि:, • अन्य शर्त:)
        if (
          inFineContext &&
          /^(•\s*)?(राशि|अन्य शर्त|विवेक|पेनाल्टी)\s*[:\/-]/i.test(trimmed)
        ) {
          return (
            <div
              key={idx}
              className="text-orange-600 font-semibold text-sm sm:text-base leading-relaxed pl-3 sm:pl-4"
            >
              {line}
            </div>
          );
        }

        // Standalone fine lines
        const isFineLine =
          /^(•\s*)?(जुर्माना|अर्थदण्ड|Fine|Penalty)\s*[:\/-]/i.test(trimmed) ||
          /^जुर्माना\s*:/i.test(trimmed);

        if (isFineLine) {
          return (
            <div
              key={idx}
              className="text-orange-600 font-semibold text-sm sm:text-base leading-relaxed"
            >
              {line}
            </div>
          );
        }

        // Headings or Section Titles
        if (/^(<u>.*?<\/u>)/i.test(trimmed)) {
          const title = trimmed.replace(/<\/?u>/gi, "");
          return (
            <h3
              key={idx}
              className="font-bold text-base sm:text-lg text-stone-900 underline underline-offset-4 pt-2 pb-1"
            >
              {title}
            </h3>
          );
        }

        if (
          /^([0-9]+\.\s+|⚖️\s*|🟢\s*)(समस्या क्या है|क्या करें|संबंधित कानून|संबंधित कानून\/धारा|जरूरी कागज़|कहाँ जाएँ|वर्तमान संपर्क जानकारी|आगे क्या करें|ध्यान रखें|स्रोत\/Verification)/i.test(
            trimmed
          )
        ) {
          return (
            <h4
              key={idx}
              className="font-bold text-stone-900 text-sm sm:text-base pt-3 pb-0.5"
            >
              {line}
            </h4>
          );
        }

        // Standard text lines
        return (
          <div key={idx} className="text-stone-800 leading-relaxed text-sm sm:text-base">
            {line}
          </div>
        );
      })}
    </div>
  );
};
