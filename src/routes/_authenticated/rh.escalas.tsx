import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { SCHEDULE_TYPES, WEEKDAYS } from "@/lib/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/rh/escalas")({
  component: EscalasPage,
});

type Sched = {
  id: string; name: string; type: string;
  start_time: string; end_time: string; break_minutes: number;
  weekdays: number[]; notes: string | null;
};

const emptyForm = {
  name: "", type: "5x2", start_time: "08:00", end_time: "17:00",
  break_minutes: 60, weekdays: [1, 2, 3, 4, 5] as number[], notes: "",
};

function EscalasPage() {
  const { data: companyId } = useMyCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sched | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState<Sched | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["work_schedules", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("work_schedules")
        .select("*").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return (data ?? []) as Sched[];
    },
  });

  const reset = () => { setEditing(null); setForm(emptyForm); };

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort(),
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = {
        name: form.name.trim(),
        type: form.type as "12x36" | "6x1" | "5x2" | "4x2" | "custom",
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: Number(form.break_minutes) || 0,
        weekdays: form.weekdays,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("work_schedules").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("work_schedules").insert({ company_id: companyId, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Escala atualizada" : "Escala criada");
      qc.invalidateQueries({ queryKey: ["work_schedules"] });
      setOpen(false); reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escala excluída");
      qc.invalidateQueries({ queryKey: ["work_schedules"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} escala(s)</p>
        <Button onClick={() => { reset(); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova escala
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <Card key={s.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.start_time.slice(0, 5)} → {s.end_time.slice(0, 5)} • Intervalo {s.break_minutes}min
                  </p>
                </div>
                <Badge variant="outline">{s.type}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => (
                  <span key={d.value} className={`rounded px-1.5 py-0.5 text-[10px] ${
                    s.weekdays?.includes(d.value)
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {d.label}
                  </span>
                ))}
              </div>
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing(s);
                  setForm({
                    name: s.name, type: s.type, start_time: s.start_time.slice(0, 5),
                    end_time: s.end_time.slice(0, 5), break_minutes: s.break_minutes,
                    weekdays: s.weekdays ?? [], notes: s.notes ?? "",
                  });
                  setOpen(true);
                }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setToDelete(s)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma escala cadastrada.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar escala" : "Nova escala"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início</Label>
                <Input type="time" value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="time" value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Intervalo (minutos)</Label>
              <Input type="number" value={form.break_minutes}
                onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Dias da semana</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      form.weekdays.includes(d.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
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
            <AlertDialogTitle>Excluir escala?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && del.mutate(toDelete.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
