import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  SHIFTS,
  WASTE_REASONS,
  addDaysISO,
  formatBRL,
  formatDate,
  formatQty,
  shiftLabel,
  todayISO,
  wasteKindLabel,
  type ProductionShift,
  type WasteKind,
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

export const Route = createFileRoute("/_authenticated/producao/desperdicio")({
  component: DesperdicioPage,
});

type Waste = {
  id: string;
  waste_date: string;
  shift: ProductionShift;
  kind: WasteKind;
  product_name: string;
  quantity: number;
  unit: string;
  estimated_cost: number;
  reason: string | null;
  notes: string | null;
  item_id: string | null;
};

function DesperdicioPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();

  const [from, setFrom] = useState(addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [shift, setShift] = useState<ProductionShift>("almoco");
  const [kind, setKind] = useState<WasteKind>("sobra_descartada");
  const [itemId, setItemId] = useState<string>("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState(0);
  const [unit, setUnit] = useState("kg");
  const [cost, setCost] = useState(0);
  const [reason, setReason] = useState(WASTE_REASONS[0]!);
  const [notes, setNotes] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["stock-opts-waste", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("stock_items")
        .select("id,name,unit,unit_value")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("name");
      return (data ?? []) as { id: string; name: string; unit: string; unit_value: number }[];
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["production-waste", companyId, activeBranchId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("production_waste")
        .select("id,waste_date,shift,kind,product_name,quantity,unit,estimated_cost,reason,notes,item_id")
        .eq("company_id", companyId!)
        .gte("waste_date", from)
        .lte("waste_date", to);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("waste_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Waste[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      const finalName = itemId ? (items.find((i) => i.id === itemId)?.name ?? name) : name.trim();
      if (!finalName) throw new Error("Informe o produto");
      const { error } = await supabase.from("production_waste").insert({
        company_id: companyId,
        branch_id: activeBranchId,
        waste_date: date,
        shift,
        kind,
        item_id: itemId || null,
        product_name: finalName,
        quantity: qty,
        unit,
        estimated_cost: cost,
        reason,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Desperdício registrado");
      setOpen(false);
      setName(""); setItemId(""); setQty(0); setCost(0); setNotes("");
      qc.invalidateQueries({ queryKey: ["production-waste"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_waste").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido");
      qc.invalidateQueries({ queryKey: ["production-waste"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpis = useMemo(() => {
    const totalQty = rows.reduce((a, r) => a + Number(r.quantity || 0), 0);
    const totalCost = rows.reduce((a, r) => a + Number(r.estimated_cost || 0), 0);
    const limpa = rows.filter((r) => r.kind === "sobra_limpa").reduce((a, r) => a + Number(r.quantity), 0);
    return { totalQty, totalCost, limpa, descartada: totalQty - limpa };
  }, [rows]);

  const byReason = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.reason || "Não informado";
      map.set(key, (map.get(key) || 0) + Number(r.estimated_cost || 0));
    }
    return Array.from(map, ([motivo, custo]) => ({ motivo, custo })).sort((a, b) => b.custo - a.custo);
  }, [rows]);

  const onPickItem = (id: string) => {
    setItemId(id);
    const it = items.find((i) => i.id === id);
    if (it) {
      setName(it.name);
      setUnit(it.unit);
      setCost(Number(it.unit_value) * (qty || 0));
    }
  };

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
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Registrar desperdício
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Quantidade total", value: formatQty(kpis.totalQty) },
          { label: "Custo estimado", value: formatBRL(kpis.totalCost) },
          { label: "Sobras limpas", value: formatQty(kpis.limpa) },
          { label: "Sobras descartadas", value: formatQty(kpis.descartada) },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-xl font-semibold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Custo por motivo</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {byReason.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sem registros no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byReason}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="motivo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="custo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum desperdício registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.waste_date)}</TableCell>
                    <TableCell>{shiftLabel(r.shift)}</TableCell>
                    <TableCell className="font-medium">{r.product_name}</TableCell>
                    <TableCell>
                      <Badge variant={r.kind === "sobra_limpa" ? "secondary" : "outline"}>
                        {wasteKindLabel[r.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reason || "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatQty(Number(r.quantity))} {r.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatBRL(Number(r.estimated_cost))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
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
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar desperdício</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
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
            </div>
            <div className="space-y-1">
              <Label>Item do estoque (opcional)</Label>
              <Select value={itemId} onValueChange={onPickItem}>
                <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Produto / preparação</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <DecimalInput
                  value={qty}
                  onValueChange={(v) => {
                    setQty(v);
                    const it = items.find((i) => i.id === itemId);
                    if (it) setCost(Number(it.unit_value) * v);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Custo estimado</Label>
                <DecimalInput value={cost} onValueChange={setCost} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as WasteKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sobra_limpa">Sobra limpa</SelectItem>
                    <SelectItem value="sobra_descartada">Sobra descartada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WASTE_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
