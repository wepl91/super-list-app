"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase del lado servidor (SSR) usando las cookies de sesión.
 * Permite leer la sesión del usuario autenticado en Server Actions.
 * No incluye secretos de servicio: usa la clave anon (con la sesión del
 * usuario, el servidor accede con los permisos RLS del propio usuario).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // llamado desde un Server Component: ignorar silenciosamente
          }
        },
      },
    }
  );
}
