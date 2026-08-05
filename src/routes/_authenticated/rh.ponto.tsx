import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import { fmtHours } from "@/lib/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DecimalInput } from "@/components/ui/decimal-input";

export const Route = createFileRoute("/_authenticated/rh/ponto")({
  component: PontoPage,
});

type Entry = {
  id: string; employee_id: string; work_date: string;
  check_in: string | null; check_out: string | null;
  break_minutes: number; expected_hours: number;
  worked_hours: number; overtime_hours: number;
  night_hours: number; bank_balance_hours: number;
  notes: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };

const emptyForm = {
  employee_id: "", work_date: today(), check_in: "08:00", check_out: "17:00",
  break_minutes: 60, expected_hours: 8, notes: "",
};

function PontoPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-min", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees")
        .select("id,full_name,hour_rate,salary").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as { id: string; full_name: string; hour_rate: number; salary: number }[];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["time_entries", companyId, activeBranchId, from, to, employeeFilter],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("time_entries").select("*")
        .eq("company_id", companyId!)
        .gte("work_date", from).lte("work_date", to)
        .order("work_date", { ascending: false });
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      if (employeeFilter !== "all") q = q.eq("employee_id", employeeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.employee_id) throw new Error("Selecione um funcionário");
      const { error } = await supabase.from("time_entries").insert({
        company_id: companyId,
        branch_id: activeBranchId ?? null,
        employee_id: form.employee_id,
        work_date: form.work_date,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        break_minutes: Number(form.break_minutes) || 0,
        expected_hours: Number(form.expected_hours) || 0,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro lançado");
      qc.invalidateQueries({ queryKey: ["time_entries"] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido");
      qc.invalidateQueries({ queryKey: ["time_entries"] });
    },
  });

  const totals = useMemo(() => {
    const t = { worked: 0, overtime: 0, night: 0, bank: 0 };
    for (const e of entries) {
      t.worked += Number(e.worked_hours) || 0;
      t.overtime += Number(e.overtime_hours) || 0;
      t.night += Number(e.night_hours) || 0;
      t.bank += Number(e.bank_balance_hours) || 0;
    }
    return t;
  }, [entries]);

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs">Funcionário</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Lançar ponto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Trabalhado</p>
          <p className="text-2xl font-bold">{fmtHours(totals.worked)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Horas extras</p>
          <p className="text-2xl font-bold text-amber-600">{fmtHours(totals.overtime)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Adicional noturno</p>
          <p className="text-2xl font-bold text-indigo-600">{fmtHours(totals.night)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Banco de horas</p>
          <p className={`text-2xl font-bold ${totals.bank >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {totals.bank >= 0 ? "+" : ""}{fmtHours(totals.bank)}
          </p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead className="text-right">Trabalhado</TableHead>
                <TableHead className="text-right">H. extra</TableHead>
                <TableHead className="text-right">Noturno</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.work_date.split("-").reverse().join("/")}</TableCell>
                  <TableCell>{empMap[e.employee_id]?.full_name ?? "—"}</TableCell>
                  <TableCell>{e.check_in?.slice(0, 5) ?? "—"}</TableCell>
                  <TableCell>{e.check_out?.slice(0, 5) ?? "—"}</TableCell>
                  <TableCell className="text-right">{fmtHours(e.worked_hours)}</TableCell>
                  <TableCell className="text-right text-amber-600">{fmtHours(e.overtime_hours)}</TableCell>
                  <TableCell className="text-right text-indigo-600">{fmtHours(e.night_hours)}</TableCell>
                  <TableCell className={`text-right ${e.bank_balance_hours >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {e.bank_balance_hours >= 0 ? "+" : ""}{fmtHours(e.bank_balance_hours)}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum registro no período.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lançar ponto</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Funcionário</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Data</Label>
              <Input type="date" value={form.work_date}
                onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
            </div>
            <div>
              <Label>Entrada</Label>
              <Input type="time" value={form.check_in}
                onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
            </div>
            <div>
              <Label>Saída</Label>
              <Input type="time" value={form.check_out}
                onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
            </div>
            <div>
              <Label>Intervalo (min)</Label>
              <Input type="number" value={form.break_minutes}
                onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Carga prevista (h)</Label>
              <DecimalInput decimals={2} value={form.expected_hours}
                onValueChange={(v) => setForm({ ...form, expected_hours: v })} />
            </div>
            <div className="col-span-2">
              <Label>Observação</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Lançar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
