import type { Metadata } from "next";
import { TransactionsManager } from "@/components/transactions-manager";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return <TransactionsManager />;
}
