import { createContext, useContext } from "react";
import type { RepRegistry } from "@src/core/seriesStore";

export const RepRegistryContext = createContext<RepRegistry | null>(null);

export function useRepRegistry(): RepRegistry | null {
  return useContext(RepRegistryContext);
}

export const RepRegistryProvider = RepRegistryContext.Provider;
