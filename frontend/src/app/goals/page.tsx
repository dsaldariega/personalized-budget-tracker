import { Metadata } from "next";
import { GoalsManager } from "@/components/goals-manager";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return <GoalsManager />;
}
