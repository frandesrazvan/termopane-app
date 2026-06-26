"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure should not block the authenticated sales workflow.
    });
  }, []);

  return null;
}
