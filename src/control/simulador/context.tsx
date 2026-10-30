import { createContext } from "react";
import type { BudgetModel } from "./model";
export type SimulatorBudgetContext = { model: BudgetModel; update: (key: keyof BudgetModel, value: unknown) => void; stage: number; readOnly: boolean };
export const SimulatorContext = createContext<SimulatorBudgetContext | null>(null);