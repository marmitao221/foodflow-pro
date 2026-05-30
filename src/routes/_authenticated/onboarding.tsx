import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Configurar empresa — CozinhaPro" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: company, error: cErr } = await supabase
        .from("companies")
        .insert({ name, cnpj: cnpj || null, owner_id: user.id })
        .select()
        .single();
      if (cErr) throw cErr;

      const { error: mErr } = await supabase
        .from("memberships")
        .insert({ user_id: user.id, company_id: company.id, role: "owner" });
      if (mErr) throw mErr;

      toast.success("Empresa criada!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar empresa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4"><Logo /></div>
          <CardTitle className="text-2xl">Configure sua empresa</CardTitle>
          <CardDescription>
            Vamos criar o ambiente da sua operação. Você poderá ajustar os dados depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da empresa</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Sabor & Cia Refeições" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ <span className="text-muted-foreground">(opcional)</span></Label>
              <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !name}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar empresa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
