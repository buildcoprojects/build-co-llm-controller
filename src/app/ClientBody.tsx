"use client";

import { useEffect } from "react";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
<<<<<<< HEAD
    <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
=======
    <body className="antialiased" suppressHydrationWarning>
>>>>>>> 09fbac6 (Phase 1: Rebuild /api, Blob, Admin ChatPanel, artefact bridge logic (no artefact or legacy blob overwrite))
      {children}
    </body>
  );
}
