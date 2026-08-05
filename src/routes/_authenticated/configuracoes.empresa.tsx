import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2, Save, Upload } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DecimalInput } from "@/components/ui/decimal-input";

export const Route = createFileRoute("/_authenticated/configuracoes/empresa")({
  head: () => ({ meta: [{ title: "Configurações da Empresa — CozinhaPro" }] }),
  component: ConfigEmpresa,
});

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

type Company = {
  id: string; name: string; cnpj: string | null; phone: string | null;
  email: string | null; city: string | null; state: string | null;
  logo_url: string | null; meals_per_day: number | null;
  cmv_target: number | null; profit_target: number | null;
};

function ConfigEmpresa() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Company | null> => {
      const { data: m } = await supabase
        .from("memberships").select("company_id")
        .eq("user_id", user!.id).order("created_at", { ascending: true })
        .limit(1).maybeSingle();
      if (!m) return null;
      const { data } = await supabase
        .from("companies")
        .select("id, name, cnpj, phone, email, city, state, logo_url, meals_per_day, cmv_target, profit_target")
        .eq("id", m.company_id).maybeSingle();
      return data as Company | null;
    },
  });

  const [form, setForm] = useState({
    name: "", cnpj: "", phone: "", email: "", city: "", state: "",
    meals_per_day: "", cmv_target: "", profit_target: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setForm({
      name: company.name ?? "",
      cnpj: company.cnpj ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      city: company.city ?? "",
      state: company.state ?? "",
      meals_per_day: company.meals_per_day?.toString() ?? "",
      cmv_target: company.cmv_target?.toString() ?? "",
      profit_target: company.profit_target?.toString() ?? "",
    });
  }, [company]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    try {
      let logo_url = company.logo_url;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${company.id}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("company-logos").upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        logo_url = supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("companies").update({
        name: form.name.trim(),
        cnpj: form.cnpj || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        state: form.state || null,
        meals_per_day: form.meals_per_day ? Number(form.meals_per_day) : null,
        cmv_target: form.cmv_target ? Number(form.cmv_target) : null,
        profit_target: form.profit_target ? Number(form.profit_target) : null,
        logo_url,
      }).eq("id", company.id);
      if (error) throw error;
      toast.success("Dados da empresa atualizados");
      setLogoFile(null);
      qc.invalidateQueries({ queryKey: ["my-company"] });
      qc.invalidateQueries({ queryKey: ["company-context"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações da empresa</h1>
          <p className="text-sm text-muted-foreground">Dados cadastrais, marca e metas operacionais.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresa</CardTitle>
          <CardDescription>Visível para todos os membros.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !company ? (
            <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="logo">Logo da empresa</Label>
                  <div className="flex items-center gap-2">
                    <Input id="logo" type="file" accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Nome da empresa</Label>
                  <Input id="name" required value={form.name} onChange={set("name")} />
                </div>
                <div className="space-y-1.5"><Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" value={form.cnpj} onChange={set("cnpj")} /></div>
                <div className="space-y-1.5"><Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={form.phone} onChange={set("phone")} /></div>
                <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={form.email} onChange={set("email")} /></div>
                <div className="space-y-1.5"><Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={form.city} onChange={set("city")} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <select id="state"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}>
                    <option value="">Selecione…</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Metas operacionais</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="meals">Refeições/dia (média)</Label>
                    <Input id="meals" type="number" min={0} value={form.meals_per_day} onChange={set("meals_per_day")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cmv">Meta de CMV (%)</Label>
                    <DecimalInput id="cmv" decimals={2} value={form.cmv_target} onValueChange={(v) => setForm((f) => ({ ...f, cmv_target: String(v) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profit">Meta de lucro (%)</Label>
                    <DecimalInput id="profit" decimals={2} value={form.profit_target} onValueChange={(v) => setForm((f) => ({ ...f, profit_target: String(v) }))} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !form.name.trim()}>
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
