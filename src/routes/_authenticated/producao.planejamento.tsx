import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2, Flame, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  SHIFTS,
  dateRange,
  formatDate,
  formatQty,
  shiftLabel,
  todayISO,
  addDaysISO,
  type ProductionContract,
  type ProductionPlan,
  type ProductionShift,
} from "@/lib/producao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/producao/planejamento")({
  component: PlanejamentoPage,
});

type RecipeOpt = { id: string; name: string; yield_qty: number };
type PlanRecipeRow = { recipe_id: string | null; name: string; planned_qty: number };
type PlanContractRow = { contract_id: string; meals: number };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function PlanejamentoPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(addDaysISO(todayISO(), 14));
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ProductionPlan | null>(null);

  // formulário
  const [multi, setMulti] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [dateEnd, setDateEnd] = useState(addDaysISO(todayISO(), 6));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [shift, setShift] = useState<ProductionShift>("almoco");
  const [customShift, setCustomShift] = useState("");
  const [menuName, setMenuName] = useState("");
  const [plannedMeals, setPlannedMeals] = useState(0);
  const [notes, setNotes] = useState("");
  const [recipes, setRecipes] = useState<PlanRecipeRow[]>([]);
  const [rateio, setRateio] = useState<PlanContractRow[]>([]);

  const { data: plans = [] } = useQuery({
    queryKey: ["production-plans", companyId, activeBranchId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("production_plans")
        .select("*")
        .eq("company_id", companyId!)
        .gte("plan_date", from)
        .lte("plan_date", to);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("plan_date").order("shift");
      if (error) throw error;
      return (data ?? []) as ProductionPlan[];
    },
  });

  const { data: recipeOpts = [] } = useQuery({
    queryKey: ["recipes-opts", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("recipes")
        .select("id,name,yield_qty")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as RecipeOpt[];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["production-contracts-active", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("production_contracts")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as ProductionContract[];
    },
  });

  const { data: planRecipes = [] } = useQuery({
    queryKey: ["production-plan-recipes", plans.map((p) => p.id).join(",")],
    enabled: plans.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("production_plan_recipes")
        .select("plan_id,name")
        .in("plan_id", plans.map((p) => p.id));
      return (data ?? []) as { plan_id: string; name: string }[];
    },
  });

  const menuByPlan = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of planRecipes) {
      const arr = m.get(r.plan_id) ?? [];
      arr.push(r.name);
      m.set(r.plan_id, arr);
    }
    return m;
  }, [planRecipes]);

  const rateioTotal = useMemo(
    () => rateio.reduce((a, r) => a + Number(r.meals || 0), 0),
    [rateio],
  );

  const resetForm = () => {
    setMulti(false);
    setDate(todayISO());
    setDateEnd(addDaysISO(todayISO(), 6));
    setWeekdays([1, 2, 3, 4, 5]);
    setShift("almoco");
    setCustomShift("");
    setMenuName("");
    setPlannedMeals(0);
    setNotes("");
    setRecipes([]);
    setRateio([]);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!menuName.trim()) throw new Error("Informe o nome do cardápio");
      if (multi && dateEnd < date) throw new Error("Data final anterior à inicial");
      const dates = multi ? dateRange(date, dateEnd, weekdays) : [date];
      if (dates.length === 0) throw new Error("Nenhuma data selecionada");

      for (const d of dates) {
        const { data: plan, error } = await supabase
          .from("production_plans")
          .insert({
            company_id: companyId,
            branch_id: activeBranchId,
            plan_date: d,
            shift,
            shift_label: shift === "personalizado" ? customShift || null : null,
            menu_name: menuName.trim(),
            planned_meals: plannedMeals,
            notes: notes || null,
          })
          .select("id")
          .single();
        if (error) throw error;

        const validRecipes = recipes.filter((r) => r.name.trim());
        if (validRecipes.length > 0) {
          const { error: e2 } = await supabase.from("production_plan_recipes").insert(
            validRecipes.map((r) => ({
              plan_id: plan.id,
              recipe_id: r.recipe_id,
              name: r.name.trim(),
              planned_qty: r.planned_qty,
            })),
          );
          if (e2) throw e2;
        }

        const validRateio = rateio.filter((r) => r.contract_id && Number(r.meals) > 0);
        if (validRateio.length > 0) {
          const { error: e3 } = await supabase.from("production_plan_contracts").insert(
            validRateio.map((r) => ({ plan_id: plan.id, contract_id: r.contract_id, meals: r.meals })),
          );
          if (e3) throw e3;
        }
      }
      return dates.length;
    },
    onSuccess: (n) => {
      toast.success(n > 1 ? `${n} planejamentos criados` : "Planejamento criado");
      setOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["production-plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planejamento removido");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["production-plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gerarProducao = useMutation({
    mutationFn: async (plan: ProductionPlan) => {
      if (!companyId) throw new Error("Sem empresa");
      const { data: run, error } = await supabase
        .from("production_runs")
        .insert({
          company_id: companyId,
          branch_id: plan.branch_id ?? activeBranchId,
          plan_id: plan.id,
          run_date: plan.plan_date,
          shift: plan.shift,
          shift_label: plan.shift_label,
          menu_name: plan.menu_name,
          planned_meals: Number(plan.planned_meals),
          status: "planejada",
        })
        .select("id")
        .single();
      if (error) throw error;

      const { data: prs } = await supabase
        .from("production_plan_recipes")
        .select("recipe_id,name,planned_qty")
        .eq("plan_id", plan.id);
      if (prs && prs.length > 0) {
        await supabase.from("production_run_recipes").insert(
          prs.map((r) => ({
            run_id: run.id,
            recipe_id: r.recipe_id,
            name: r.name,
            planned_qty: Number(r.planned_qty),
            produced_qty: Number(r.planned_qty),
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Produção criada na aba Produção");
      qc.invalidateQueries({ queryKey: ["production-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <Button onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo planejamento
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" /> Planejamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum planejamento no período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Cardápio</TableHead>
                  <TableHead>Pratos</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="w-[160px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.plan_date)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{shiftLabel(p.shift, p.shift_label)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{p.menu_name}</TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                      {(menuByPlan.get(p.id) ?? []).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatQty(Number(p.planned_meals))}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => gerarProducao.mutate(p)}
                        disabled={gerarProducao.isPending}
                      >
                        <Flame className="mr-1 h-3.5 w-3.5" /> Produzir
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(p)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo planejamento</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Checkbox
                id="multi"
                checked={multi}
                onCheckedChange={(v) => setMulti(!!v)}
              />
              <Label htmlFor="multi" className="text-sm font-normal">
                Criar para vários dias
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{multi ? "Data inicial" : "Data"}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {multi && (
                <div className="space-y-1">
                  <Label>Data final</Label>
                  <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </div>
              )}
            </div>

            {multi && (
              <div className="space-y-2">
                <Label className="text-xs">Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((w, i) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() =>
                        setWeekdays((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
                        )
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                        weekdays.includes(i)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Turno</Label>
                <Select value={shift} onValueChange={(v) => setShift(v as ProductionShift)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {shift === "personalizado" && (
                <div className="space-y-1">
                  <Label>Nome do turno</Label>
                  <Input value={customShift} onChange={(e) => setCustomShift(e.target.value)} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cardápio</Label>
                <Input
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="Ex.: Cardápio A"
                />
              </div>
              <div className="space-y-1">
                <Label>Refeições previstas</Label>
                <DecimalInput value={plannedMeals} onValueChange={setPlannedMeals} />
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Pratos do cardápio (ficha técnica)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRecipes([...recipes, { recipe_id: null, name: "", planned_qty: plannedMeals }])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Prato
                </Button>
              </div>
              {recipes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Adicione os pratos (arroz, feijão, carne, guarnições...) vinculados às fichas técnicas.
                </p>
              )}
              {recipes.map((r, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Select
                      value={r.recipe_id ?? ""}
                      onValueChange={(v) => {
                        const opt = recipeOpts.find((o) => o.id === v);
                        setRecipes(
                          recipes.map((x, i) =>
                            i === idx ? { ...x, recipe_id: v, name: opt?.name ?? x.name } : x,
                          ),
                        );
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione a ficha técnica" /></SelectTrigger>
                      <SelectContent>
                        {recipeOpts.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[120px] space-y-1">
                    <DecimalInput
                      value={r.planned_qty}
                      onValueChange={(v) =>
                        setRecipes(recipes.map((x, i) => (i === idx ? { ...x, planned_qty: v } : x)))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRecipes(recipes.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {contracts.length > 0 && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Refeições por contrato</Label>
                  <Badge variant="secondary">Total {formatQty(rateioTotal)}</Badge>
                </div>
                {contracts.map((c) => {
                  const row = rateio.find((r) => r.contract_id === c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{c.name}</span>
                      <DecimalInput
                        className="w-[120px]"
                        value={row?.meals ?? 0}
                        onValueChange={(v) =>
                          setRateio((prev) => {
                            const rest = prev.filter((r) => r.contract_id !== c.id);
                            return [...rest, { contract_id: c.id, meals: v }];
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover planejamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O cardápio e o rateio por contrato deste planejamento serão removidos.
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
