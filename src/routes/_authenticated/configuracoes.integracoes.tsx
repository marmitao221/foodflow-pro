import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { useMyCompanyId } from "@/lib/restaurante";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/configuracoes/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — CozinhaPro" }] }),
  component: Integracoes,
});

const WEBHOOK_URL = "https://cozinhaproo.lovable.app/api/public/ifood/webhook";

function Integracoes() {
  const { data: companyId } = useMyCompanyId();
  const { branches, activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [merchantId, setMerchantId] = useState("");
  const [branchId, setBranchId] = useState<string>(activeBranchId ?? "");

  const key = ["delivery_integrations", companyId];
  const { data: list = [] } = useQuery({
    queryKey: key,
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_integrations")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      if (!merchantId.trim() || !branchId) throw new Error("Informe o ID da loja e a filial");
      const { error } = await supabase.from("delivery_integrations").insert({
        company_id: companyId,
        branch_id: branchId,
        provider: "ifood",
        merchant_id: merchantId.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja iFood vinculada");
      setMerchantId("");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Vendas concluídas no iFood entram sozinhas no caixa aberto da filial.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">1. Endereço para o iFood</h2>
        <p className="text-sm text-muted-foreground">
          No Portal do Desenvolvedor do iFood, cadastre este endereço como webhook do seu app:
        </p>
        <div className="flex gap-2">
          <Input readOnly value={WEBHOOK_URL} />
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(WEBHOOK_URL);
              toast.success("Copiado");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">2. Lojas iFood</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-2 items-end">
          <div>
            <Label>ID da loja (merchantId)</Label>
            <Input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
          </div>
          <div>
            <Label>Filial</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            Vincular
          </Button>
        </div>
        <div className="divide-y divide-border">
          {list.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-medium">{i.merchant_id}</span> → {branchName(i.branch_id)}
              </span>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(i.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-2 text-xs text-muted-foreground">Nenhuma loja vinculada.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
