import { AddAccountWizard } from "@/components/ProfileSetup/AddAccountWizard";

export function SetupGate() {
  return (
    <div className="relative h-screen w-screen bg-[radial-gradient(1200px_700px_at_18%_-10%,#1a1636_0%,#0a0913_55%,#07060d_100%)]">
      <AddAccountWizard dismissible={false} />
    </div>
  );
}
