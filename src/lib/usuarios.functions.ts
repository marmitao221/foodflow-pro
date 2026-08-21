import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  employeeId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "operator"]),
  branchId: z.string().uuid().nullable(),
  permissions: z.array(z.string()),
});

export const createEmployeeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // 1. o funcionário precisa existir na empresa do solicitante
    const { data: employee, error: empError } = await context.supabase
      .from("employees")
      .select("id, company_id, branch_id, full_name")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (empError) throw new Error(empError.message);
    if (!employee) throw new Error("Funcionário não encontrado");

    // 2. só administradores da empresa podem criar acessos
    const { data: me, error: meError } = await context.supabase
      .from("memberships")
      .select("role")
      .eq("company_id", employee.company_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (meError) throw new Error(meError.message);
    if (!me || (me.role !== "owner" && me.role !== "admin")) {
      throw new Error("Apenas administradores podem criar acessos");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    // 3. cria (ou reaproveita) o usuário de acesso
    let userId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: employee.full_name },
    });
    if (created.data?.user) {
      userId = created.data.user.id;
    } else {
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list.data?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!found) throw new Error(created.error?.message ?? "Não foi possível criar o usuário");
      userId = found.id;
      await supabaseAdmin.auth.admin.updateUserById(found.id, { password: data.password });
    }

    // 4. vínculo com empresa, filial, perfil e permissões
    const permissions = data.role === "admin" ? [] : data.permissions;
    const { data: existing } = await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("company_id", employee.company_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("memberships")
        .update({
          role: data.role,
          branch_id: data.branchId,
          permissions,
          is_active: true,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("memberships").insert({
        company_id: employee.company_id,
        user_id: userId,
        role: data.role,
        branch_id: data.branchId,
        permissions,
      });
      if (error) throw new Error(error.message);
    }

    const { error: linkError } = await supabaseAdmin
      .from("employees")
      .update({ user_id: userId })
      .eq("id", employee.id);
    if (linkError) throw new Error(linkError.message);

    return { userId, email };
  });
