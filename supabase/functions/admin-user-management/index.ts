import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ROLES = ["super_admin", "admin", "sales", "operations", "finance"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Missing auth token" }, 401);

    // Verify caller
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const callerId = userRes.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Caller must be super_admin
    const { data: callerRow } = await admin
      .from("users")
      .select("id, role, email")
      .eq("id", callerId)
      .maybeSingle();
    if (!callerRow || callerRow.role !== "super_admin") {
      return jsonResponse({ error: "Forbidden: super_admin only" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const origin = req.headers.get("origin") ?? "";
    const redirectTo = `${origin}/accept-invite`;
    const resetRedirect = `${origin}/reset-password`;

    switch (action) {
      case "invite": {
        const { email, name, role, mobile } = body;
        if (!email || !name || !role) return jsonResponse({ error: "email, name, role required" }, 400);
        if (!ROLES.includes(role)) return jsonResponse({ error: "Invalid role" }, 400);

        const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { name, role, mobile: mobile ?? null },
        });
        if (inviteErr) return jsonResponse({ error: inviteErr.message }, 400);

        const newId = invited.user!.id;
        const { error: upsertErr } = await admin.from("users").upsert(
          { id: newId, name, email, role, mobile: mobile ?? null, is_active: false },
          { onConflict: "id" },
        );
        if (upsertErr) return jsonResponse({ error: upsertErr.message }, 400);
        return jsonResponse({ ok: true, id: newId });
      }

      case "resend_invite": {
        const { user_id } = body;
        if (!user_id) return jsonResponse({ error: "user_id required" }, 400);
        const { data: u } = await admin.from("users").select("email, name, role, mobile").eq("id", user_id).maybeSingle();
        if (!u) return jsonResponse({ error: "User not found" }, 404);

        // Try invite again; if auth user already exists, fall back to magic-link/recovery
        const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(u.email, {
          redirectTo,
          data: { name: u.name, role: u.role, mobile: u.mobile },
        });
        if (inviteErr) {
          // If user already registered, send a recovery link instead
          const { error: resetErr } = await admin.auth.resetPasswordForEmail(u.email, { redirectTo: resetRedirect });
          if (resetErr) return jsonResponse({ error: inviteErr.message }, 400);
          return jsonResponse({ ok: true, fallback: "recovery" });
        }
        // Make sure public.users.id matches new auth id
        if (invited?.user?.id && invited.user.id !== user_id) {
          await admin.from("users").update({ id: invited.user.id }).eq("id", user_id);
        }
        return jsonResponse({ ok: true });
      }

      case "reset_password": {
        const { user_id } = body;
        if (!user_id) return jsonResponse({ error: "user_id required" }, 400);
        const { data: u } = await admin.from("users").select("email").eq("id", user_id).maybeSingle();
        if (!u) return jsonResponse({ error: "User not found" }, 404);
        const { error } = await admin.auth.resetPasswordForEmail(u.email, { redirectTo: resetRedirect });
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ ok: true });
      }

      case "delete": {
        const { user_id } = body;
        if (!user_id) return jsonResponse({ error: "user_id required" }, 400);
        if (user_id === callerId) return jsonResponse({ error: "You cannot delete yourself" }, 400);

        // Block deleting the last super_admin
        const { data: target } = await admin.from("users").select("role").eq("id", user_id).maybeSingle();
        if (target?.role === "super_admin") {
          const { count } = await admin.from("users").select("id", { count: "exact", head: true }).eq("role", "super_admin");
          if ((count ?? 0) <= 1) return jsonResponse({ error: "Cannot delete the last super_admin" }, 400);
        }

        // Delete from auth (ignore if not present)
        await admin.auth.admin.deleteUser(user_id).catch(() => null);
        const { error: delErr } = await admin.from("users").delete().eq("id", user_id);
        if (delErr) return jsonResponse({ error: delErr.message }, 400);
        return jsonResponse({ ok: true });
      }

      case "update_role": {
        const { user_id, role } = body;
        if (!user_id || !role) return jsonResponse({ error: "user_id and role required" }, 400);
        if (!ROLES.includes(role)) return jsonResponse({ error: "Invalid role" }, 400);

        // Block demoting the last super_admin
        const { data: target } = await admin.from("users").select("role").eq("id", user_id).maybeSingle();
        if (target?.role === "super_admin" && role !== "super_admin") {
          const { count } = await admin.from("users").select("id", { count: "exact", head: true }).eq("role", "super_admin");
          if ((count ?? 0) <= 1) return jsonResponse({ error: "Cannot demote the last super_admin" }, 400);
        }

        const { error } = await admin.from("users").update({ role }).eq("id", user_id);
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ ok: true });
      }

      case "toggle_active": {
        const { user_id, is_active } = body;
        if (!user_id || typeof is_active !== "boolean") return jsonResponse({ error: "user_id and is_active required" }, 400);
        if (user_id === callerId && !is_active) return jsonResponse({ error: "You cannot deactivate yourself" }, 400);
        const { error } = await admin.from("users").update({ is_active }).eq("id", user_id);
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ ok: true });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("admin-user-management error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});