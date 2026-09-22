import React, { useState } from "react";
import { Sidebar, NavTab } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ContentGenerator } from "./components/ContentGenerator";
import { LegalWebSearch } from "./components/LegalWebSearch";
import { DraftGenerator } from "./components/DraftGenerator";
import { LegalAssistantChat } from "./components/LegalAssistantChat";
import { VerifiedHelplines } from "./components/VerifiedHelplines";
import { LawConverter } from "./components/LawConverter";
import { LegalDictionary } from "./components/LegalDictionary";
import { DisclaimerFooter } from "./components/DisclaimerFooter";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { LanguageSelectionModal } from "./components/LanguageSelectionModal";

function MainApp() {
  const [activeTab, setActiveTab] = useState<NavTab>("websearch");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex font-sans text-stone-900 dark:text-stone-100 transition-colors duration-200">
      {/* 1. Left Sidebar Navigation (ChatGPT / Gemini style) */}
      <LanguageSelectionModal />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* 2. Main Right Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? "lg:pl-18" : "lg:pl-64"
        }`}
      >
        {/* Sleek Top Header with Centered Large Logo & Dark/Light Toggle */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Content Tabs Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
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
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}
