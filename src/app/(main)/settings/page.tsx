import { SettingsPanel } from "@/components/settings/settings-panel";

export const metadata = { title: "Settings · Watchruum" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Settings</h1>
      <SettingsPanel />
    </div>
  );
}
