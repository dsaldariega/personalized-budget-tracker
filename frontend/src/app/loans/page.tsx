import { Metadata } from "next";
import { LoansManager } from "@/components/loans-manager";

export const metadata: Metadata = { title: "Loans" };

export default function LoansPage() {
  return <LoansManager />;
}
