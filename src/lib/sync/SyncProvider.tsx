"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../supabase/auth";
import { getSupabase } from "../supabase/client";
import { useListStore } from "../stores/listStore";
import { pullAll } from "./service";
import { useListItemsRealtime } from "./realtime";
import { getSharedCounts, getSharedMemberEmails } from "@/app/supabase-actions";

export function SyncProvider() {
  const { user } = useAuth();
  const setServerUserId = useListStore((s) => s.setServerUserId);
  const setOnline = useListStore((s) => s.setOnline);
  const setListSharedMembers = useListStore((s) => s.setListSharedMembers);
  const setSharedCounts = useListStore((s) => s.setSharedCounts);
  const listIds = useListStore(
    useShallow((s) => (s.serverUserId ? s.lists.map((l) => l.id) : []))
  );

  const supabase = getSupabase();

  useEffect(() => {
    setServerUserId(user?.id ?? null);
    if (!user || !supabase) return;

    // cantidades de miembros compartidos por lista (service role): alimentan el
    // tag determinista "Compartida" de la home. Se resuelve DESPUÉS del pull
    // para que las listas ya estén en el store y no haya un race de orden.
    async function refreshSharedCounts() {
      try {
        const counts = await getSharedCounts();
        setSharedCounts(counts);
      } catch (err) {
        console.error("Error resolviendo cantidades compartidas:", err);
      }
    }

    // hidratación cloud: pull de listas + merge
    // (si falla, igual marcamos ready para no dejar la home colgada en el
    // loader y mostrar al menos la caché local como fallback)
    pullAll(supabase, user.id)
      .then(() => {
        useListStore.setState({ ready: true });
        return refreshSharedCounts();
      })
      .catch((err) => {
        console.error("Error hidratando listas:", err);
        useListStore.setState({ ready: true });
        return refreshSharedCounts();
      });

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
  }, [user, user?.id, supabase, setServerUserId, setListSharedMembers, setSharedCounts]);

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
