import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/account/, "");

  try {
    if (request.method === "POST" && pathname === "/start-email-code") {
      const { email } = await request.json();
      const client = createAnonClient();
      const { error } = await client.auth.signInWithOtp({
        email: String(email ?? "").trim(),
        options: {
          shouldCreateUser: true
        }
      });

      if (error) {
        return json({ type: "superior-account-error", code: "auth_failed", message: error.message }, 400);
      }

      return json({
        type: "superior-account-code-sent",
        email,
        createdAt: new Date().toISOString()
      });
    }

    if (request.method === "POST" && pathname === "/verify-email-code") {
      const { email, token } = await request.json();
      const client = createAnonClient();
      const { data, error } = await client.auth.verifyOtp({
        email: String(email ?? "").trim(),
        token: String(token ?? "").trim(),
        type: "email"
      });

      if (error || !data.user || !data.session) {
        return json({ type: "superior-account-error", code: "auth_failed", message: error?.message ?? "Email code failed." }, 401);
      }

      return json({
        type: "superior-account-session",
        userId: data.user.id,
        email: data.user.email ?? email,
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
        createdAt: new Date().toISOString()
      });
    }

    if (request.method === "GET" && pathname === "/profile") {
      const client = createUserClient(request);
      const user = await getUser(client);
      const { data, error } = await client.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

      if (error) {
        return json({ type: "superior-account-error", code: "profile_failed", message: error.message }, 400);
      }

      return json(data ?? {
        type: "superior-account-profile",
        userId: user.id,
        email: user.email,
        handle: defaultHandle(user.email),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (request.method === "PUT" && pathname === "/profile") {
      const payload = await request.json();
      const client = createUserClient(request);
      const user = await getUser(client);
      const now = new Date().toISOString();
      const row = {
        user_id: user.id,
        email: user.email,
        handle: String(payload.handle ?? defaultHandle(user.email)).trim() || defaultHandle(user.email),
        active_spore_id: payload.activeSporeId ?? null,
        updated_at: now
      };
      const { data, error } = await client.from("profiles").upsert(row).select("*").single();

      if (error) {
        return json({ type: "superior-account-error", code: "profile_failed", message: error.message }, 400);
      }

      return json(data);
    }

    if (request.method === "PUT" && pathname === "/spore") {
      const payload = await request.json();
      const client = createUserClient(request);
      const user = await getUser(client);
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("bot_spores")
        .upsert({
          id: payload.spore?.id,
          user_id: user.id,
          starter_preset_id: payload.starterPresetId ?? payload.spore?.species ?? null,
          spore: payload.spore,
          updated_at: now
        })
        .select("*")
        .single();

      if (error) {
        return json({ type: "superior-account-error", code: "spore_failed", message: error.message }, 400);
      }

      return json(data);
    }

    return json({ type: "superior-account-error", code: "not_found", message: "Unknown account route." }, 404);
  } catch (error) {
    return json({
      type: "superior-account-error",
      code: "bad_request",
      message: error instanceof Error ? error.message : "Account request failed."
    }, 400);
  }
});

function createAnonClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_PUBLISHABLE_KEY"));
}

function createUserClient(request: Request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Account request needs a bearer token.");
  }

  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_PUBLISHABLE_KEY"), {
    global: {
      headers: {
        Authorization: authorization
      }
    }
  });
}

async function getUser(client: ReturnType<typeof createAnonClient>) {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error(error?.message ?? "Account session missing.");
  }

  return data.user;
}

function defaultHandle(email?: string): string {
  return email?.split("@")[0]?.trim() || "operator";
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
