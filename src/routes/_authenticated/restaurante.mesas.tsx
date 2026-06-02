import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import {
  tableStatusLabel,
  tableStatusClass,
  type RestaurantTable,
  type TableStatus,
} from "@/lib/restaurante";
import { useMyCompanyId } from "@/lib/restaurante";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/restaurante/mesas")({
  component: MesasPage,
});

const statusList: TableStatus[] = ["livre", "ocupada", "reservada", "fechamento_pendente"];

function MesasPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId, branches } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [form, setForm] = useState<Partial<RestaurantTable>>({
    number: 1,
    name: "",
    capacity: 4,
    status: "livre",
  });

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["restaurant_tables", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("restaurant_tables").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("number");
      if (error) throw error;
      return data as RestaurantTable[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<RestaurantTable>) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const row = {
        company_id: companyId,
        branch_id: activeBranchId ?? null,
        number: Number(payload.number ?? 1),
        name: payload.name?.trim() || null,
        capacity: Number(payload.capacity ?? 4),
        status: (payload.status ?? "livre") as TableStatus,
      };
      if (editing) {
        const { error } = await supabase
          .from("restaurant_tables")
          .update(row)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("restaurant_tables").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant_tables", companyId, activeBranchId] });
      toast.success(editing ? "Mesa atualizada" : "Mesa criada");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TableStatus }) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant_tables", companyId, activeBranchId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant_tables", companyId, activeBranchId] });
      toast.success("Mesa excluída");
    },
  });

  const openNew = () => {
    setEditing(null);
    const next = (tables[tables.length - 1]?.number ?? 0) + 1;
    setForm({ number: next, name: "", capacity: 4, status: "livre" });
    setOpen(true);
  };
  const openEdit = (t: RestaurantTable) => {
    setEditing(t);
    setForm({ ...t });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {activeBranchId
            ? `Filial: ${branches.find((b) => b.id === activeBranchId)?.name ?? ""}`
            : branches.length > 0
              ? "Mostrando todas as filiais"
              : "Sem filial vinculada"}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Nova mesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar mesa" : "Nova mesa"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número*</Label>
                <Input
                  type="number"
                  value={form.number ?? 1}
                  onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  value={form.capacity ?? 4}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>Nome (opcional)</Label>
                <Input
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Varanda, VIP..."
                />
              </div>
              <div className="col-span-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as TableStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {tableStatusLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : tables.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma mesa cadastrada. Clique em "Nova mesa" para começar.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables.map((t) => (
            <Card
              key={t.id}
              className={`p-4 border-2 ${tableStatusClass[t.status]}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold">#{t.number}</div>
                  {t.name && <div className="text-xs text-muted-foreground">{t.name}</div>}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" /> {t.capacity}
                </div>
              </div>
              <div className="mt-2 text-xs font-medium">{tableStatusLabel[t.status]}</div>
              <div className="mt-3">
                <Select
                  value={t.status}
                  onValueChange={(v) =>
                    setStatus.mutate({ id: t.id, status: v as TableStatus })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {tableStatusLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1 text-xs"
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 px-2">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir mesa #{t.number}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove.mutate(t.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
