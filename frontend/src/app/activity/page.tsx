import { Metadata } from "next";
import { ActivityManager } from "@/components/activity-manager";

export const metadata: Metadata = { title: "Activity Log" };

export default function ActivityPage() {
  return <ActivityManager />;
}
