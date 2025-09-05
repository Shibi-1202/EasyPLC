import React, { useState } from "react";

export default function Simulation(){
  const [tank, setTank] = useState(75);
  const [temp, setTemp] = useState(35);
  const [estop, setEstop] = useState(false);
  const [status, setStatus] = useState("Stopped");
  const [out, setOut] = useState({ valveA:"OPEN", pumpB:"RUNNING", heater:"ON" });

  const run=()=>{
    setStatus("Running");
    setOut({
      valveA: tank > 90 ? "CLOSED" : "OPEN",
      pumpB: tank > 90 ? "STOPPED" : "RUNNING",
      heater: temp < 40 ? "ON" : "OFF"
    });
  };
  const reset=()=>{
    setTank(75); setTemp(35); setEstop(false); setStatus("Stopped");
    setOut({ valveA:"OPEN", pumpB:"RUNNING", heater:"ON" });
  };

  return (
    <section className="section">
      <div className="panel" style={{maxWidth:560}}>
        <h2>System Inputs</h2>
        <div className="controls">
          <label>Tank Level <input type="range" min="0" max="100" value={tank} onChange={e=>setTank(+e.target.value)} /></label>
          <label>Temperature <input type="range" min="0" max="100" value={temp} onChange={e=>setTemp(+e.target.value)} /></label>
          <label>Emergency Stop <input type="checkbox" checked={estop} onChange={e=>setEstop(e.target.checked)} /></label>
        </div>
        <div className="row">
          <button className="primary" onClick={run}>▶ Run</button>
          <button onClick={reset}>⟳ Reset</button>
        </div>
      </div>

      <div className="panel">
        <h2>System Outputs <span className="status">{status}</span></h2>
        <div className="outputs">
          <ul>
            <li>Valve A: {out.valveA}</li>
            <li>Pump B: {out.pumpB}</li>
            <li>Heater: {out.heater}</li>
          </ul>
          <pre style={{marginTop:12}}>
{`TankLevel = ${tank}%
Temperature = ${temp}°C
EmergencyStop = ${estop}
ValveA = ${out.valveA}
PumpB = ${out.pumpB}
Heater = ${out.heater}`}
          </pre>
        </div>
      </div>
    </section>
  );
}
