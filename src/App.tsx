import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import Dashboard from "./pages/Dashboard";
import AgentRegistry from "./pages/AgentRegistry";
import DecisionEngine from "./pages/DecisionEngine";
import DecisionIntelligence from "./pages/DecisionIntelligence";
import ProductionFeedback from "./pages/ProductionFeedback";
import Architecture from "./pages/Architecture";
import Integrations from "./pages/Integrations";
import ExecutiveFinOps from "./pages/ExecutiveFinOps";
import type { NavigationPage } from "./types";

export default function App() {
  const [activePage, setActivePage] = useState<NavigationPage>("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "agents":
        return <AgentRegistry />;
      case "decision-engine":
        return <DecisionEngine />;
      case "decision-intelligence":
        return <DecisionIntelligence />;
      case "production-feedback":
        return <ProductionFeedback />;
      case "executive-finops":
        return <ExecutiveFinOps />;
      case "architecture":
        return <Architecture />;
      case "integrations":
        return <Integrations />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <TopBar activePage={activePage} />
      <main className="ml-60 pt-[60px]">
        <div className="p-6 max-w-7xl mx-auto">{renderPage()}</div>
      </main>
    </div>
  );
}
