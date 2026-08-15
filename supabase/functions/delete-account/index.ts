import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";

const STORAGE_BUCKET = "clothes";
const STORAGE_PAGE_SIZE = 1000;
const STORAGE_REMOVE_BATCH_SIZE = 100;
const RESPONSE_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: RESPONSE_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("[delete-account] Required Supabase environment is unavailable");
    return jsonResponse({ error: "Account deletion is unavailable" }, 500);
  }

  const accessToken = authorization.slice("Bearer ".length);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const storagePaths = await collectStoragePaths(admin, user.id);

    for (let offset = 0; offset < storagePaths.length; offset += STORAGE_REMOVE_BATCH_SIZE) {
      const { error } = await admin.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths.slice(offset, offset + STORAGE_REMOVE_BATCH_SIZE));

      if (error) {
        throw error;
      }
    }

    const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "global");

    if (signOutError) {
      throw signOutError;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw deleteError;
    }

    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error("[delete-account] Deletion failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
    });
    return jsonResponse({ error: "Account deletion failed" }, 500);
  }
});

async function collectStoragePaths(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const paths: string[] = [];

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await admin.storage.from(STORAGE_BUCKET).list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw error;
    }

    for (const item of data) {
      const itemPath = `${prefix}/${item.name}`;

      if (item.id === null) {
        paths.push(...(await collectStoragePaths(admin, itemPath)));
      } else {
        paths.push(itemPath);
      }
    }

    if (data.length < STORAGE_PAGE_SIZE) {
      break;
    }
  }

  return paths;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}
