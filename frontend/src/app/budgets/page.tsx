import type { Metadata } from "next";
import { BudgetsManager } from "@/components/budgets-manager";

export const metadata: Metadata = { title: "Budgets" };

export default function BudgetsPage() {
  return <BudgetsManager />;
}
