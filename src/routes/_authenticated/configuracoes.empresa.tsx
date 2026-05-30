import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2, Save } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/configuracoes/empresa")({
  head: () => ({ meta: [{ title: "Configurações da Empresa — CozinhaPro" }] }),
  component: ConfigEmpresa,
});

type Company = { id: string; name: string; cnpj: string | null; owner_id: string; created_at: string };

function ConfigEmpresa() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Company | null> => {
      const { data: m, error: mErr } = await supabase
        .from("memberships")
        .select("company_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!m) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, cnpj, owner_id, created_at")
        .eq("id", m.company_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setCnpj(company.cnpj ?? "");
    }
  }, [company]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ name: name.trim(), cnpj: cnpj.trim() || null })
        .eq("id", company.id);
      if (error) throw error;
      toast.success("Dados da empresa atualizados");
      qc.invalidateQueries({ queryKey: ["my-company"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações da empresa</h1>
          <p className="text-sm text-muted-foreground">Atualize os dados cadastrais da sua operação.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dados cadastrais</CardTitle>
              <CardDescription>Visíveis para todos os membros da empresa.</CardDescription>
            </div>
            {company && <Badge variant="outline">Ativa</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !company ? (
            <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada para sua conta.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome da empresa</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">
                  CNPJ <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ID da empresa</p>
                  <p className="mt-0.5 font-mono text-xs break-all">{company.id}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Criada em</p>
                  <p className="mt-0.5 text-sm">
                    {new Date(company.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar alterações
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
