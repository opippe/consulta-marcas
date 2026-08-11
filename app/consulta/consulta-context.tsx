"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ConsultaState } from "./types";

type ConsultaContextValue = {
  consulta: ConsultaState | null;
  setConsulta: (consulta: ConsultaState | null) => void;
};

const ConsultaContext = createContext<ConsultaContextValue | null>(null);

export function ConsultaProvider({ children }: { children: ReactNode }) {
  const [consulta, setConsulta] = useState<ConsultaState | null>(null);

  return (
    <ConsultaContext.Provider value={{ consulta, setConsulta }}>
      {children}
    </ConsultaContext.Provider>
  );
}

export function useConsulta() {
  const context = useContext(ConsultaContext);
  if (!context) {
    throw new Error("useConsulta deve ser usado dentro de ConsultaProvider.");
  }

  return context;
}
