import { SuperCommandField } from "@/app/plattform/gamification/CommandField";

export default function SuperAdminTerminalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Admin Terminal</h1>
        <p className="mt-1 text-sm text-white/40">Vollzugriff — alle Befehle ohne Schulbeschränkung</p>
      </div>
      <div className="max-w-3xl">
        <SuperCommandField />
      </div>
    </div>
  );
}
