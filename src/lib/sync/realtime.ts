"use client";

import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useListStore } from "../stores/listStore";
import { toListItem, type ListItemRow } from "./db";

/**
 * Configura un canal Realtime sobre `list_items` para las listas dadas.
 * Al recibir eventos INSERT/UPDATE/DELETE actualiza el store local al instante
 * (colaboración en vivo). Es una optimización de visualización: el pull al
 * reconectar garantiza consistencia offline.
 */
export function useListItemsRealtime(
  supabase: SupabaseClient | null,
  listIds: string[]
) {
  const listIdKey = listIds.join(",");
  useEffect(() => {
    if (!supabase || listIds.length === 0) return;

    const channel = supabase
      .channel("list-items-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items" },
        (payload) => {
          const newRow = payload.new as ListItemRow | null;
          const oldRow = payload.old as ListItemRow | null;
          const listId = newRow?.list_id ?? oldRow?.list_id;
          if (!listId || !listIds.includes(listId)) return;

          if (payload.eventType === "DELETE") {
            const itemId = oldRow?.id as string;
            useListStore
              .getState()
              .applyRemoteRemoveItem(listId, itemId);
          } else {
            if (!newRow || !listIds.includes(newRow.list_id)) return;
            useListStore
              .getState()
              .applyRemoteListItem(newRow.list_id, toListItem(newRow));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, listIdKey]);
}
