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


// --- START: New, More Powerful Ladder Visualization Logic ---

/**
 * Parses PLCopen XML into a structured format for rendering, including parallel branches.
 * @param {string} xmlString The PLCopen XML from the API.
 * @returns {Array} A list of rung objects with structured branches.
 */
function parseLadderLogicFromXML(xmlString) {
    if (!xmlString) return [];
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    const ldBody = xmlDoc.querySelector("LD");
    if (!ldBody) return [];

    const elements = new Map();
    ldBody.childNodes.forEach(node => {
        if (node.nodeType === 1) { // Element nodes only
            const id = node.getAttribute('localId');
            if (id) {
                elements.set(id, {
                    id: id,
                    tagName: node.tagName.toLowerCase(),
                    variable: node.querySelector("variable")?.textContent || '',
                    negated: node.getAttribute('negated') === 'true',
                    inputs: Array.from(node.querySelectorAll("connectionPointIn > connection")).map(c => c.getAttribute("refLocalId")),
                });
            }
        }
    });

    const rungs = [];
    for (const el of elements.values()) {
        if (el.tagName === 'coil') {
            const traceBranch = (startId) => {
                const branch = [];
                let currentId = startId;
                while (currentId) {
                    const currentEl = elements.get(currentId);
                    if (!currentEl || currentEl.tagName === 'leftpowerrail') break;
                    
                    if (currentEl.tagName === 'contact' || currentEl.tagName === 'coil') {
                         branch.unshift({ type: currentEl.tagName, variable: currentEl.variable, negated: currentEl.negated });
                    }
                    
                    // For series, there's only one input.
                    currentId = currentEl.inputs.length > 0 ? currentEl.inputs[0] : null;
                }
                return branch;
            };

            const branches = el.inputs.map(inputId => traceBranch(inputId));
            rungs.push({ coil: { variable: el.variable }, branches: branches.filter(b => b.length > 0) });
        }
    }
    return rungs;
}


/**
 * Renders the parsed ladder logic IR into an SVG diagram, including branches.
 * @param {{ rungs: Array }} props
 */
const LadderDiagramVisualizer = ({ rungs }) => {
    if (!rungs || rungs.length === 0) {
        return <div className="ladder-placeholder">Ladder diagram will be rendered here.</div>;
    }

    const RUNG_V_SPACING = 80;
    const ELEMENT_WIDTH = 80;
    const PADDING = 40;
    const BRANCH_V_SPACING = 30;
    const VIEW_WIDTH = 800;

    let totalHeight = PADDING * 2;
    const rungLayouts = rungs.map(rung => {
        const startY = totalHeight;
        const height = Math.max(1, rung.branches.length) * BRANCH_V_SPACING + 20;
        totalHeight += height;
        return { startY, height, ...rung };
    });
    
    return (
        <div className="ladder-diagram-container">
            <svg viewBox={`0 0 ${VIEW_WIDTH} ${totalHeight}`} width="100%">
                {/* Power Rails */}
                <line x1={PADDING} y1={PADDING / 2} x2={PADDING} y2={totalHeight - PADDING / 2} stroke="#333" strokeWidth="2" />
                <line x1={VIEW_WIDTH - PADDING} y1={PADDING / 2} x2={VIEW_WIDTH - PADDING} y2={totalHeight - PADDING / 2} stroke="#333" strokeWidth="2" />

                {rungLayouts.map((rung, i) => {
                    const midY = rung.startY + rung.height / 2;
                    const hasBranches = rung.branches.length > 1;

                    return (
                        <g key={i}>
                            {/* Render each branch */}
                            {rung.branches.map((branch, j) => {
                                const y = midY + (j - (rung.branches.length - 1) / 2) * BRANCH_V_SPACING;
                                let lastX = PADDING;

                                // Line from left rail to first element
                                <line x1={lastX} y1={y} x2={lastX + ELEMENT_WIDTH / 2} y2={y} stroke="#333" strokeWidth="1.5" />
                                
                                branch.forEach((el, k) => {
                                    const x = PADDING + ELEMENT_WIDTH / 2 + k * ELEMENT_WIDTH;
                                    lastX = x + ELEMENT_WIDTH;
                                    return (
                                        <g key={k} transform={`translate(${x}, ${y})`}>
                                            <line x1={ELEMENT_WIDTH/2} y1={0} x2={-ELEMENT_WIDTH/2} y2={0} stroke="#333" strokeWidth="1.5" />
                                            <text x={0} y={-12} textAnchor="middle" fontSize="12">{el.variable}</text>
                                            <line x1={-10} y1={-10} x2={-10} y2={10} stroke="#333" strokeWidth="2" />
                                            <line x1={10} y1={-10} x2={10} y2={10} stroke="#333" strokeWidth="2" />
                                            {el.negated && <line x1={-15} y1={10} x2={15} y2={-10} stroke="#333" strokeWidth="1.5" />}
                                        </g>
                                    );
                                });
                                // Line from last contact to branch merge point
                                <line x1={lastX - ELEMENT_WIDTH/2} y1={y} x2={VIEW_WIDTH - PADDING - ELEMENT_WIDTH} y2={y} stroke="#333" strokeWidth="1.5" />
                            })}

                            {/* Coil */}
                            <g transform={`translate(${VIEW_WIDTH - PADDING - ELEMENT_WIDTH / 2}, ${midY})`}>
                                <text x={0} y={-12} textAnchor="middle" fontSize="12">{rung.coil.variable}</text>
                                <path d="M -10 -10 A 10 10 0 0 0 -10 10" stroke="#333" strokeWidth="2" fill="none" />
                                <path d="M 10 -10 A 10 10 0 0 1 10 10" stroke="#333" strokeWidth="2" fill="none" />
                                <line x1={10} y1={0} x2={ELEMENT_WIDTH / 2} y2={0} stroke="#333" strokeWidth="1.5" />
                            </g>
                            
                             {/* Branch connectors */}
                            {hasBranches && <>
                                <line x1={PADDING + ELEMENT_WIDTH / 2} y1={midY - (rung.branches.length - 1) / 2 * BRANCH_V_SPACING} x2={PADDING + ELEMENT_WIDTH/2} y2={midY + (rung.branches.length - 1) / 2 * BRANCH_V_SPACING} stroke="#333" strokeWidth="1.5" />
                                <line x1={VIEW_WIDTH - PADDING - ELEMENT_WIDTH} y1={midY - (rung.branches.length - 1) / 2 * BRANCH_V_SPACING} x2={VIEW_WIDTH - PADDING - ELEMENT_WIDTH} y2={midY + (rung.branches.length - 1) / 2 * BRANCH_V_SPACING} stroke="#333" strokeWidth="1.5" />
                            </>}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

// --- END: New Ladder Diagram Visualization Logic ---

export default function Generator({ onResult, restore }) {
  const [nl, setNl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stCode, setStCode] = useState("");
  const [xmlCode, setXmlCode] = useState("");
  const [ladderRungs, setLadderRungs] = useState([]);

  const [activeTab, setActiveTab] = useState("st");

  useEffect(() => {
    if (restore?.nl) {
      setNl(restore.nl);
      setStCode(restore.st_code || "");
      const xml = restore.xml_code || "";
      setXmlCode(xml);
      if (xml) {
          setLadderRungs(parseLadderLogicFromXML(xml));
      }
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
    setXmlCode("");
    setLadderRungs([]);

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
      const xml = data.xml_code || "<!-- No XML generated -->";

      setStCode(st);
      setXmlCode(xml);
      setLadderRungs(parseLadderLogicFromXML(xml));
      
      const record = { nl, st_code: st, xml_code: xml };
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
      case "xml":
        return <CodePane title="PLCopen XML" value={xmlCode || "<!-- XML will appear here -->"} onDownload={() => download("program.xml", xmlCode)} language="xml" />;
      case "ladder":
        return <LadderDiagramVisualizer rungs={ladderRungs} />;
      default:
        return null;
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
          <button onClick={() => setActiveTab("xml")} className={activeTab === "xml" ? "active" : ""}>PLCopen XML</button>
        </div>
      </div>
      <div className="panel" style={{ flex: 1 }}>
        {loading ? <div className="center-flex"><LoaderDots/></div> : renderRightPanel()}
      </div>
    </section>
  );
}

