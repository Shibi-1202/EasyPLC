import React, { useRef, useState } from "react";

export default function VoiceButton({ onText }){
  const [active, setActive] = useState(false);
  const recRef = useRef(null);

  const start=()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ alert("Speech Recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = ()=> setActive(true);
    rec.onend = ()=> { setActive(false); recRef.current = null; };
    rec.onresult = (e)=> { const t = e.results[0][0].transcript; onText?.(t); };
    rec.onerror = ()=> setActive(false);
    recRef.current = rec;
    rec.start();
  };

  return (
    <button onClick={start} title="Voice to text">
      {active ? "🎙 Listening…" : "🎤 Voice"}
    </button>
  );
}
