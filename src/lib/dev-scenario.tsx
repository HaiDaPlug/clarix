"use client";

import { createContext, useContext, useState } from "react";

type ScenarioId = "scenario-1" | "scenario-2" | "scenario-3";

interface DevScenarioContextValue {
  activeId: ScenarioId;
  setActiveId: (id: ScenarioId) => void;
}

const DevScenarioContext = createContext<DevScenarioContextValue>({
  activeId: "scenario-2",
  setActiveId: () => {},
});

export function DevScenarioProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<ScenarioId>("scenario-2");
  return (
    <DevScenarioContext.Provider value={{ activeId, setActiveId }}>
      {children}
    </DevScenarioContext.Provider>
  );
}

export function useDevScenario() {
  return useContext(DevScenarioContext);
}
