import React from "react";

export default function CodePane({ title, value, filename, onDownload, hint }){
  const copy= async ()=>{
    try { await navigator.clipboard.writeText(value || ""); alert("Copied!"); }
    catch { alert("Copy failed."); }
  };
  return (
    <div className="codepane">
      <div className="head">
        <div className="title">{title}</div>
        <div className="tools">
          <button onClick={copy}>Copy</button>
          <button onClick={onDownload}>Download</button>
        </div>
      </div>
      {hint && <div className="subtle" style={{padding:"0 12px 8px"}}>{hint}</div>}
      <pre>{value}</pre>
    </div>
  );
}
