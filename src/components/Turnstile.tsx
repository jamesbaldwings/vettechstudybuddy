"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

let loader: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("turnstile load failed"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

// Renders the Cloudflare check. `reset` changes after each submit so a used token is replaced.
export default function Turnstile({ siteKey, onToken, reset = 0 }: { siteKey: string | null; onToken: (t: string) => void; reset?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey) return;
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !box.current || !window.turnstile) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
          appearance: "interaction-only",
        });
      })
      .catch(() => {});
    return () => {
      gone = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (reset && id.current && window.turnstile) {
      cb.current("");
      window.turnstile.reset(id.current);
    }
  }, [reset]);

  if (!siteKey) return null;
  return <div ref={box} style={{ margin: "8px 0" }} />;
}
