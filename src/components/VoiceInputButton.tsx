import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onStart?: () => void;
  className?: string;
  buttonSize?: "sm" | "md" | "lg";
}

// Window interface augmentation for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onStart,
  className = "",
  buttonSize = "md",
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
    }
    setIsListening(false);
    setStatusText(null);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatusText("आपके ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। आप लिखकर पूछ सकते हैं।");
      setTimeout(() => setStatusText(null), 5000);
      return;
    }

    // If already listening, stop
    if (isListening) {
      stopListening();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Primary language set to Hindi (India) - handles Hindi and Hinglish terms
      recognition.lang = "hi-IN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText("🎤 सुन रहा हूँ... बोलिए");
        // Clear previous question immediately when new voice input starts
        if (onStart) {
          onStart();
        }
      };

      recognition.onresult = (event: any) => {
        setStatusText("आवाज़ को टेक्स्ट में बदला जा रहा है...");
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const speechResult = (finalTranscript || interimTranscript).trim();
        if (speechResult) {
          // Never combine with old question - provide ONLY the current spoken question
          onTranscript(speechResult);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setStatusText("माइक की अनुमति आवश्यक है। कृपया ब्राउज़र में माइक्रोफोन की अनुमति दें।");
        } else if (event.error === "no-speech") {
          setStatusText("कोई आवाज़ नहीं सुनाई दी। कृपया पुनः बोलें।");
        } else if (event.error === "audio-capture") {
          setStatusText("माइक्रोफोन उपलब्ध नहीं है या काम नहीं कर रहा।");
        } else if (event.error === "network") {
          setStatusText("नेटवर्क समस्या। कृपया कुछ देर बाद बोलें या लिखकर पूछें।");
        } else {
          setStatusText("वॉइस इनपुट में त्रुटि। आप टाइप करके पूछ सकते हैं।");
        }
        setIsListening(false);
        setTimeout(() => setStatusText(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Clean up status after a short pause
        setTimeout(() => {
          setStatusText((current) =>
            current && current.includes("सुन रहा") ? null : current
          );
        }, 1500);
      };

      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setStatusText("वॉइस इनपुट शुरू नहीं हो सका। आप लिखकर पूछ सकते हैं।");
      setIsListening(false);
      setTimeout(() => setStatusText(null), 4000);
    }
  };

  const sizeClasses = {
    sm: "p-1.5 text-xs",
    md: "p-2.5 text-sm",
    lg: "p-3 text-base",
  }[buttonSize];

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={startListening}
        aria-label={isListening ? "माइक बंद करें" : "आवाज़ से बोलकर पूछें (Voice Input)"}
        title={
          !isSupported
            ? "वॉइस इनपुट इस ब्राउज़र में उपलब्ध नहीं है"
            : isListening
            ? "सुनना बंद करें (क्लिक करें)"
            : "बोलकर सवाल पूछें (हिंदी / Hinglish वॉइस इनपुट)"
        }
        className={`rounded-lg font-medium transition-all duration-200 flex items-center justify-center cursor-pointer select-none ${sizeClasses} ${
          isListening
            ? "bg-red-600 text-white animate-pulse shadow-md ring-2 ring-red-400"
            : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs hover:border-amber-400 active:scale-95"
        } ${className}`}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 text-white" />
        ) : (
          <Mic className="w-4 h-4 text-amber-800" />
        )}
      </button>

      {/* Real-time Status Tooltip / Toast */}
      {statusText && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 z-50 whitespace-nowrap bg-stone-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-stone-700 flex items-center gap-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          {statusText.includes("अनुमति") || statusText.includes("उपलब्ध नहीं") ? (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : isListening ? (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          ) : null}
          <span>{statusText}</span>
        </div>
      )}
    </div>
  );
};
