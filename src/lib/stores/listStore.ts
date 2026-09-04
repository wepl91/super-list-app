"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { List, ListItem } from "../types";
import { getSupabase } from "../supabase/client";
import {
  applyItemsMutation,
  deleteListRemote,
  upsertList,
  type ItemsMutation,
} from "../sync/service";
import {
  notifyListChanged,
  flushListNotifications,
} from "@/app/supabase-actions";

// Consolidación de notificaciones de listas compartidas: el servidor acumula
// el contador por (lista, miembro) y flushea al llegar a N cambios o a la
// ventana. Este timeout cierra el flush de un único cambio suelto.
const NOTIFICATION_FLUSH_MS = 45_000;
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

function reportListChange(listId: string) {
  // incrementar contador en el servidor (fire-and-forget; nunca rompe el flujo)
  notifyListChanged(listId).catch(() => {});
  // flush tardío por si queda un único cambio sin alcanzar el umbral
  const existing = flushTimers.get(listId);
  if (existing) clearTimeout(existing);
  flushTimers.set(
    listId,
    setTimeout(() => {
      flushTimers.delete(listId);
      flushListNotifications(listId).catch(() => {});
    }, NOTIFICATION_FLUSH_MS)
  );
}

export type NewItemInput = {
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
};

interface ListState {
  lists: List[];
  serverUserId: string | null;
  online: boolean;
  ready: boolean;
  setServerUserId: (id: string | null) => void;
  setOnline: (online: boolean) => void;
  markListSynced: (listId: string) => void;
  setListSharedMembers: (
    listId: string,
    members: { userId: string; email: string }[]
  ) => void;
  mergeRemote: (remoteLists: List[]) => void;
  applyRemoteListItem: (listId: string, item: ListItem) => void;
  applyRemoteRemoveItem: (listId: string, itemId: string) => void;
  createList: (name: string) => string;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  cloneList: (id: string) => string | undefined;
  reorderLists: (activeId: string, overId: string) => void;
  addItem: (listId: string, input: NewItemInput) => void;
  updateItem: (listId: string, itemId: string, input: Partial<NewItemInput>) => void;
  toggleItem: (listId: string, itemId: string) => void;
  deleteItem: (listId: string, itemId: string) => void;
  sortItems: (listId: string) => void;
  deleteCompletedItems: (listId: string) => void;
  flushOutbox: () => Promise<void>;
}

function newId(): string {
  return crypto.randomUUID();
}

function mapList(
  lists: List[],
  listId: string,
  fn: (list: List) => List
): List[] {
  return lists.map((list) => (list.id === listId ? fn(list) : list));
}

function makeItem(input: NewItemInput, position: number): ListItem {
  const now = Date.now();
  return {
    id: newId(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    quantity: input.quantity,
    unit: input.unit?.trim() || undefined,
    completed: false,
    position,
    createdAt: now,
    updatedAt: now,
  };
}

function bumpList(list: List): List {
  return { ...list, updatedAt: Date.now(), syncStatus: "dirty" };
}

async function pushItemToRemote(
  listId: string,
  mutation: ItemsMutation,
  userId: string | null
) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await applyItemsMutation(supabase, listId, mutation, userId);
    useListStore.getState().markListSynced(listId);
  } catch (err) {
    console.error("Error sincronizando item:", err);
  }
}

async function pushListToRemote(list: List, userId: string | null) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await upsertList(supabase, list);
    useListStore.getState().markListSynced(list.id);
  } catch (err) {
    console.error("Error subiendo lista:", err);
  }
}

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
      lists: [],
      serverUserId: null,
      online: true,
      ready: false,

      setServerUserId: (id) =>
        set((state) => {
          if (!id) {
            // sin sesión: todo queda en estado local (no sincronizable aún)
            return {
              serverUserId: id,
              lists: state.lists.map((l) =>
                l.syncStatus === undefined
                  ? l
                  : { ...l, syncStatus: "local" as const }
              ),
            };
          }
          // Al autenticar, las listas propias (role owner) que se crearon
          // antes del login tienen ownerId = uuid local; se reasignan al
          // user_id real para no tratarse como "compartidas" ni subirse rotas.
          // Las listas que aún no vienen del remoto quedan "dirty" (a subir).
          return {
            serverUserId: id,
            lists: state.lists.map((l) => {
              const base =
                l.role === "owner" && l.ownerId !== id
                  ? { ...l, ownerId: id }
                  : l;
              return {
                ...base,
                syncStatus:
                  base.syncStatus && base.syncStatus !== "dirty"
                    ? base.syncStatus
                    : "dirty",
              };
            }),
          };
        }),

      markListSynced: (listId) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => ({
            ...list,
            syncStatus: "synced",
          })),
        })),

      setListSharedMembers: (listId, members) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => ({
            ...list,
            sharedMembers: members,
          })),
        })),

      setOnline: (online) => {
        set({ online });
        if (online) get().flushOutbox();
      },

      mergeRemote: (remoteLists) =>
        set((state) => {
          const hasSession = !!state.serverUserId;
          const localById = new Map(state.lists.map((l) => [l.id, l]));
          const merged: List[] = [];

          for (const remote of remoteLists) {
            const local = localById.get(remote.id);
            if (!local) {
              merged.push({ ...remote, syncStatus: "synced" });
              continue;
            }
            // merge por item id; el remoto (fuente de verdad) gana en conflictos
            const localItemsById = new Map(
              local.items.map((i) => [i.id, i])
            );
            const remoteItemsById = new Map(
              remote.items.map((i) => [i.id, i])
            );
            const itemsById = new Map([...remoteItemsById]);
            for (const [id, item] of localItemsById) {
              if (!itemsById.has(id)) itemsById.set(id, item);
            }
            // si había cambios locales sin terminar de subir, se conservan
            // como pendientes; si no, queda sincronizado con el remoto
            const stillDirty =
              local.syncStatus === "dirty" || local.syncStatus === "syncing";
            merged.push({
              ...remote,
              items: [...itemsById.values()],
              role: remote.role,
              ownerId: remote.ownerId,
              syncStatus: stillDirty ? "dirty" : "synced",
            });
          }

          // listas locales no presentes en remoto se conservan (se subirán luego)
          const remoteIds = new Set(remoteLists.map((l) => l.id));
          for (const local of state.lists) {
            if (!remoteIds.has(local.id)) {
              // Una lista local sin respaldo remoto no puede ser una compartición
              // real (esas llegan vía pullAll con membresía): siempre es del
              // usuario actual, así que se corrige a owner si hace falta.
              const isOwn =
                hasSession &&
                (local.role === "owner" || local.ownerId !== state.serverUserId);
              merged.push({
                ...local,
                role: isOwn ? "owner" : local.role,
                syncStatus: hasSession ? "dirty" : "local",
              });
            }
          }

          return { lists: merged, ready: true };
        }),

      applyRemoteListItem: (listId, item) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => {
            const exists = list.items.some((i) => i.id === item.id);
            // last-write-wins: si el local es más nuevo, lo preservamos
            if (exists) {
              const local = list.items.find((i) => i.id === item.id)!;
              if (local.updatedAt > item.updatedAt) return list;
              return {
                ...list,
                items: list.items.map((i) =>
                  i.id === item.id ? item : i
                ),
              };
            }
            return { ...list, items: [...list.items, item] };
          }),
        })),

      applyRemoteRemoveItem: (listId, itemId) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => ({
            ...list,
            items: list.items.filter((i) => i.id !== itemId),
          })),
        })),

      createList: (name) => {
        const userId = get().serverUserId;
        const list: List = {
          id: newId(),
          name: name.trim(),
          items: [],
          position: get().lists.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ownerId: userId ?? newId(),
          role: "owner",
          syncStatus: userId ? "dirty" : "local",
        };
        set((state) => ({ lists: [...state.lists, list] }));
        if (userId) {
          pushListToRemote(list, userId);
        }
        return list.id;
      },

      renameList: (id, name) => {
        reportListChange(id);
        const trimmed = name.trim();
        if (!trimmed) return;
        let renamed: List | null = null;
        set((state) => ({
          lists: mapList(state.lists, id, (list) => {
            renamed = { ...list, name: trimmed, syncStatus: "dirty" };
            return renamed;
          }),
        }));
        const userId = get().serverUserId;
        if (renamed && userId) {
          pushListToRemote(renamed, userId);
        }
      },

      deleteList: (id) => {
        const supabase = getSupabase();
        const userId = get().serverUserId;
        if (supabase && userId) {
          deleteListRemote(supabase, id).catch((err) => {
            console.error("Error eliminando lista:", err);
          });
        }
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== id),
        }));
      },

      cloneList: (id) => {
        const source = get().lists.find((list) => list.id === id);
        if (!source) return undefined;
        const userId = get().serverUserId;
        const clone: List = {
          ...structuredClone(source),
          id: newId(),
          name: `${source.name} (copia)`,
          items: source.items.map((i) => ({
            ...structuredClone(i),
            id: newId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })),
          position: get().lists.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ownerId: userId ?? source.ownerId,
          role: "owner",
          syncStatus: userId ? "dirty" : "local",
        };
        set((state) => ({ lists: [...state.lists, clone] }));
        if (userId) {
          pushListToRemote(clone, userId);
        }
        return clone.id;
      },

      reorderLists: (activeId, overId) => {
        const active = get().lists.find((l) => l.id === activeId);
        const ownerKey = active?.ownerId ?? null;

        set((state) => {
          // reordenar solo entre listas del mismo owner (el orden es per-user)
          const sameOwner = (l: List) => l.ownerId === ownerKey;
          const from = state.lists.findIndex((l) => l.id === activeId);
          const to = state.lists.findIndex((l) => l.id === overId);
          if (
            from < 0 ||
            to < 0 ||
            from === to ||
            !sameOwner(state.lists[from]) ||
            !sameOwner(state.lists[to])
          ) {
            return state;
          }

          const next = [...state.lists];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);

          // reasignar position según el orden global del array; las listas
          // del owner reordenado quedan pendientes de subir
          const reordered = next.map((l, idx) =>
            sameOwner(l)
              ? { ...l, position: idx, syncStatus: "dirty" as const }
              : { ...l, position: idx }
          );
          return { lists: reordered as List[] };
        });
        // persistir el nuevo orden en la nube (T-6)
        const userId = get().serverUserId;
        if (userId) {
          for (const [idx, list] of get().lists.entries()) {
            if (list.ownerId === ownerKey) {
              pushListToRemote({ ...list, position: idx }, userId);
            }
          }
        }
      },

      addItem: (listId, input) => {
        reportListChange(listId);
        let newItem: ListItem | null = null;
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => {
            const item = makeItem(input, list.items.length);
            newItem = item;
            return bumpList({
              ...list,
              items: [...list.items, item],
            });
          }),
        }));
        if (newItem) {
          pushItemToRemote(listId, { type: "upsert", item: newItem }, get().serverUserId);
        }
      },

      updateItem: (listId, itemId, input) => {
        reportListChange(listId);
        let updated: ListItem | null = null;
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => ({
            ...bumpList(list),
            items: list.items.map((item) => {
              if (item.id !== itemId) return item;
              const next: ListItem = {
                ...item,
                updatedAt: Date.now(),
              };
              if (input.name !== undefined) next.name = input.name.trim();
              if (input.description !== undefined)
                next.description = input.description.trim() || undefined;
              if (input.quantity !== undefined) next.quantity = input.quantity;
              if (input.unit !== undefined)
                next.unit = input.unit.trim() || undefined;
              updated = next;
              return next;
            }),
          })),
        }));
        if (updated) {
          pushItemToRemote(listId, { type: "upsert", item: updated }, get().serverUserId);
        }
      },

      toggleItem: (listId, itemId) => {
        reportListChange(listId);
        let updated: ListItem | null = null;
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => ({
            ...bumpList(list),
            items: list.items.map((item) => {
              if (item.id !== itemId) return item;
              updated = { ...item, completed: !item.completed, updatedAt: Date.now() };
              return updated;
            }),
          })),
        }));
        if (updated) {
          pushItemToRemote(listId, { type: "upsert", item: updated }, get().serverUserId);
        }
      },

      deleteItem: (listId, itemId) => {
        reportListChange(listId);
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => ({
            ...bumpList(list),
            items: list.items.filter((item) => item.id !== itemId),
          })),
        }));
        pushItemToRemote(listId, { type: "delete", itemId }, get().serverUserId);
      },

      sortItems: (listId) => {
        reportListChange(listId);
        let sortedItems: ListItem[] = [];
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => {
            sortedItems = [...list.items]
              .sort((a, b) =>
                a.name.localeCompare(b.name, undefined, {
                  numeric: true,
                  sensitivity: "base",
                })
              )
              .map((item, idx) => ({ ...item, position: idx }));
            return bumpList({ ...list, items: sortedItems });
          }),
        }));
        if (sortedItems.length) {
          const supabase = getSupabase();
          const userId = get().serverUserId;
          if (supabase && userId) {
            for (const item of sortedItems) {
              pushItemToRemote(listId, { type: "upsert", item }, userId);
            }
          }
        }
      },

      deleteCompletedItems: (listId) => {
        reportListChange(listId);
        const removed: ListItem[] = [];
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => {
            removed.push(...list.items.filter((i) => i.completed));
            return bumpList({
              ...list,
              items: list.items.filter((item) => !item.completed),
            });
          }),
        }));
        const supabase = getSupabase();
        const userId = get().serverUserId;
        if (supabase && userId) {
          for (const item of removed) {
            pushItemToRemote(listId, { type: "delete", itemId: item.id }, userId);
          }
        }
      },

      async flushOutbox() {
        // por ahora las mutaciones se envían de forma inmediata y best-effort;
        // el outbox persistente es una mejora para cubrir el caso de partida
        // sin conexión (el spec T-5 lo pide, se refina en la capa de sync).
      },
    }),
    {
      name: "super-list-lists",
      partialize: (state) => ({
        lists: state.lists,
      }),
    }
  )
);
