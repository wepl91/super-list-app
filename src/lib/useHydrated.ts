"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const serverSnapshot = false;

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => serverSnapshot
  );
}