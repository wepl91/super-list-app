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
  /** Emails de los miembros con quienes se compartió la lista (sin el owner). */
  sharedMembers?: { userId: string; email: string }[];
}

export interface ListMember {
  listId: string;
  userId: string;
  role: ListMembershipRole;
}

export type SyncStatus = "local" | "dirty" | "syncing" | "synced";
