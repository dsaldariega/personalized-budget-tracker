import { Metadata } from "next";
import { SubscriptionsManager } from "@/components/subscriptions-manager";

export const metadata: Metadata = { title: "Subscriptions" };

export default function SubscriptionsPage() {
  return <SubscriptionsManager />;
}
