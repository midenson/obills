"use client";

import { useEffect } from "react";
import { CapacitorPasskey } from "@capgo/capacitor-passkey";

export default function PasskeyBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const setupWebAuthnBridge = async () => {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          await CapacitorPasskey.autoShimWebAuthn();
          console.log("WebAuthn/Passkey Bridge initialized successfully.");
        } catch (err) {
          console.error("Failed to shim WebAuthn:", err);
        }
      }
    };

    setupWebAuthnBridge();
  }, []);

  // This component doesn't alter the UI; it just lets children pass through
  return <>{children}</>;
}