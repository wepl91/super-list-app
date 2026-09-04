"use client";

import type {
  List,
  ListItem,
  ListMembershipRole,
} from "../types";

export interface ListRow {
  id: string;
  owner_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ListItemRow {
  id: string;
  list_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  completed: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListMemberRow {
  list_id: string;
  user_id: string;
  role: string;
}

export function toListItems(rows: ListItemRow[]): ListItem[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    quantity: r.quantity,
    unit: r.unit ?? undefined,
    completed: r.completed,
    position: r.position,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  }));
}

export function toListItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    quantity: row.quantity,
    unit: row.unit ?? undefined,
    completed: row.completed,
    position: row.position,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function toList(
  listRow: ListRow,
  items: ListItem[],
  role: ListMembershipRole,
  sharedMembers: { userId: string; email: string }[] = []
): List {
  return {
    id: listRow.id,
    name: listRow.name,
    items,
    position: listRow.position,
    createdAt: new Date(listRow.created_at).getTime(),
    updatedAt: new Date(listRow.updated_at).getTime(),
    ownerId: listRow.owner_id,
    role,
    sharedMembers,
  };
}
