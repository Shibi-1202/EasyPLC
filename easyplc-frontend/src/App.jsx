import React, { useState } from "react";
import Header from "./components/Header.jsx";
import Generator from "./components/Generator.jsx";
import Simulation from "./components/Simulation.jsx";
import History from "./components/History.jsx";

export default function App(){
  const [tab, setTab] = useState("generator");
  const [lastResult, setLastResult] = useState(null);

  return (
    <>
      <Header tab={tab} setTab={setTab}/>
      <main className="main">
        {tab === "generator" && <Generator onResult={(r)=>setLastResult(r)} restore={lastResult}/>}
        {tab === "simulation" && <Simulation/>}
        {tab === "history" && <History onLoad={(r)=>setLastResult(r)} setTab={setTab}/>}
      </main>
    </>
  );
}
