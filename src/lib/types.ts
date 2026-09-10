export interface ListItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  completed: boolean;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export type ListMembershipRole = "owner" | "editor";

/** Paleta del sistema para la identidad visual de las listas. */
export type ListColor =
  | "emerald"
  | "sky"
  | "amber"
  | "rose"
  | "violet"
  | "teal";

export interface List {
  id: string;
  name: string;
  items: ListItem[];
  position: number;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  role: ListMembershipRole;
  syncStatus?: SyncStatus;
  /** Color elegido por el owner (fallback determinístico por id si falta). */
  color?: ListColor;
  /** Emoji decorativo elegido por el owner. */
  emoji?: string;
  /** Emails de los miembros con quienes se compartió la lista (sin el owner). */
  sharedMembers?: { userId: string; email: string }[];
  /** Cantidad de miembros (distintos del owner) con los que se comparte la lista. */
  sharedCount?: number;
}

export interface ListMember {
  listId: string;
  userId: string;
  role: ListMembershipRole;
}

export type SyncStatus = "local" | "dirty" | "syncing" | "synced";
