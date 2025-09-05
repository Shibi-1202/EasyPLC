import React from "react";

export default function Header({tab, setTab}){
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("easyplc_theme", next);
  };

  return (
    <header className="header">
      <div className="brand">
        <img src="EasyPLC_logo.jpg"/>
        <h1>EasyPLC</h1>
        <span className="badge">IEC 61131-3</span>
      </div>
      <div className="nav">
        <button className={tab==="generator"?"active":""} onClick={()=>setTab("generator")}>Generator</button>
        {/* <button className={tab==="simulation"?"active":""} onClick={()=>setTab("simulation")}>Simulation</button> */}
        <button className={tab==="history"?"active":""} onClick={()=>setTab("history")}>History</button>
      </div>
      <div className="toggle">
        <button onClick={toggleTheme}>🌓 Theme</button>
      </div>
    </header>
  );
}
