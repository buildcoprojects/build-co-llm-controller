<<<<<<< HEAD
import { Layout } from "@/components/layout";
import { SignalForm } from "@/components/signal-form";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col items-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Signal Execution Shell
        </h1>
        <p className="text-muted-foreground text-center max-w-prose">
          Central control panel for signal intake, dispatch, and monitoring
        </p>
        <SignalForm />
      </div>
    </Layout>
  );
=======
export default function Home() {
  return <></>;
>>>>>>> 09fbac6 (Phase 1: Rebuild /api, Blob, Admin ChatPanel, artefact bridge logic (no artefact or legacy blob overwrite))
}
