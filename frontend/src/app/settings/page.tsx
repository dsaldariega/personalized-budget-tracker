import { Metadata } from "next";
import { SettingsManager } from "@/components/settings-manager";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsManager />;
}
