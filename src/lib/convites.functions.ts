import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().nullable(),
  permissions: z.array(z.string()).min(1),
  fullName: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  days: z.number().int().min(1).max(90).default(7),
});

const tokenSchema = z.object({ token: z.string().min(10).max(120) });

const acceptSchema = z.object({
  token: z.string().min(10).max(120),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(6).max(72),
});

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 40);

async function assertAdmin(supabase: any, userId: string, companyId: string) {
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || (data.role !== "owner" && data.role !== "admin")) {
    throw new Error("Apenas administradores podem gerenciar convites");
  }
}

export const createTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId, data.companyId);

    const token = randomToken();
    const expires = new Date(Date.now() + data.days * 24 * 60 * 60 * 1000).toISOString();

    const { data: row, error } = await context.supabase
      .from("team_invites")
      .insert({
        company_id: data.companyId,
        token,
        branch_id: data.branchId,
        permissions: data.permissions,
        full_name: data.fullName?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        expires_at: expires,
        created_by: context.userId,
      })
      .select("id, token, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string; token: string; expires_at: string };
  });

export const listTeamInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ companyId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId, data.companyId);
    const { data: rows, error } = await context.supabase
      .from("team_invites")
      .select(
        "id, token, permissions, branch_id, full_name, email, expires_at, accepted_at, revoked_at, created_at",
      )
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const revokeTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: invite, error: findError } = await context.supabase
      .from("team_invites")
      .select("id, company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!invite) throw new Error("Convite não encontrado");
    await assertAdmin(context.supabase, context.userId, invite.company_id);

    const { error } = await context.supabase
      .from("team_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Público: devolve apenas o nome da empresa e se o convite é válido. */
export const getInviteInfo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("team_invites")
      .select("id, company_id, expires_at, accepted_at, revoked_at, full_name, email")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) return { valid: false as const, reason: "Convite não encontrado." };
    if (invite.revoked_at) return { valid: false as const, reason: "Este convite foi cancelado." };
    if (invite.accepted_at) return { valid: false as const, reason: "Este convite já foi utilizado." };
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return { valid: false as const, reason: "Este convite expirou." };
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", invite.company_id)
      .maybeSingle();

    return {
      valid: true as const,
      companyName: company?.name ?? "Equipe",
      suggestedName: invite.full_name ?? "",
      suggestedEmail: invite.email ?? "",
    };
  });

/** Público: cria a conta e o vínculo de funcionário conforme o convite. */
export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => acceptSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("team_invites")
      .select("id, company_id, branch_id, permissions, expires_at, accepted_at, revoked_at")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) throw new Error("Convite não encontrado.");
    if (invite.revoked_at) throw new Error("Este convite foi cancelado.");
    if (invite.accepted_at) throw new Error("Este convite já foi utilizado.");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Este convite expirou.");

    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName.trim();

    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (!created.data?.user) {
      throw new Error(
        created.error?.message?.toLowerCase().includes("already")
          ? "Já existe uma conta com este e-mail. Faça login."
          : (created.error?.message ?? "Não foi possível criar a conta."),
      );
    }
    const userId = created.data.user.id;

    // vínculo como funcionário, com as permissões gravadas no convite
    const { error: memberError } = await supabaseAdmin.from("memberships").insert({
      company_id: invite.company_id,
      user_id: userId,
      role: "operator",
      branch_id: invite.branch_id,
      permissions: invite.permissions ?? [],
      is_active: true,
    });
    if (memberError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(memberError.message);
    }

    // cadastro na equipe
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("company_id", invite.company_id)
      .ilike("email", email)
      .maybeSingle();

    if (employee) {
      await supabaseAdmin.from("employees").update({ user_id: userId }).eq("id", employee.id);
    } else {
      await supabaseAdmin.from("employees").insert({
        company_id: invite.company_id,
        branch_id: invite.branch_id,
        full_name: fullName,
        email,
        hire_date: new Date().toISOString().slice(0, 10),
        salary: 0,
        hour_rate: 0,
        sector: "outros",
        user_id: userId,
      });
    }

    await supabaseAdmin
      .from("team_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_user_id: userId })
      .eq("id", invite.id);

    return { ok: true, email };
  });
