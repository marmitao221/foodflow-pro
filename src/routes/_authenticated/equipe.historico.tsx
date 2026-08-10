import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  SECTORS, STATUS_CLASS, APPROVAL_CLASS, approvalLabel, sectorLabel, statusLabel, fmtDateTime, today,
} from "@/lib/equipe";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/equipe/historico")({
  component: EquipeHistorico,
});

function EquipeHistorico() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId, branches } = useCompany();
  const d = new Date();
  const [from, setFrom] = useState(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today());
  const [sector, setSector] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");

  const { data: employees = [] } = useQuery({
    queryKey: ["equipe-employees-all", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id,full_name")
        .eq("company_id", companyId!).order("full_name");
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["task-history", companyId, activeBranchId, from, to, sector, employeeId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("task_instances")
        .select("id,name,sector,due_date,status,completed_at,approval,approved_at,employee_id,branch_id")
        .eq("company_id", companyId!).gte("due_date", from).lte("due_date", to);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      if (sector !== "all") q = q.eq("sector", sector as "cozinha");
      if (employeeId !== "all") q = q.eq("employee_id", employeeId);
      const { data, error } = await q.order("due_date", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as {
        id: string; name: string; sector: string; due_date: string; status: string;
        completed_at: string | null; approval: string; approved_at: string | null;
        employee_id: string | null; branch_id: string | null;
      }[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label>De</Label><Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Até</Label><Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <Label>Setor</Label>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Funcionário</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conclusão</TableHead>
                <TableHead>Conferência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.due_date.split("-").reverse().join("/")}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{sectorLabel(r.sector)}</TableCell>
                  <TableCell>{employees.find((e) => e.id === r.employee_id)?.full_name ?? "—"}</TableCell>
                  <TableCell>{branches.find((b) => b.id === r.branch_id)?.name ?? "Matriz"}</TableCell>
                  <TableCell><Badge className={STATUS_CLASS[r.status]}>{statusLabel(r.status)}</Badge></TableCell>
                  <TableCell className="text-xs">{fmtDateTime(r.completed_at)}</TableCell>
                  <TableCell>
                    <Badge className={APPROVAL_CLASS[r.approval]}>{approvalLabel(r.approval)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum registro no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
