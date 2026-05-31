import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

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

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", cnpj: "", phone: "", email: "", city: "", state: "",
    meals_per_day: "", cmv_target: "", profit_target: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const companyId = crypto.randomUUID();
      const { data: company, error: cErr } = await supabase
        .from("companies")
        .insert({
          id: companyId,
          name: form.name.trim(),
          cnpj: form.cnpj || null,
          phone: form.phone || null,
          email: form.email || null,
          city: form.city || null,
          state: form.state || null,
          meals_per_day: form.meals_per_day ? Number(form.meals_per_day) : null,
          cmv_target: form.cmv_target ? Number(form.cmv_target) : null,
          profit_target: form.profit_target ? Number(form.profit_target) : null,
          owner_id: user.id,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      const { error: mErr } = await supabase
        .from("memberships")
        .insert({ user_id: user.id, company_id: companyId, role: "owner" });
      if (mErr) throw mErr;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${company.id}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("company-logos").upload(path, logoFile, { upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
          await supabase.from("companies").update({ logo_url: pub.publicUrl }).eq("id", company.id);
        }
      }

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
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4"><Logo /></div>
          <CardTitle className="text-2xl">Configure sua empresa</CardTitle>
          <CardDescription>
            Esses dados são obrigatórios para começar. Você poderá ajustar tudo depois em Configurações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dados da empresa</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Nome da empresa *</Label>
                  <Input id="name" required value={form.name} onChange={set("name")} placeholder="Ex: Sabor & Cia Refeições" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="contato@empresa.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={form.city} onChange={set("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <select
                    id="state"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  >
                    <option value="">Selecione…</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="logo">Logo da empresa</Label>
                  <div className="flex items-center gap-3">
                    <Input id="logo" type="file" accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Configurações operacionais</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="meals">Refeições/dia (média)</Label>
                  <Input id="meals" type="number" min={0} value={form.meals_per_day} onChange={set("meals_per_day")} placeholder="800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cmv">Meta de CMV (%)</Label>
                  <Input id="cmv" type="number" step="0.01" min={0} max={100} value={form.cmv_target} onChange={set("cmv_target")} placeholder="35" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profit">Meta de lucro (%)</Label>
                  <Input id="profit" type="number" step="0.01" min={0} max={100} value={form.profit_target} onChange={set("profit_target")} placeholder="20" />
                </div>
              </div>
            </section>

            <Button type="submit" className="w-full" disabled={submitting || !form.name.trim()}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar empresa e acessar o sistema
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
