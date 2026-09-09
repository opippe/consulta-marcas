"use client";

import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<Turnstile> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timer = setTimeout(failed, 15000);
    function failed() {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new Error("challenge-load"));
    }
    script.onerror = failed;
    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else failed();
    };
    document.head.appendChild(script);
  });
  return loading;
}

export default function TurnstileChallenge({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "error">("loading");
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const productionTestKey = process.env.NODE_ENV === "production" && /^(1x|2x|3x)0+/.test(sitekey ?? "");
  const unavailable = !sitekey || productionTestKey;

  useEffect(() => {
    let active = true;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    onToken("");
    if (unavailable) return;
    void loadTurnstile().then(turnstile => {
      if (!active || !container.current) return;
      api = turnstile;
      widget = turnstile.render(container.current, {
        sitekey, action: "trademark_search", language: "pt-br", theme: "light", size: "flexible",
        callback: (token: string) => { if (active) { onToken(token); setStatus("verified"); } },
        "expired-callback": () => { if (active) { onToken(""); setStatus("error"); } },
        "error-callback": () => { if (active) { onToken(""); setStatus("error"); } },
        "timeout-callback": () => { if (active) { onToken(""); setStatus("error"); } },
      });
      setStatus("ready");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; if (widget !== undefined) api?.remove(widget); };
  }, [attempt, onToken, sitekey, unavailable]);

  return <div className="security-check">
    <div ref={container} />
    <p className="form-note" role="status">
      {unavailable ? "A verificação de segurança está indisponível. Tente novamente mais tarde."
        : status === "error" ? "A verificação não foi concluída ou expirou. Tente novamente."
        : status === "verified" ? "Verificação de segurança concluída."
        : status === "loading" ? "Carregando verificação de segurança…" : "Conclua a verificação de segurança para consultar."}
    </p>
    {!unavailable && status === "error" && <button type="button" className="back-button"
      onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Tentar verificação novamente</button>}
  </div>;
}
