import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VoiceDictationButton from "@/components/VoiceDictationButton";

type ResultEvent = {
  results: ArrayLike<{ isFinal?: boolean; [i: number]: { transcript?: string } }>;
};

const createdInstances: InstanceType<typeof MockRecognition>[] = [];

class MockRecognition {
  lang = "";
  continuous: boolean | null = null;
  interimResults: boolean | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((e: ResultEvent) => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    createdInstances.push(this);
  }
}

const originalRecognition = (window as unknown as Record<string, unknown>)
  .SpeechRecognition;

function latest(): InstanceType<typeof MockRecognition> {
  return createdInstances[createdInstances.length - 1];
}

function fireInterim(transcript: string) {
  latest().onresult?.({ results: [{ isFinal: false, 0: { transcript } }] });
}

function fireFinal(transcript: string) {
  latest().onresult?.({ results: [{ isFinal: true, 0: { transcript } }] });
}

describe("VoiceDictationButton", () => {
  beforeEach(() => {
    createdInstances.length = 0;
    (window as unknown as Record<string, unknown>).SpeechRecognition =
      MockRecognition;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalRecognition) {
      (window as unknown as Record<string, unknown>).SpeechRecognition =
        originalRecognition;
    } else {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    }
  });

  it("no duplica la primer palabra: envía el final completo una sola vez", () => {
    const onInterim = vi.fn();
    const onFinal = vi.fn();
    render(
      <VoiceDictationButton onInterim={onInterim} onFinal={onFinal} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Dictar por voz" }));

    const inst = latest();
    expect(inst.continuous).toBe(false);
    expect(inst.start).toHaveBeenCalledTimes(1);
    inst.onstart?.();

    fireInterim("un elemento");
    expect(onInterim).toHaveBeenCalledWith("un elemento");
    expect(onFinal).not.toHaveBeenCalled();

    fireFinal("un elemento");
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith("un elemento");
    // la frase final también detiene el reconocimiento
    expect(inst.stop).toHaveBeenCalled();
  });

  it("vuelve a escuchar una frase a la vez tras un onend automático", () => {
    render(<VoiceDictationButton onFinal={vi.fn()} onInterim={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Dictar por voz" }));
    const inst = latest();
    inst.onstart?.();

    // onend por silencio: debe reiniciar el reconocimiento
    inst.onend?.();
    expect(inst.start).toHaveBeenCalledTimes(2);
  });
});
