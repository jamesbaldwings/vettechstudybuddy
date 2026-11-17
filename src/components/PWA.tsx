"use client";

import { useEffect, useState } from "react";

// Registers the service worker once the page has loaded.
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const go = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  }, []);
  return null;
}

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// "Add to home screen" card. Android/desktop Chrome get a one-tap button; iPhone gets instructions.
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("install-dismissed") === "1";
    } catch {}
    if (standalone || dismissed) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) setHidden(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;
  const dismiss = () => {
    try {
      localStorage.setItem("install-dismissed", "1");
    } catch {}
    setHidden(true);
  };

  return (
    <div className="card install">
      <h3>Keep me on your home screen</h3>
      <p className="muted small">
        {ios
          ? "Tap the Share button in Safari, then “Add to Home Screen.” Your plan will be one tap away."
          : "Install the app so your plan and daily practice are one tap away."}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {evt && (
          <button
            className="btn"
            onClick={async () => {
              await evt.prompt();
              await evt.userChoice;
              setHidden(true);
            }}
          >
            Install
          </button>
        )}
        <button className="btn ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
