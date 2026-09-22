export interface LegalTopic {
  id: string;
  title: string;
  category: "cyber" | "consumer" | "police" | "property" | "women" | "banking" | "labour";
  categoryName: string;
  summary: string;
  contentMarkdown: string;
}

export interface HelplineContact {
  id: string;
  name: string;
  category: "emergency" | "cyber" | "consumer" | "women_child" | "legal_aid" | "senior";
  categoryName: string;
  tollFree: string;
  shortCode: string;
  website: string;
  operationalHours: string;
  description: string;
  department: string;
  verifiedSource: string;
}

export interface LawSectionMapping {
  offense: string;
  currentLaw: string;
  currentSection: string;
  oldLaw: string;
  oldSection: string;
  nature: string;
  bailStatus: string;
  punishment: string;
  simpleMeaning: string;
}

export interface DraftTemplate {
  id: string;
  title: string;
  authority: string;
  description: string;
  defaultPlace: string;
  sampleRelief: string;
  sampleIncident: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  isVerified?: boolean;
  isWebVerified?: boolean;
  isOverallVerified?: boolean;
  isHardFailed?: boolean;
  hardFailReason?: string;
  sources?: Array<{ title: string; url: string }>;
  verificationDate?: string;
  suggestedDraft?: string;
  needsStatePrompt?: string;
  applicableLaw?: string;
}

export interface VerifiedOfficialContact {
  name: string;
  contact: string;
  portal?: string;
  note?: string;
}

export interface LegalSectionDetail {
  actName?: string; // कानून/Act या Code का नाम
  sectionNumber?: string; // धारा/Section number
  sectionTitle?: string; // धारा का विषय / Section Title
  sectionAbout?: string; // धारा किस बारे में है
  applicableCondition?: string; // किस स्थिति में लागू हो सकती है
  state?: string; // राज्य (State name for state-specific law)
  isStateLaw?: boolean; // क्या यह राज्यीय कानून/Code है
  hasPunishmentInProvision?: boolean; // क्या उसी सत्यापित प्रावधान में सजा है
  hasFineInProvision?: boolean; // क्या उसी सत्यापित प्रावधान में जुर्माना है
  punishment?: string; // सजा: न्यूनतम, अधिकतम, प्रकृति
  minPunishment?: string; // न्यूनतम सजा
  maxPunishment?: string; // अधिकतम सजा
  punishmentNature?: string; // सजा की प्रकृति (जैसे साधारण/सश्रम कारावास)
  fine?: string; // जुर्माना/penalty की राशि या विवेक
  fineAmount?: string; // जुर्माना राशि
  fineOtherCondition?: string; // अन्य शर्त
  fineDiscretion?: string; // अदालत के विवेक पर निर्भर विवरण
  firstStep?: string; // पहला कदम
  nextStep?: string; // अगला कदम
  authority?: string; // संबंधित अधिकारी/प्राधिकरण
  verificationSource?: string; // स्रोत/Verification
  isUncertain?: boolean; // क्या सटीक धारा/सजा अपुष्ट है
  uncertaintyMessage?: string; // अनिश्चितता संदेश (नियम 7 / Step 6)
  neighbouringProvisionsNote?: string; // संबंधित अन्य धारा/प्रावधान (Step 5 & 8)
  provisionGeneral?: string; // कानून में यह प्रावधान है
  caseApplication?: string; // आपके मामले में यह लागू हो सकता है
  factsDependence?: string; // यह धारा/कानून मामले की परिस्थितियों पर निर्भर करता है
  lawType?: string; // केंद्रीय कानून / राज्यीय कानून / स्थानीय नियम
}

export interface LegalResearchResult {
  question: string;
  state?: string;
  district?: string;
  legalProblem: string;
  applicableLaw: string;
  legalSectionDetails?: LegalSectionDetail;
  safestNextStep?: string;
  formatBContent: string;
  requiredDocuments: string[];
  authorityAndForum: string;
  verifiedContacts: VerifiedOfficialContact[];
  officialSources: Array<{ title: string; url: string }>;
  verificationDate: string;
  needsStateOrDistrict: boolean;
  stateDistrictPrompt?: string;
  unverifiedNote?: string;
  isVerified?: boolean;
  isOverallVerified?: boolean;
  hardFailReason?: string;
  requiresDraft: boolean;
  draftOffer?: string;
  generatedDraft?: string;
  isNewTopic: boolean;
}
export interface LegalDictionaryTerm {
  id: string;
  hindiTerm: string;
  englishTerm: string;
  pronunciationOrLatin?: string;
  category: "criminal" | "procedure" | "court" | "civil" | "rights";
  categoryName: string;
  applicableLaw: string;
  section: string;
  subject: string;
  condition: string;
  punishment?: string;
  fine?: string;
  simpleMeaning: string;
  practicalExample: string;
  citizenRightTip?: string;
  relatedTerms?: string[];
}
