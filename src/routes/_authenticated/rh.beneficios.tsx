import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Wallet, Users, CalendarClock, FileBarChart, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import { fmtBRL, PAYMENT_TYPES, MONTHS_PT, type BenefitType, type EmployeeBenefit, type BenefitPayment } from "@/lib/beneficios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/rh/beneficios")({
  component: BeneficiosPage,
});

type Emp = { id: string; full_name: string; branch_id: string | null };
type Branch = { id: string; name: string };

function BeneficiosPage() {
  const [tab, setTab] = useState("tipos");
  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tipos"><Wallet className="mr-2 h-4 w-4" />Tipos de Benefício</TabsTrigger>
          <TabsTrigger value="vinculos"><Users className="mr-2 h-4 w-4" />Vínculos por Funcionário</TabsTrigger>
          <TabsTrigger value="lancamentos"><CalendarClock className="mr-2 h-4 w-4" />Lançamentos Mensais</TabsTrigger>
          <TabsTrigger value="relatorios"><FileBarChart className="mr-2 h-4 w-4" />Relatórios</TabsTrigger>
        </TabsList>
        <TabsContent value="tipos" className="mt-4"><TiposTab /></TabsContent>
        <TabsContent value="vinculos" className="mt-4"><VinculosTab /></TabsContent>
        <TabsContent value="lancamentos" className="mt-4"><LancamentosTab /></TabsContent>
        <TabsContent value="relatorios" className="mt-4"><RelatoriosTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============== TIPOS DE BENEFÍCIO ============== */
function TiposTab() {
  const { data: companyId } = useMyCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BenefitType | null>(null);
  const [form, setForm] = useState({ name: "", default_value: 0, payment_type: "mensal", payment_day: 5, active: true, notes: "" });
  const [toDelete, setToDelete] = useState<BenefitType | null>(null);

  const { data: types = [] } = useQuery({
    queryKey: ["benefit_types", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("benefit_types").select("*").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return (data ?? []) as BenefitType[];
    },
  });

  const reset = () => { setEditing(null); setForm({ name: "", default_value: 0, payment_type: "mensal", payment_day: 5, active: true, notes: "" }); };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = {
        name: form.name.trim(),
        default_value: Number(form.default_value) || 0,
        payment_type: form.payment_type,
        payment_day: Number(form.payment_day) || 1,
        active: form.active,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("benefit_types").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("benefit_types").insert({ company_id: companyId, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Benefício atualizado" : "Benefício criado");
      qc.invalidateQueries({ queryKey: ["benefit_types"] });
      setOpen(false); reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("benefit_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["benefit_types"] }); setToDelete(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cadastre os tipos de benefícios oferecidos pela empresa.</p>
        <Button onClick={() => { reset(); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo tipo</Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {types.map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {PAYMENT_TYPES.find((p) => p.value === t.payment_type)?.label ?? t.payment_type} • dia {t.payment_day}
                  </p>
                </div>
                <Badge variant={t.active ? "default" : "secondary"}>{t.active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="text-sm font-semibold">{fmtBRL(t.default_value)}</p>
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing(t);
                  setForm({ name: t.name, default_value: t.default_value, payment_type: t.payment_type, payment_day: t.payment_day, active: t.active, notes: t.notes ?? "" });
                  setOpen(true);
                }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setToDelete(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {types.length === 0 && <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} tipo de benefício</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Vale Alimentação" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor padrão (R$)</Label><Input type="number" step="0.01" value={form.default_value} onChange={(e) => setForm({ ...form, default_value: Number(e.target.value) })} /></div>
              <div>
                <Label>Tipo de pagamento</Label>
                <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Dia de pagamento</Label><Input type="number" min="1" max="31" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativo</Label></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir tipo de benefício?</AlertDialogTitle><AlertDialogDescription>Vínculos e lançamentos que usam esse tipo bloqueiam a exclusão.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => toDelete && del.mutate(toDelete.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============== VÍNCULOS POR FUNCIONÁRIO ============== */
function VinculosTab() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeBenefit | null>(null);
  const [form, setForm] = useState({ employee_id: "", benefit_type_id: "", monthly_value: 0, start_date: new Date().toISOString().slice(0, 10), end_date: "", active: true, notes: "" });
  const [toDelete, setToDelete] = useState<EmployeeBenefit | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-mini", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees").select("id,full_name,branch_id").eq("company_id", companyId!).eq("status", "ativo");
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as Emp[];
    },
  });

  const { data: types = [] } = useQuery({
    queryKey: ["benefit_types_active", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("benefit_types").select("*").eq("company_id", companyId!).eq("active", true).order("name");
      return (data ?? []) as BenefitType[];
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ["employee_benefits", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employee_benefits").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("created_at", { ascending: false });
      return (data ?? []) as EmployeeBenefit[];
    },
  });

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);

  // Agrupar por funcionário
  const grouped = useMemo(() => {
    const g: Record<string, { emp: Emp | undefined; items: EmployeeBenefit[]; total: number }> = {};
    for (const v of vinculos) {
      if (!g[v.employee_id]) g[v.employee_id] = { emp: empMap[v.employee_id], items: [], total: 0 };
      g[v.employee_id].items.push(v);
      if (v.active) g[v.employee_id].total += Number(v.monthly_value);
    }
    return Object.values(g).filter((x) => x.emp);
  }, [vinculos, empMap]);

  const reset = () => { setEditing(null); setForm({ employee_id: "", benefit_type_id: "", monthly_value: 0, start_date: new Date().toISOString().slice(0, 10), end_date: "", active: true, notes: "" }); };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.employee_id || !form.benefit_type_id) throw new Error("Selecione funcionário e benefício");
      const emp = employees.find((e) => e.id === form.employee_id);
      const payload = {
        employee_id: form.employee_id,
        benefit_type_id: form.benefit_type_id,
        branch_id: emp?.branch_id ?? null,
        monthly_value: Number(form.monthly_value) || 0,
        start_date: form.start_date,
        end_date: form.end_date || null,
        active: form.active,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("employee_benefits").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_benefits").insert({ company_id: companyId, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Vínculo salvo"); qc.invalidateQueries({ queryKey: ["employee_benefits"] }); setOpen(false); reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_benefits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vínculo removido"); qc.invalidateQueries({ queryKey: ["employee_benefits"] }); setToDelete(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Vincule benefícios a cada funcionário e defina o valor mensal.</p>
        <Button onClick={() => { reset(); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo vínculo</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {grouped.map((g) => (
          <Card key={g.emp!.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{g.emp!.full_name}</CardTitle>
                <Badge>{fmtBRL(g.total)} / mês</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {g.items.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <div>
                    <p className="font-medium">{typeMap[v.benefit_type_id]?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Desde {v.start_date}{v.end_date ? ` até ${v.end_date}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{fmtBRL(v.monthly_value)}</span>
                    {!v.active && <Badge variant="secondary">inativo</Badge>}
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditing(v);
                      setForm({ employee_id: v.employee_id, benefit_type_id: v.benefit_type_id, monthly_value: v.monthly_value, start_date: v.start_date, end_date: v.end_date ?? "", active: v.active, notes: v.notes ?? "" });
                      setOpen(true);
                    }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {grouped.length === 0 && <p className="text-sm text-muted-foreground">Nenhum vínculo cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} vínculo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Funcionário</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Benefício</Label>
              <Select value={form.benefit_type_id} onValueChange={(v) => {
                const t = types.find((tt) => tt.id === v);
                setForm({ ...form, benefit_type_id: v, monthly_value: t?.default_value ?? form.monthly_value });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor mensal (R$)</Label><Input type="number" step="0.01" value={form.monthly_value} onChange={(e) => setForm({ ...form, monthly_value: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativo</Label></div>
              <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover vínculo?</AlertDialogTitle><AlertDialogDescription>Lançamentos já gerados serão mantidos.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => toDelete && del.mutate(toDelete.id)}>Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============== LANÇAMENTOS MENSAIS ============== */
function LancamentosTab() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const now = new Date();
  const [ref, setRef] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["benefit_payments", companyId, activeBranchId, ref.year, ref.month],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("benefit_payments").select("*")
        .eq("company_id", companyId!).eq("reference_year", ref.year).eq("reference_month", ref.month);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("created_at", { ascending: false });
      return (data ?? []) as BenefitPayment[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-mini-all", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id,full_name,branch_id").eq("company_id", companyId!);
      return (data ?? []) as Emp[];
    },
  });

  const { data: types = [] } = useQuery({
    queryKey: ["benefit_types_all", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("benefit_types").select("*").eq("company_id", companyId!);
      return (data ?? []) as BenefitType[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-mini", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id,name").eq("company_id", companyId!);
      return (data ?? []) as Branch[];
    },
  });

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);
  const branchMap = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b])), [branches]);

  const total = pagamentos.reduce((s, p) => s + Number(p.amount), 0);

  const gerar = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      // Busca todos os vínculos ativos (filtrando por filial ativa se houver)
      let vq = supabase.from("employee_benefits").select("*").eq("company_id", companyId).eq("active", true);
      if (activeBranchId) vq = vq.eq("branch_id", activeBranchId);
      const { data: vinculos, error: ve } = await vq;
      if (ve) throw ve;
      if (!vinculos || vinculos.length === 0) throw new Error("Nenhum vínculo ativo encontrado");

      // Categoria "Benefícios de Funcionários"
      const { data: cats } = await supabase.from("financial_categories").select("id,name")
        .eq("company_id", companyId).eq("type", "despesa").eq("name", "Benefícios de Funcionários");
      let categoryId = cats?.[0]?.id;
      if (!categoryId) {
        const { data: newCat, error: ce } = await supabase.from("financial_categories")
          .insert({ company_id: companyId, name: "Benefícios de Funcionários", type: "despesa", color: "#F59E0B" }).select("id").single();
        if (ce) throw ce;
        categoryId = newCat.id;
      }

      const refDate = new Date(ref.year, ref.month - 1, 5).toISOString().slice(0, 10);
      let criados = 0;
      let pulados = 0;

      for (const v of vinculos as EmployeeBenefit[]) {
        // Verifica se já existe pagamento
        const { data: existing } = await supabase.from("benefit_payments").select("id")
          .eq("employee_id", v.employee_id).eq("benefit_type_id", v.benefit_type_id)
          .eq("reference_year", ref.year).eq("reference_month", ref.month).maybeSingle();
        if (existing) { pulados++; continue; }

        const emp = employees.find((e) => e.id === v.employee_id);
        const t = types.find((tt) => tt.id === v.benefit_type_id);
        const desc = `Benefício ${t?.name ?? ""} — ${emp?.full_name ?? ""} (${String(ref.month).padStart(2, "0")}/${ref.year})`;

        // Cria transação financeira
        const { data: tx, error: te } = await supabase.from("financial_transactions").insert({
          company_id: companyId,
          branch_id: v.branch_id,
          category_id: categoryId,
          description: desc,
          amount: v.monthly_value,
          type: "despesa",
          status: "pendente",
          due_date: refDate,
          notes: "Gerado automaticamente pelo módulo de Benefícios (RH)",
        }).select("id").single();
        if (te) throw te;

        // Cria lançamento
        const { error: pe } = await supabase.from("benefit_payments").insert({
          company_id: companyId,
          branch_id: v.branch_id,
          employee_id: v.employee_id,
          benefit_type_id: v.benefit_type_id,
          employee_benefit_id: v.id,
          reference_month: ref.month,
          reference_year: ref.year,
          amount: v.monthly_value,
          payment_date: refDate,
          financial_transaction_id: tx.id,
          status: "pendente",
        });
        if (pe) throw pe;
        criados++;
      }
      return { criados, pulados };
    },
    onSuccess: (r) => {
      toast.success(`${r.criados} lançamento(s) gerado(s). ${r.pulados > 0 ? `${r.pulados} já existiam.` : ""}`);
      qc.invalidateQueries({ queryKey: ["benefit_payments"] });
      qc.invalidateQueries({ queryKey: ["financial-transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const marcarPago = useMutation({
    mutationFn: async (p: BenefitPayment) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("benefit_payments").update({ status: "pago", payment_date: today }).eq("id", p.id);
      if (error) throw error;
      if (p.financial_transaction_id) {
        await supabase.from("financial_transactions").update({ status: "pago", payment_date: today }).eq("id", p.financial_transaction_id);
      }
    },
    onSuccess: () => { toast.success("Marcado como pago"); qc.invalidateQueries({ queryKey: ["benefit_payments"] }); qc.invalidateQueries({ queryKey: ["financial-transactions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (p: BenefitPayment) => {
      const { error } = await supabase.from("benefit_payments").delete().eq("id", p.id);
      if (error) throw error;
      if (p.financial_transaction_id) {
        await supabase.from("financial_transactions").delete().eq("id", p.financial_transaction_id);
      }
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["benefit_payments"] }); qc.invalidateQueries({ queryKey: ["financial-transactions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const yearOpts = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={String(ref.month)} onValueChange={(v) => setRef({ ...ref, month: Number(v) })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(ref.year)} onValueChange={(v) => setRef({ ...ref, year: Number(v) })}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOpts.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">Total do mês: <span className="font-semibold text-foreground">{fmtBRL(total)}</span></p>
        </div>
        <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          <Sparkles className="mr-2 h-4 w-4" />Gerar lançamentos do mês
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Benefício</TableHead>
              <TableHead>Filial</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagamentos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{empMap[p.employee_id]?.full_name ?? "—"}</TableCell>
                <TableCell>{typeMap[p.benefit_type_id]?.name ?? "—"}</TableCell>
                <TableCell>{p.branch_id ? branchMap[p.branch_id]?.name ?? "—" : "Matriz"}</TableCell>
                <TableCell>{fmtBRL(p.amount)}</TableCell>
                <TableCell>{p.payment_date}</TableCell>
                <TableCell><Badge variant={p.status === "pago" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {p.status !== "pago" && (
                    <Button size="sm" variant="outline" onClick={() => marcarPago.mutate(p)}>Marcar pago</Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => excluir.mutate(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {pagamentos.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Nenhum lançamento no período. Clique em "Gerar lançamentos do mês".</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ============== RELATÓRIOS ============== */
function RelatoriosTab() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const now = new Date();
  const [ref, setRef] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["benefit_payments_report", companyId, activeBranchId, ref.year, ref.month],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("benefit_payments").select("*")
        .eq("company_id", companyId!).eq("reference_year", ref.year).eq("reference_month", ref.month);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q;
      return (data ?? []) as BenefitPayment[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["benefit_payments_history", companyId, activeBranchId, ref.year],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("benefit_payments").select("*")
        .eq("company_id", companyId!).eq("reference_year", ref.year);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q;
      return (data ?? []) as BenefitPayment[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-full", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id,full_name,branch_id,salary").eq("company_id", companyId!);
      return (data ?? []) as (Emp & { salary: number })[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-report", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id,name").eq("company_id", companyId!);
      return (data ?? []) as Branch[];
    },
  });

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const branchMap = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b])), [branches]);

  const porFuncionario = useMemo(() => {
    const g: Record<string, number> = {};
    for (const p of pagamentos) g[p.employee_id] = (g[p.employee_id] ?? 0) + Number(p.amount);
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [pagamentos]);

  const porFilial = useMemo(() => {
    const g: Record<string, { total: number; funcs: Set<string> }> = {};
    for (const p of pagamentos) {
      const key = p.branch_id ?? "__matriz";
      if (!g[key]) g[key] = { total: 0, funcs: new Set() };
      g[key].total += Number(p.amount);
      g[key].funcs.add(p.employee_id);
    }
    return Object.entries(g);
  }, [pagamentos]);

  const historicoMensal = useMemo(() => {
    const g: Record<number, number> = {};
    for (const p of history) g[p.reference_month] = (g[p.reference_month] ?? 0) + Number(p.amount);
    return MONTHS_PT.map((m, i) => ({ mes: m, total: g[i + 1] ?? 0 }));
  }, [history]);

  const totalMes = pagamentos.reduce((s, p) => s + Number(p.amount), 0);
  const totalFolha = employees.reduce((s, e) => s + Number(e.salary || 0), 0);
  const impactoPct = totalFolha > 0 ? (totalMes / totalFolha) * 100 : 0;

  const yearOpts = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={String(ref.month)} onValueChange={(v) => setRef({ ...ref, month: Number(v) })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(ref.year)} onValueChange={(v) => setRef({ ...ref, year: Number(v) })}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{yearOpts.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Custo total do mês</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmtBRL(totalMes)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Folha (salários base)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmtBRL(totalFolha)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Impacto sobre a folha</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{impactoPct.toFixed(1)}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Benefícios por funcionário</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {porFuncionario.map(([id, total]) => (
              <div key={id} className="flex justify-between border-b border-border py-1 text-sm">
                <span>{empMap[id]?.full_name ?? "—"}</span>
                <span className="font-semibold">{fmtBRL(total)}</span>
              </div>
            ))}
            {porFuncionario.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Benefícios por filial</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {porFilial.map(([key, v]) => (
              <div key={key} className="flex justify-between border-b border-border py-1 text-sm">
                <span>{key === "__matriz" ? "Matriz" : branchMap[key]?.name ?? "—"} <span className="text-xs text-muted-foreground">({v.funcs.size} func.)</span></span>
                <span className="font-semibold">{fmtBRL(v.total)}</span>
              </div>
            ))}
            {porFilial.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Histórico mensal ({ref.year})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {historicoMensal.map((h) => (
                <div key={h.mes} className="rounded-md border border-border p-2">
                  <p className="text-xs text-muted-foreground">{h.mes.slice(0, 3)}</p>
                  <p className="text-sm font-semibold">{fmtBRL(h.total)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
