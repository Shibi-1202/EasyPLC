import React, { useEffect, useState, useRef, useCallback } from "react";

// --- START: Inlined Shared Components ---

const LoaderDots = () => (
  <div className="loader-dots">
    <span /><span /><span />
  </div>
);

const CodePane = ({ title, value, onDownload, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-pane">
      <div className="code-pane-header">
        <h3>{title}</h3>
        <div className="row">
          <button onClick={handleCopy} className="icon-button">{copied ? 'Copied!' : 'Copy'}</button>
          <button onClick={onDownload} className="icon-button">Download</button>
        </div>
      </div>
      <pre><code className={`language-${language}`}>{value}</code></pre>
    </div>
  );
};

// --- END: Inlined Shared Components ---

// --- START: Updated VoiceButton with Real Voice Input and Error Handling ---
const VoiceButton = ({ onText }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please allow microphone access in your browser settings to use this feature.");
      } else if (event.error === 'no-speech') {
        alert("No speech was detected. Please try speaking clearly into your microphone.");
      } else {
        alert(`An error occurred during speech recognition: ${event.error}`);
      }
      setIsListening(false);
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onText(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
    };
  }, [onText]);

  const handleVoiceClick = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("Voice recognition is not supported in your browser.");
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <button onClick={handleVoiceClick} className={`icon-button ${isListening ? "active" : ""}`} title="Use Voice Input">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
      </svg>
    </button>
  );
};
// --- END: Updated VoiceButton ---


export default function Generator({ onResult, restore }) {
  const [nl, setNl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stCode, setStCode] = useState("");

  const [activeTab, setActiveTab] = useState("st");

  useEffect(() => {
    if (restore?.nl) {
      setNl(restore.nl);
      setStCode(restore.st_code || "");
    }
  }, [restore]);

  const saveHistory = (payload) => {
    localStorage.setItem("easyplc_history", JSON.stringify([
        { ...payload, ts: Date.now() },
        ...JSON.parse(localStorage.getItem("easyplc_history") || "[]")
    ].slice(0, 50)));
  };

  const generate = async () => {
    if (!nl.trim()) return;
    setLoading(true);
    setStCode("");
    

    try {
      const response = await fetch("{https://easyplc.onrender.com}/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nl }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "API request failed" }));
        throw new Error(errData.detail);
      }

      const data = await response.json();
      const st = data.st_code || "(* No ST code generated *)";
      

      setStCode(st);
      
     
      
      const record = { nl, st_code: st };
      saveHistory(record);
      onResult?.(record);

    } catch (err) {
      console.error("Error generating code:", err);
      setStCode(`(* Error: ${err.message} *)`);
    } finally {
      setLoading(false);
    }
  };
  
  const download = (filename, text) => {
    const blob = new Blob([text], { type: "application/xml" });
    const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const renderRightPanel = () => {
    switch (activeTab) {
      case "st":
        return <CodePane title="Structured Text (ST)" value={stCode || "(* ST code will appear here *)"} onDownload={() => download("program.st", stCode)} language="swift" />;
    }
  };

  const handleVoiceText = useCallback((text) => {
    setNl((prev) => (prev ? prev.trim() + " " + text : text));
  }, []);


  return (
    <section className="section generator">
      <div className="panel" style={{ minWidth: "260px" }}>
        <h2>Control Specification</h2>
        <textarea value={nl} onChange={(e) => setNl(e.target.value)} placeholder="e.g., If StartButton is on, turn on MotorA." rows={8} />
        
        <div className="row">
          <button className="primary" onClick={generate} disabled={loading}>
            {loading ? <><LoaderDots /> Generating...</> : "▶ Generate Project"}
          </button>
           <VoiceButton onText={handleVoiceText} />
        </div>

        <div className="row" style={{ marginTop: "12px" }}>
          <button onClick={() => setActiveTab("st")} className={activeTab === "st" ? "active" : ""}>Structured Text</button>
        </div>
      </div>
      <div className="panel" style={{ flex: 1 }}>
        {loading ? <div className="center-flex"><LoaderDots/></div> : renderRightPanel()}
      </div>
    </section>
  );
}

