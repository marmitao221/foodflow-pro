import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Flame, Package, Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  SHIFTS,
  formatBRL,
  formatDate,
  formatQty,
  shiftLabel,
  statusLabel,
  todayISO,
  addDaysISO,
  type ProductionRun,
  type ProductionShift,
  type RunRequirement,
} from "@/lib/producao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/producao/turnos")({
  component: TurnosPage,
});

type RunRecipe = {
  id: string;
  recipe_id: string | null;
  name: string;
  planned_qty: number;
  produced_qty: number;
};
type Consumption = {
  id: string;
  item_name: string;
  unit: string;
  quantity: number;
  total_cost: number;
  is_packaging: boolean;
};
type PackRow = { item_id: string; quantity: number };

function TurnosPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();

  const [from, setFrom] = useState(addDaysISO(todayISO(), -7));
  const [to, setTo] = useState(todayISO());
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<ProductionRun | null>(null);
  const [toDelete, setToDelete] = useState<ProductionRun | null>(null);

  // novo turno
  const [nDate, setNDate] = useState(todayISO());
  const [nShift, setNShift] = useState<ProductionShift>("almoco");
  const [nCustom, setNCustom] = useState("");
  const [nMenu, setNMenu] = useState("");
  const [nPlanned, setNPlanned] = useState(0);
  const [nResp, setNResp] = useState<string>("");

  const { data: runs = [] } = useQuery({
    queryKey: ["production-runs", companyId, activeBranchId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("production_runs")
        .select("*")
        .eq("company_id", companyId!)
        .gte("run_date", from)
        .lte("run_date", to);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("run_date", { ascending: false }).order("shift");
      if (error) throw error;
      return (data ?? []) as ProductionRun[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-prod", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("employees")
        .select("id,full_name")
        .eq("company_id", companyId!)
        .eq("status", "ativo");
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel("producao-runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_runs" }, () => {
        qc.invalidateQueries({ queryKey: ["production-runs"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [companyId, qc]);

  const createRun = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!nMenu.trim()) throw new Error("Informe o cardápio");
      const emp = employees.find((e) => e.id === nResp);
      const { error } = await supabase.from("production_runs").insert({
        company_id: companyId,
        branch_id: activeBranchId,
        run_date: nDate,
        shift: nShift,
        shift_label: nShift === "personalizado" ? nCustom || null : null,
        menu_name: nMenu.trim(),
        planned_meals: nPlanned,
        responsible_employee_id: emp?.id ?? null,
        responsible_name: emp?.full_name ?? null,
        status: "planejada",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produção criada");
      setNewOpen(false);
      setNMenu(""); setNPlanned(0); setNResp("");
      qc.invalidateQueries({ queryKey: ["production-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_runs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produção removida");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["production-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = useMemo(() => {
    return runs.reduce(
      (acc, r) => ({
        planned: acc.planned + Number(r.planned_meals || 0),
        produced: acc.produced + Number(r.produced_meals || 0),
        served: acc.served + Number(r.served_meals || 0),
        waste: acc.waste + Number(r.waste_qty || 0),
      }),
      { planned: 0, produced: 0, served: 0, waste: 0 },
    );
  }, [runs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" className="w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" className="w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova produção
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Planejadas", value: totals.planned },
          { label: "Produzidas", value: totals.produced },
          { label: "Servidas", value: totals.served },
          { label: "Desperdício", value: totals.waste },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-xl font-semibold">{formatQty(k.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-primary" /> Produções por turno
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma produção no período. Crie uma produção ou gere a partir de um planejamento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Cardápio</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Prev.</TableHead>
                  <TableHead className="text-right">Prod.</TableHead>
                  <TableHead className="text-right">Servidas</TableHead>
                  <TableHead className="text-right">Insumos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[130px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.run_date)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{shiftLabel(r.shift, r.shift_label)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.menu_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.responsible_name || "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatQty(Number(r.planned_meals))}</TableCell>
                    <TableCell className="text-right">{formatQty(Number(r.produced_meals))}</TableCell>
                    <TableCell className="text-right">{formatQty(Number(r.served_meals))}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(r.consumption_value))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "finalizada"
                            ? "default"
                            : r.status === "em_andamento"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {statusLabel[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setDetail(r)}>
                        Abrir
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova produção</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={nDate} onChange={(e) => setNDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Turno</Label>
                <Select value={nShift} onValueChange={(v) => setNShift(v as ProductionShift)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {nShift === "personalizado" && (
              <div className="space-y-1">
                <Label>Nome do turno</Label>
                <Input value={nCustom} onChange={(e) => setNCustom(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Cardápio</Label>
              <Input value={nMenu} onChange={(e) => setNMenu(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Refeições previstas</Label>
                <DecimalInput value={nPlanned} onValueChange={setNPlanned} />
              </div>
              <div className="space-y-1">
                <Label>Responsável</Label>
                <Select value={nResp} onValueChange={setNResp}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRun.mutate()} disabled={createRun.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {detail && (
        <RunDetailDialog
          run={detail}
          employees={employees}
          onClose={() => setDetail(null)}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produção?</AlertDialogTitle>
            <AlertDialogDescription>
              As baixas de estoque já realizadas não são revertidas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RunDetailDialog({
  run,
  employees,
  onClose,
}: {
  run: ProductionRun;
  employees: { id: string; full_name: string }[];
  onClose: () => void;
}) {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();

  const [produced, setProduced] = useState(Number(run.produced_meals));
  const [served, setServed] = useState(Number(run.served_meals));
  const [leftover, setLeftover] = useState(Number(run.leftover_clean));
  const [waste, setWaste] = useState(Number(run.waste_qty));
  const [notes, setNotes] = useState(run.notes ?? "");
  const [resp, setResp] = useState(run.responsible_employee_id ?? "");
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [missing, setMissing] = useState<{ name: string; required: number; available: number }[]>([]);

  const { data: runRecipes = [] } = useQuery({
    queryKey: ["run-recipes", run.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_run_recipes")
        .select("*")
        .eq("run_id", run.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as RunRecipe[];
    },
  });

  const { data: recipeOpts = [] } = useQuery({
    queryKey: ["recipes-opts", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("recipes").select("id,name,yield_qty")
        .eq("company_id", companyId!).eq("is_active", true);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("name");
      return (data ?? []) as { id: string; name: string; yield_qty: number }[];
    },
  });

  const { data: stockOpts = [] } = useQuery({
    queryKey: ["stock-opts", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("stock_items").select("id,name,unit,quantity")
        .eq("company_id", companyId!).eq("is_active", true);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("name");
      return (data ?? []) as { id: string; name: string; unit: string; quantity: number }[];
    },
  });

  const { data: requirements = [], refetch: refetchReq } = useQuery({
    queryKey: ["run-requirements", run.id, runRecipes.length],
    enabled: !run.stock_applied,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("production_run_requirements", { _run_id: run.id });
      if (error) throw error;
      return (data ?? []) as RunRequirement[];
    },
  });

  const { data: consumptions = [] } = useQuery({
    queryKey: ["run-consumptions", run.id],
    enabled: run.stock_applied,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_consumptions")
        .select("id,item_name,unit,quantity,total_cost,is_packaging")
        .eq("run_id", run.id)
        .order("item_name");
      if (error) throw error;
      return (data ?? []) as Consumption[];
    },
  });

  const addRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      const opt = recipeOpts.find((o) => o.id === recipeId);
      const { error } = await supabase.from("production_run_recipes").insert({
        run_id: run.id,
        recipe_id: recipeId,
        name: opt?.name ?? "",
        planned_qty: produced,
        produced_qty: produced,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["run-recipes", run.id] });
      void refetchReq();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRecipeQty = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      const { error } = await supabase
        .from("production_run_recipes").update({ produced_qty: qty }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["run-recipes", run.id] });
      void refetchReq();
    },
  });

  const removeRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_run_recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["run-recipes", run.id] });
      void refetchReq();
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      const extra = packs
        .filter((p) => p.item_id && p.quantity > 0)
        .map((p) => {
          const it = stockOpts.find((s) => s.id === p.item_id);
          return { item_id: p.item_id, name: it?.name ?? "", unit: it?.unit ?? "un", quantity: p.quantity };
        });
      const { data, error } = await supabase.rpc("start_production_run", {
        _run_id: run.id,
        _extra: extra,
      });
      if (error) throw error;
      return data as { ok: boolean; missing?: typeof missing; consumption_value?: number };
    },
    onSuccess: (res) => {
      if (!res.ok) {
        setMissing(res.missing ?? []);
        toast.error("Estoque insuficiente para iniciar a produção");
        return;
      }
      setMissing([]);
      toast.success("Produção iniciada e insumos baixados do estoque");
      qc.invalidateQueries({ queryKey: ["production-runs"] });
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (finish: boolean) => {
      const emp = employees.find((e) => e.id === resp);
      const { error } = await supabase
        .from("production_runs")
        .update({
          produced_meals: produced,
          served_meals: served,
          leftover_clean: leftover,
          waste_qty: waste,
          notes: notes || null,
          responsible_employee_id: emp?.id ?? null,
          responsible_name: emp?.full_name ?? null,
          ...(finish
            ? { status: "finalizada" as const, finished_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", run.id);
      if (error) throw error;
    },
    onSuccess: (_d, finish) => {
      toast.success(finish ? "Turno finalizado" : "Dados salvos");
      qc.invalidateQueries({ queryKey: ["production-runs"] });
      if (finish) onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reqTotal = useMemo(
    () => requirements.reduce((a, r) => a + Number(r.total_cost || 0), 0),
    [requirements],
  );
  const hasShortage = requirements.some((r) => Number(r.shortage) > 0);
  const eficiencia =
    Number(run.planned_meals) > 0 ? (produced / Number(run.planned_meals)) * 100 : 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {formatDate(run.run_date)} · {shiftLabel(run.shift, run.shift_label)}
            <Badge variant="secondary">{statusLabel[run.status]}</Badge>
            {run.stock_applied && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> estoque baixado
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cardápio */}
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Cardápio produzido</Label>
              {!run.stock_applied && (
                <Select value="" onValueChange={(v) => addRecipe.mutate(v)}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Adicionar prato" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipeOpts.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {runRecipes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Adicione os pratos vinculados às fichas técnicas para calcular o consumo de insumos.
              </p>
            ) : (
              runRecipes.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{r.name}</span>
                  <DecimalInput
                    className="w-[120px]"
                    value={Number(r.produced_qty)}
                    disabled={run.stock_applied}
                    onValueChange={(v) => updateRecipeQty.mutate({ id: r.id, qty: v })}
                  />
                  {!run.stock_applied && (
                    <Button variant="ghost" size="icon" onClick={() => removeRecipe.mutate(r.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Insumos */}
          {!run.stock_applied ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary" /> Prévia do consumo de insumos
                </Label>
                <Badge variant="secondary">{formatBRL(reqTotal)}</Badge>
              </div>
              {requirements.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sem insumos calculados — verifique se os pratos têm ingredientes na ficha técnica.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Necessário</TableHead>
                      <TableHead className="text-right">Em estoque</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirements.map((r, i) => (
                      <TableRow key={`${r.item_id ?? r.item_name}-${i}`}>
                        <TableCell className="text-sm">
                          {r.item_name}
                          {Number(r.shortage) > 0 && (
                            <Badge variant="destructive" className="ml-2 text-[10px]">
                              falta {formatQty(Number(r.shortage))}
                            </Badge>
                          )}
                          {!r.item_id && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              sem item no estoque
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatQty(Number(r.required_qty))} {r.unit}
                        </TableCell>
                        <TableCell className="text-right">{formatQty(Number(r.available_qty))}</TableCell>
                        <TableCell className="text-right">{formatBRL(Number(r.total_cost))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Embalagens */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Embalagens e descartáveis</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPacks([...packs, { item_id: "", quantity: produced }])}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Item
                  </Button>
                </div>
                {packs.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      value={p.item_id}
                      onValueChange={(v) =>
                        setPacks(packs.map((x, i) => (i === idx ? { ...x, item_id: v } : x)))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Marmita, tampa, talher, copo, guardanapo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stockOpts.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name} ({formatQty(Number(o.quantity))} {o.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DecimalInput
                      className="w-[120px]"
                      value={p.quantity}
                      onValueChange={(v) =>
                        setPacks(packs.map((x, i) => (i === idx ? { ...x, quantity: v } : x)))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPacks(packs.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {(hasShortage || missing.length > 0) && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Estoque insuficiente</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {(missing.length > 0
                        ? missing
                        : requirements
                            .filter((r) => Number(r.shortage) > 0)
                            .map((r) => ({
                              name: r.item_name,
                              required: Number(r.required_qty),
                              available: Number(r.available_qty),
                            }))
                      ).map((m) => (
                        <li key={m.name}>
                          {m.name}: precisa {formatQty(m.required)} · disponível {formatQty(m.available)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => start.mutate()}
                disabled={start.isPending || runRecipes.length === 0}
              >
                <Flame className="mr-2 h-4 w-4" /> Iniciar produção e baixar insumos
              </Button>
            </div>
          ) : (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary" /> Insumos consumidos
                </Label>
                <Badge variant="secondary">{formatBRL(Number(run.consumption_value))}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">
                        {c.item_name}
                        {c.is_packaging && (
                          <Badge variant="outline" className="ml-2 text-[10px]">embalagem</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatQty(Number(c.quantity))} {c.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatBRL(Number(c.total_cost))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Apontamentos */}
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Select value={resp} onValueChange={setResp}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Eficiência (produzido / previsto)</Label>
              <div className="flex h-9 items-center rounded-md border border-border px-3 text-sm">
                {eficiencia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              </div>
            </div>
            <div className="space-y-1">
              <Label>Quantidade produzida</Label>
              <DecimalInput value={produced} onValueChange={setProduced} />
            </div>
            <div className="space-y-1">
              <Label>Quantidade servida</Label>
              <DecimalInput value={served} onValueChange={setServed} />
            </div>
            <div className="space-y-1">
              <Label>Sobras limpas</Label>
              <DecimalInput value={leftover} onValueChange={setLeftover} />
            </div>
            <div className="space-y-1">
              <Label>Desperdício</Label>
              <DecimalInput value={waste} onValueChange={setWaste} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="secondary" onClick={() => save.mutate(false)} disabled={save.isPending}>
            Salvar
          </Button>
          {run.status !== "finalizada" && (
            <Button onClick={() => save.mutate(true)} disabled={save.isPending}>
              Finalizar turno
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
