import React, { useState } from "react";
import { Header } from "./components/Header";
import { ContentGenerator } from "./components/ContentGenerator";
import { LegalWebSearch } from "./components/LegalWebSearch";
import { DraftGenerator } from "./components/DraftGenerator";
import { LegalAssistantChat } from "./components/LegalAssistantChat";
import { VerifiedHelplines } from "./components/VerifiedHelplines";
import { LawConverter } from "./components/LawConverter";
import { LegalDictionary } from "./components/LegalDictionary";
import { DisclaimerFooter } from "./components/DisclaimerFooter";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "websearch" | "generator" | "drafts" | "chat" | "helplines" | "laws" | "dictionary"
  >("websearch");

  const [activeDraftContent, setActiveDraftContent] = useState<string | undefined>(undefined);
  const [activeDraftType, setActiveDraftType] = useState<string | undefined>(undefined);
  const [savedTopics, setSavedTopics] = useState<
    Array<{ id: string; title: string; contentMarkdown: string; category?: string }>
  >([]);

  const handleOpenDraft = (draftContent?: string, draftType?: string) => {
    setActiveDraftContent(draftContent);
    setActiveDraftType(draftType);
    setActiveTab("drafts");
  };

  const handleSaveNewTopic = (topic: { title: string; content: string }) => {
    const newTopicItem = {
      id: "custom-" + Date.now(),
      title: topic.title,
      contentMarkdown: topic.content,
      category: "सत्यापित नया विषय (AI Web Verified)",
    };
    setSavedTopics((prev) => [newTopicItem, ...prev]);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900">
      {/* Header with Navigation */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "generator" && (
          <ContentGenerator
            onGoToWebSearch={() => setActiveTab("websearch")}
            savedTopics={savedTopics}
          />
        )}
        {activeTab === "websearch" && (
          <LegalWebSearch
            onOpenDraft={handleOpenDraft}
            onSaveNewTopic={handleSaveNewTopic}
          />
        )}
        {activeTab === "drafts" && (
          <DraftGenerator
            key={activeDraftType || "draft-default"}
            initialDraft={activeDraftContent}
            initialTemplate={activeDraftType}
          />
        )}
        {activeTab === "chat" && (
          <LegalAssistantChat onOpenDraft={handleOpenDraft} />
        )}
        {activeTab === "helplines" && <VerifiedHelplines />}
        {activeTab === "laws" && <LawConverter />}
        {activeTab === "dictionary" && <LegalDictionary />}
      </main>

      {/* Footer with Legal Disclaimer */}
      <DisclaimerFooter />
    </div>
  );
}

