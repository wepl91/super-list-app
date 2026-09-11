import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useItemSwipe } from "./useItemSwipe";

function Harness({
  disabled = false,
  onRight = vi.fn(),
  onLeft = vi.fn(),
  ignore,
}: {
  disabled?: boolean;
  onRight?: () => void;
  onLeft?: () => void;
  ignore?: (t: Element) => boolean;
}) {
  const swipe = useItemSwipe({ disabled, onSwipeRight: onRight, onSwipeLeft: onLeft, ignore });
  return (
    <div
      data-testid="row"
      style={{ touchAction: "pan-y", transform: swipe.swiping ? `translateX(${swipe.offsetX}px)` : undefined }}
      onPointerDown={swipe.onPointerDown}
    >
      <button type="button" data-drag-handle aria-label="mover">
        mover
      </button>
    </div>
  );
}

function gesture(fromX: number, toX: number, fromY = 10, toY = 10) {
  fireEvent.pointerDown(screen.getByTestId("row"), {
    pointerId: 1,
    clientX: fromX,
    clientY: fromY,
  });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: toX, clientY: toY });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: toX, clientY: toY });
}

describe("useItemSwipe", () => {
  it("ejecuta onSwipeRight al superar el umbral a la derecha", () => {
    const onRight = vi.fn();
    render(<Harness onRight={onRight} />);
    act(() => gesture(0, 80));
    expect(onRight).toHaveBeenCalledTimes(1);
  });

  it("ejecuta onSwipeLeft al superar el umbral a la izquierda", () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    act(() => gesture(100, 10));
    expect(onLeft).toHaveBeenCalledTimes(1);
  });

  it("no ejecuta nada por debajo del umbral", () => {
    const onRight = vi.fn();
    const onLeft = vi.fn();
    render(<Harness onRight={onRight} onLeft={onLeft} />);
    act(() => gesture(0, 30));
    expect(onRight).not.toHaveBeenCalled();
    expect(onLeft).not.toHaveBeenCalled();
  });

  it("muestra feedback en vivo (transform) durante el gesto y lo restaura al soltar", () => {
    render(<Harness />);
    fireEvent.pointerDown(screen.getByTestId("row"), { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 60, clientY: 2 });
    expect(screen.getByTestId("row")).toHaveStyle({ transform: "translateX(60px)" });
    act(() => fireEvent.pointerUp(window, { pointerId: 1, clientX: 60, clientY: 2 }));
    expect(screen.getByTestId("row")).not.toHaveAttribute("style", /translateX/);
  });

  it("un movimiento vertical dominante no dispara el gesto", () => {
    const onRight = vi.fn();
    render(<Harness onRight={onRight} />);
    act(() => gesture(0, 80, 10, 150));
    expect(onRight).not.toHaveBeenCalled();
  });

  it("disabled ignora el gesto completo (no toca callbacks ni estados)", () => {
    const onRight = vi.fn();
    render(<Harness disabled onRight={onRight} />);
    fireEvent.pointerDown(screen.getByTestId("row"), { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 90, clientY: 2 });
    act(() => fireEvent.pointerUp(window, { pointerId: 1, clientX: 90, clientY: 2 }));
    expect(onRight).not.toHaveBeenCalled();
    expect(screen.getByTestId("row")).not.toHaveAttribute("style", /translateX/);
  });

  it("ignore() evita arrancar el gesto desde un target excluido (p. ej. el handle)", () => {
    const onRight = vi.fn();
    render(<Harness onRight={onRight} ignore={(t) => t.closest("[data-drag-handle]") !== null} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "mover" }), {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 90, clientY: 2 });
    act(() => fireEvent.pointerUp(window, { pointerId: 1, clientX: 90, clientY: 2 }));
    expect(onRight).not.toHaveBeenCalled();
    expect(screen.getByTestId("row")).not.toHaveAttribute("style", /translateX/);
  });
});