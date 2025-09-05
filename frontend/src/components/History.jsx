import React, { useEffect, useState } from "react";

export default function History({ onLoad, setTab }){
  const [items, setItems] = useState([]);

  const load=()=>{
    const key="easyplc_history";
    setItems(JSON.parse(localStorage.getItem(key) || "[]"));
  };
  useEffect(()=>{ load(); },[]);

  const clear=()=>{
    if(confirm("Clear history?")){
      localStorage.removeItem("easyplc_history"); setItems([]);
    }
  };

  const restore=(item)=>{
    onLoad?.(item);
    setTab?.("generator");
  };

  return (
    <section className="section" style={{flexDirection:"column"}}>
      <div className="panel">
        <h2>History</h2>
        <div className="row">
          <button onClick={load}>⟳ Refresh</button>
          <button onClick={clear}>🗑 Clear</button>
        </div>
      </div>

      <div className="panel">
        {items.length===0 && <p className="subtle">No history yet.</p>}
        {items.map((it, idx)=>(
          <div className="history-item" key={idx}>
            <div className="history-head">
              <div>
                <div className="small">{new Date(it.ts).toLocaleString()}</div>
                <div style={{marginTop:6}} className="subtle">NL:</div>
                <div style={{marginTop:4}}>{it.nl}</div>
              </div>
              <button className="restore" onClick={()=>restore(it)}>↩ Restore</button>
            </div>
            <details style={{marginTop:8}}>
              <summary>Structured Text</summary>
              <pre>{it.st_code || ""}</pre>
            </details>
            <details style={{marginTop:8}}>
              <summary>Ladder XML</summary>
              <pre>{it.ld_xml || ""}</pre>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}
