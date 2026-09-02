"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StoredSubscription } from "@/app/actions";

/** Origen (scheme://host) de la request actual, para el redirect de invitación. */
async function getRequestOrigin(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

// Subject de VAPID: web-push exige una URL o mailto: válidos. Normalizamos por
// si en el entorno se configuró el email sin el prefijo mailto: (p.ej.
// "w.e.p.91@gmail.com") y protegemos para que un valor inválido jamás rompa
// las server actions (incluida addMemberByEmail).
function vapidSubject(): string {
  const raw = process.env.VAPID_EMAIL?.trim();
  if (!raw) return "mailto:super-list@example.com";
  if (/^(https?:|mailto:)/i.test(raw)) return raw;
  return `mailto:${raw}`;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn("Web push no configurado (faltan claves VAPID).");
    return;
  }
  try {
    webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
  } catch (err) {
    console.error("Error configurando web push (VAPID):", err);
  }
}

configureWebPush();

/**
 * Cliente con rol service (solo servidor): permite resolver el email del otro
 * usuario en auth.users y crear la membresía. Nunca viaja al cliente.
 *
 * NOTA: el service role bypassea RLS, por eso SIEMPRE verificamos antes que el
 * llamador es el owner de la lista usando la sesión real del usuario (RNF-3).
 */
let serviceClient: SupabaseClient | null = null;

function getServiceClient() {
  if (!serviceClient) {
    serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return serviceClient;
}

export type AddMemberResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type InviteResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Agrega (o confirma) que el email está en la allowlist de la app.
 * Se llama SIEMPRE ANTES de cualquier inviteUserByEmail / creación de usuario:
 * el trigger que gatea el registro rechaza el alta si el email no está en
 * allowed_emails, incluso para el service role. Orden crítico (D1/D3).
 */
async function ensureAllowedEmail(
  svc: SupabaseClient,
  email: string,
  addedBy: string
): Promise<Error | null> {
  const { error } = await svc.from("allowed_emails").upsert(
    { email: email.toLowerCase(), added_by: addedBy },
    { onConflict: "email" }
  );
  if (error) {
    console.error("Error agregando email a allowlist:", error);
    return error;
  }
  return null;
}

/**
 * Busca el id de un usuario registrado por su email usando la admin API de
 * Auth. La tabla `auth.users` NO es consultable vía supabase-js estándar
 * (`PGRST205`: no está en el schema cache de PostgREST); `admin.listUsers` es
 * la vía soportada. Devuelve null si el email no pertenece a ningún usuario.
 */
async function findExistingUserId(
  svc: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  // App friends & family: un listado paginado amplio cubre la práctica totalidad.
  const { data, error } = await svc.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    console.error("Error listando usuarios:", error);
    return null;
  }
  return (
    data?.users.find((u) => u.email?.toLowerCase() === normalized)?.id ?? null
  );
}

/**
 * Solo el admin (email = ADMIN_EMAIL) puede invitar a usar la app a un email.
 * Verifica sesión + rol admin (server env), agrega el email a la allowlist y
 * luego envía la invitación por email (inviteUserByEmail).
 * ORDEN: allowlist ANTES de invite, para que el trigger del registro pase.
 */
export async function inviteToApp(email: string): Promise<InviteResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return { ok: false, error: "Ingresá un email válido." };
  }

  // Verificar sesión del llamador
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Necesitás iniciar sesión para invitar." };
  }

  // Verificar que el llamador es admin (fuente de verdad: ADMIN_EMAIL server env)
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail) {
    return { ok: false, error: "No tenés permisos para invitar." };
  }

  const svc = getServiceClient();

  // 1) Allowlist ANTES de invitar (el trigger lo exige, incluso con service role)
  const allowedError = await ensureAllowedEmail(svc, normalized, user.id);
  if (allowedError) {
    return {
      ok: false,
      error: "No se pudo autorizar el acceso. Intentalo de nuevo.",
    };
  }

  // 2) Invitar (si el usuario ya existe, Supabase devuelve el mismo usuario)
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (await getRequestOrigin()) ??
    "http://localhost:3000";

  const { error: inviteError } = await svc.auth.admin.inviteUserByEmail(
    normalized,
    { redirectTo: `${origin}/` }
  );

  if (inviteError) {
    console.error("Error enviando invitación:", inviteError);
    return {
      ok: false,
      error: "No se pudo enviar la invitación. Intentalo de nuevo.",
    };
  }

  return { ok: true, message: `Invitación enviada a ${normalized}.` };
}

/** Nombre visible del usuario (full_name de Google, sino email/parte local). */
function displayName(user: {
  email?: string;
  user_metadata?: { full_name?: unknown; name?: unknown };
}): string {
  const meta = user.user_metadata ?? {};
  const full = meta.full_name;
  const name = meta.name;
  if (typeof full === "string" && full.trim()) return full.trim();
  if (typeof name === "string" && name.trim()) return name.trim();
  if (user.email) return user.email.split("@")[0];
  return "Alguien";
}

/** Envía un push a todas las suscripciones del usuario dado (best-effort). */
async function notifyUserListShared(
  userId: string,
  message: string
): Promise<void> {
  const svc = getServiceClient();
  const { data: subs } = await svc
    .from("push_subscriptions")
    .select("endpoint, keys")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return;

  for (const sub of subs as unknown as StoredSubscription[]) {
    try {
      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: "Super List",
          body: message,
          icon: "/icon-192x192.png",
        })
      );
    } catch (err) {
      console.error("Error enviando push al compartir:", err);
    }
  }
}

/**
 * Solo el owner de una lista puede agregar miembro (por email).
 * Verifica: (1) sesión válida, (2) el usuario actual es owner de la lista,
 * (3) el email ingresado corresponde a un usuario registrado.
 * Si el email no está registrado devuelve "usuario no encontrado" y no crea nada.
 */
export async function addMemberByEmail(
  listId: string,
  email: string
): Promise<AddMemberResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return { ok: false, error: "Ingresá un email válido." };
  }

  // Verificar sesión del llamador
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Necesitás iniciar sesión para compartir." };
  }

  // Verificar que el llamador es owner de la lista
  const { data: listRow } = await supabase
    .from("lists")
    .select("owner_id, name")
    .eq("id", listId)
    .single();
  if (!listRow || listRow.owner_id !== user.id) {
    return { ok: false, error: "Solo el dueño de la lista puede compartirla." };
  }

  // Determinar si el usuario ya está registrado en el proyecto. Si ya existe,
  // lo agregamos de una como miembro; si no, enviamos una invitación por email
  // (crea la cuenta cuando el invitado la complete, pudiendo entrar con Google).
  // Nota: NO usar svc.from("auth.users") — esa tabla no está expuesta a
  // PostgREST (PGRST205) y rompía la detección de usuarios existentes.
  const svc = getServiceClient();
  const existingUserId = await findExistingUserId(svc, normalized);
  let userId = existingUserId;
  let invited = false;

  if (!userId) {
    // El email no pertenece a ningún usuario registrado: hay que invitarlo.
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      (await getRequestOrigin()) ??
      "http://localhost:3000";

    // Compartir lista = dar acceso a la app: autorizamos el email en la
    // allowlist ANTES de invitar (el trigger del registro lo exige, incluso
    // para el service role que crea el usuario vía inviteUserByEmail).
    const allowedError = await ensureAllowedEmail(svc, normalized, user.id);
    if (allowedError) {
      return {
        ok: false,
        error: "No se pudo autorizar el acceso del invitado. Intentalo de nuevo.",
      };
    }

    const { data: invitedData, error: inviteError } = await svc.auth.admin
      .inviteUserByEmail(normalized, {
        redirectTo: `${origin}/`,
      });

    if (inviteError || !invitedData?.user) {
      console.error("Error enviando invitación:", inviteError);
      return {
        ok: false,
        error: "No se pudo enviar la invitación. Intentalo de nuevo.",
      };
    }
    userId = invitedData.user.id;
    invited = true;
  }

  if (!userId) {
    return { ok: false, error: "No se pudo resolver el usuario destino." };
  }

  // Crear la membresía como 'editor' (ya verificamos que somos owner)
  const { error: insertError } = await svc
    .from("list_members")
    .upsert(
      { list_id: listId, user_id: userId, role: "editor" },
      { onConflict: "list_id,user_id" }
    );

  if (insertError) {
    console.error("Error creando membresía:", insertError);
    return { ok: false, error: "No se pudo agregar al usuario a la lista." };
  }

  // Guardar/actualizar el perfil del miembro para poder resolver su email
  const { error: profileError } = await svc.from("profiles").upsert(
    { user_id: userId, email: normalized },
    { onConflict: "user_id" }
  );
  if (profileError) console.error("Error guardando perfil del miembro:", profileError);

  // Notificar por push al nuevo miembro (solo tiene sentido si ya tenía cuenta)
  if (!invited) {
    const senderName = displayName(user);
    const listName = listRow.name ?? "lista";
    const message = `${senderName} te ha compartido la lista ${listName}`;
    await notifyUserListShared(userId, message);
  }

  return {
    ok: true,
    message: invited
      ? "Invitación enviada. Colaborará cuando complete su cuenta."
      : "Usuario agregado a la lista.",
  };
}

export type SharedMemberEmails = {
  listId: string;
  userId: string;
  email: string;
}[];

/**
 * Devuelve los emails de los miembros (editor) de las listas de las que el
 * usuario actual es owner. Se resuelve con service role (bypass RLS) y se
 * verifica que el llamador es efectivamente el owner de cada lista, para
 * no exponer emails de listas ajenas.
 */
export async function getSharedMemberEmails(): Promise<SharedMemberEmails> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myLists } = await supabase
    .from("lists")
    .select("id, owner_id")
    .eq("owner_id", user.id);

  const ownedIds = (myLists ?? []).map((l) => l.id);
  if (ownedIds.length === 0) return [];

  const svc = getServiceClient();
  const { data: members } = await svc
    .from("list_members")
    .select("list_id, user_id, role")
    .in("list_id", ownedIds);

  const editors = (members ?? []).filter(
    (m) => m.role === "editor"
  );
  if (editors.length === 0) return [];

  const targetIds = editors.map((m) => m.user_id);
  const { data: profiles } = await svc
    .from("profiles")
    .select("user_id, email")
    .in("user_id", targetIds);
  const emailById = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.email as string])
  );

  // fallback: si algún miembro no tiene perfil, resolver su email vía la admin
  // API de Auth (auth.users no es consultable por PostgREST — PGRST205).
  const missing = editors.filter((m) => !emailById.has(m.user_id));
  if (missing.length > 0) {
    const { data } = await svc.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const missingIds = new Set(missing.map((m) => m.user_id));
    for (const u of data?.users ?? []) {
      if (u.email && missingIds.has(u.id)) emailById.set(u.id, u.email);
    }
  }

  const result: SharedMemberEmails = [];
  for (const m of editors) {
    const email = emailById.get(m.user_id);
    if (email) result.push({ listId: m.list_id, userId: m.user_id, email });
  }
  return result;
}
