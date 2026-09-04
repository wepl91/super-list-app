"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";

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
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const stoppedRef = useRef(false);

  if (!supported) return null;

  function handleToggle() {
    if (listening) {
      stoppedRef.current = true;
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    stoppedRef.current = false;
    let shouldRestart = true;
    rec.lang = "es-AR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      if (recRef.current === rec) recRef.current = null;
      if (stoppedRef.current) return;
      // Si terminó por una frase detectada o por silencio, seguimos
      // escuchando (una frase a la vez) hasta que el usuario detenga.
      if (shouldRestart) {
        try {
          rec.start();
        } catch {
          /* noop */
        }
      }
    };
    rec.onresult = (event) => {
      const results = event.results;
      // Tomamos el último resultado: representa lo que se acaba de decir.
      const last = results[results.length - 1];
      const transcript = last?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      if (last.isFinal) {
        onFinal?.(transcript);
        shouldRestart = false;
        rec.stop();
      } else {
        onInterim?.(transcript);
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
      <Mic className="h-5 w-5" aria-hidden />
    </button>
  );
}