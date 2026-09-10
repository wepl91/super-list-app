"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Cooldown en ms para no re-disparar la misma detección del mismo código. */
const COOLDOWN_MS = 2000;

type BarcodeDetectorResult = { rawValue: string };
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
}
type BarcodeDetectorCtor = {
  new (): BarcodeDetectorLike;
  getSupportedFormats: () => Promise<string[]>;
};

type ScannerStatus = "idle" | "opening" | "scanning";

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector ?? null;
}

/** Feature detection: la API puede existir pero fallar al consultarse. */
function detectSupport(): boolean {
  const Ctor = getBarcodeDetectorCtor();
  if (!Ctor) return false;
  try {
    void Promise.resolve(Ctor.getSupportedFormats()).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

interface UseBarcodeScannerOptions {
  onDetect: (rawValue: string) => void;
}

/**
 * Escáner de códigos de barras con la API nativa `BarcodeDetector`:
 * abre la cámara trasera (`getUserMedia`), detecta en un bucle de rAF cuando
 * el video tiene frames decodificables y dispara `onDetect(rawValue)` la
 * primera vez (con cooldown por código). Todo local: sin grabación ni envío.
 * Sin soporte (feature detection) devuelve `supported: false` y no hace nada.
 */
export function useBarcodeScanner({ onDetect }: UseBarcodeScannerOptions) {
  const [supported] = useState(detectSupport);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const genRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const lastDetectRef = useRef<{ code: string; at: number }>({
    code: "",
    at: 0,
  });

  const stepRef = useRef<() => void>(() => {});
  const scheduleStep = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => void stepRef.current());
  }, []);

  const step = useCallback(async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (
      video &&
      detector &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      try {
        const results = await detector.detect(video);
        const raw = results.find((r) => r.rawValue.trim())?.rawValue;
        if (raw) {
          const now = Date.now();
          const last = lastDetectRef.current;
          if (last.code !== raw || now - last.at > COOLDOWN_MS) {
            lastDetectRef.current = { code: raw, at: now };
            onDetectRef.current(raw);
          }
        }
      } catch {
        // Un frame fallado no rompe el bucle.
      }
    }
    scheduleStep();
  }, [scheduleStep]);

  useEffect(() => {
    stepRef.current = () => void step();
  });

  const open = useCallback(async () => {
    const Ctor = getBarcodeDetectorCtor();
    if (!Ctor || !videoRef.current) return;
    const gen = ++genRef.current;
    setStatus("opening");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (gen !== genRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      detectorRef.current = new Ctor();
      const video = videoRef.current;
      try {
        video.srcObject = stream;
      } catch {
        // Algunos entornos (jsdom) no implementan srcObject: no-op.
      }
      runningRef.current = true;
      setStatus("scanning");
      scheduleStep();
    } catch (err) {
      if (gen !== genRef.current) return;
      setStatus("idle");
      const name = (err as { name?: string })?.name;
      setError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Necesito permiso para usar la cámara."
          : "No se pudo abrir la cámara."
      );
    }
  }, [scheduleStep]);

  const close = useCallback(() => {
    genRef.current += 1;
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    detectorRef.current = null;
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        // no-op en entornos sin srcObject.
      }
    }
    setStatus("idle");
  }, []);

  useEffect(() => close, [close]);

  const clearError = useCallback(() => setError(null), []);

  return { supported, status, error, open, close, clearError, videoRef };
}