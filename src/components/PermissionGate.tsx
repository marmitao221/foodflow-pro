import { Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { homeFor, requiredFor, useMembership } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export function PermissionGate({ path, children }: { path: string; children: ReactNode }) {
  const { loading, isAdmin, permissions, can } = useMembership();
  const required = requiredFor(path);

  if (!required || isAdmin) return <>{children}</>;
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowed = required.adminOnly ? false : !!required.perm && can(required.perm);
  if (allowed) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Acesso não liberado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você não tem permissão para acessar esta área. Fale com o administrador da empresa
          para liberar o acesso.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to={homeFor(isAdmin, permissions)}>Voltar para minha área</Link>
      </Button>
    </div>
  );
}
