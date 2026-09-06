"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A falha no service worker nao deve bloquear login, dados ou operacao.
    });
  }, []);

  return null;
}
