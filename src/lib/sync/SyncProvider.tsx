"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../supabase/auth";
import { getSupabase } from "../supabase/client";
import { useListStore } from "../stores/listStore";
import { pullAll } from "./service";
import { useListItemsRealtime } from "./realtime";
import { getSharedMemberEmails } from "@/app/supabase-actions";

export function SyncProvider() {
  const { user } = useAuth();
  const setServerUserId = useListStore((s) => s.setServerUserId);
  const setOnline = useListStore((s) => s.setOnline);
  const setListSharedMembers = useListStore((s) => s.setListSharedMembers);
  const listIds = useListStore(
    useShallow((s) => (s.serverUserId ? s.lists.map((l) => l.id) : []))
  );

  const supabase = getSupabase();

  useEffect(() => {
    setServerUserId(user?.id ?? null);
    if (!user || !supabase) return;

    // hidratación cloud: pull de listas + merge
    pullAll(supabase, user.id).catch((err) =>
      console.error("Error hidratando listas:", err)
    );

    // emails de los miembros compartidos (para las listas donde soy owner)
    getSharedMemberEmails()
      .then((shared) => {
        const byList = new Map<string, { userId: string; email: string }[]>();
        for (const s of shared) {
          const arr = byList.get(s.listId) ?? [];
          arr.push({ userId: s.userId, email: s.email });
          byList.set(s.listId, arr);
        }
        for (const [listId, members] of byList) {
          setListSharedMembers(listId, members);
        }
      })
      .catch((err) => console.error("Error resolviendo emails compartidos:", err));
  }, [user, user?.id, supabase, setServerUserId, setListSharedMembers]);

  // estado online/offline + flush al reconectar
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [setOnline]);

  // realtime sobre list_items de las listas donde el usuario es miembro
  useListItemsRealtime(supabase, listIds);

  return null;
}
