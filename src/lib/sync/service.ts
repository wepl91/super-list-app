"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  List,
  ListItem,
  ListMembershipRole,
  ListMember,
} from "../types";
import { toList, toListItem, type ListRow } from "./db";
import { useListStore } from "../stores/listStore";

export type ItemsMutation =
  | { type: "upsert"; item: ListItem }
  | { type: "delete"; itemId: string };

/**
 * Realiza el pull inicial (hidratación cloud): carga listas, membresías y
 * elementos de las listas donde el usuario es owner/miembro y hace merge
 * con el store local (sin duplicar por id).
 */
export async function pullAll(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const memberships = await fetchMemberships(supabase, userId);

  const allListIds = memberships.map((m) => m.listId);

  if (allListIds.length === 0) {
    useListStore.getState().mergeRemote([]);
    return;
  }

  const { data: listRows, error: listError } = await supabase.from("lists")
    .select("id, owner_id, name, position, created_at, updated_at")
    .in("id", allListIds);

  if (listError) throw listError;

  const roleById = new Map(
    memberships.map((m) => [m.listId, m.role as ListMembershipRole])
  );

  const { data: itemRows, error: itemError } = await supabase.from("list_items")
    .select("*")
    .in("list_id", allListIds);

  if (itemError) throw itemError;

  const itemsByList = new Map<string, ListItem[]>();
  for (const row of itemRows ?? []) {
    const items = itemsByList.get(row.list_id) ?? [];
    items.push(toListItem(row));
    itemsByList.set(row.list_id, items);
  }

  const remoteLists: List[] = (listRows ?? []).map((row: ListRow) => {
    const role =
      roleById.get(row.id) ??
      (row.owner_id === userId ? "owner" : "editor");
    return toList(
      row,
      itemsByList.get(row.id) ?? ([] as ListItem[]),
      role
    );
  });

  useListStore.getState().mergeRemote(remoteLists);
}

/**
 * Lee las membresías del usuario. Técnicamente con la subconsulta de RLS
 * alcanza con leer `lists` directamente, pero necesitamos los roles, así que
 * pedimos list_members donde user_id = uid.
 */
async function fetchMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<ListMember[]> {
  const { data, error } = await supabase.from("list_members")
    .select("list_id, user_id, role")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((m) => ({
    listId: m.list_id,
    userId: m.user_id,
    role: m.role as ListMembershipRole,
  }));
}

/** Sube una lista nueva o existente (upsert de la fila). */
export async function upsertList(
  supabase: SupabaseClient,
  list: List
): Promise<void> {
  const updated = new Date(list.updatedAt);
  const listRow = {
    id: list.id,
    owner_id: list.ownerId,
    name: list.name,
    position: list.position,
    updated_at: isNaN(updated.getTime()) ? new Date().toISOString() : updated.toISOString(),
  };
  const { error } = await supabase.from("lists").upsert(listRow, {
    onConflict: "id",
  });
  if (error) throw error;

  // asegurar la membresía del owner (solo insert si no existe para no
  // chocar con el RLS, que no permite update directo de list_members)
  const { error: memError } = await supabase.from("list_members").upsert(
    { list_id: list.id, user_id: list.ownerId, role: "owner" },
    { onConflict: "list_id,user_id", ignoreDuplicates: true }
  );
  if (memError) throw memError;
}

/** Aplica los cambios de un item en el server (last-write-wins por updated_at). */
export async function applyItemsMutation(
  supabase: SupabaseClient,
  listId: string,
  mutation: ItemsMutation,
  userId: string
): Promise<void> {
  const client = supabase;
  if (mutation.type === "upsert") {
    const item = mutation.item;
    const row = {
      id: item.id,
      list_id: listId,
      name: item.name,
      description: item.description ?? null,
      quantity: item.quantity,
      unit: item.unit ?? null,
      completed: item.completed,
      position: item.position,
      created_by: userId,
      updated_at: new Date(item.updatedAt).toISOString(),
    };
    const { error } = await client.from("list_items").upsert(row, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) throw error;
  } else {
    const { error } = await client.from("list_items")
      .delete()
      .eq("id", mutation.itemId);
    if (error) throw error;
  }
}

/** Elimina una lista completa (solo owner; RLS lo protege). */
export async function deleteListRemote(
  supabase: SupabaseClient,
  listId: string
): Promise<void> {
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}
