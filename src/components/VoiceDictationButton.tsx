"use client";

import { useState } from "react";

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: {
    results: ArrayLike<{
      isFinal?: boolean;
      [i: number]: { transcript?: string };
    }>;
  }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceDictationButtonProps {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (msg: string) => void;
}

/** Botón de micrófono opcional para dictado por voz.
 *  Se omite si el navegador no soporta la Web Speech API (feature detection). */
export default function VoiceDictationButton({
  onInterim,
  onFinal,
  onError,
}: VoiceDictationButtonProps) {
  // Feature detection una sola vez al montar (SSR-safe).
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);

  if (!supported) return null;

  function handleToggle() {
    if (listening) {
      setListening(false);
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      const results = event.results;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const transcript = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (interimText) onInterim?.(interimText.trim());
      if (finalText.trim()) {
        onFinal?.(finalText.trim());
        rec.stop();
      }
    };
    rec.onerror = (event) => {
      const { error } = event;
      if (error === "not-allowed" || error === "service-not-allowed") {
        onError?.("Necesito permiso para usar el micrófono.");
      } else if (error !== "aborted" && error !== "no-speech") {
        onError?.("No se pudo capturar el dictado.");
      }
    };
    try {
      rec.start();
    } catch {
      onError?.("No se pudo iniciar el dictado.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={listening}
      aria-label={listening ? "Detener dictado por voz" : "Dictar por voz"}
      title={listening ? "Detener dictado" : "Dictar por voz"}
      className={`shrink-0 rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        listening ? "text-red-600" : "text-text-secondary"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M6 3.75A2.75 2.75 0 0 1 8.75 1h2.5A2.75 2.75 0 0 1 14 3.75v5.5a2.75 2.75 0 0 1-2.75 2.75h-2.5A2.75 2.75 0 0 1 6 9.25v-5.5ZM16 10a.75.75 0 0 1 .75.75V11a6 6 0 0 1-5.25 5.96v1.29h2a.75.75 0 0 1 0 1.5H6.5a.75.75 0 0 1 0-1.5h2v-1.29A6 6 0 0 1 3.25 11v-.25a.75.75 0 0 1 1.5 0V11a4.5 4.5 0 0 0 9 0v-.25A.75.75 0 0 1 14.5 10H16Z" />
      </svg>
    </button>
  );
}