import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet, ArrowDown, ArrowUp, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { useAuth } from "@/lib/auth-context";
import {
  cashMovementLabel,
  formatBRL,
  paymentMethodLabel,
  useMyCompanyId,
  type CashMovementType,
  type PaymentMethod,
} from "@/lib/restaurante";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { DecimalInput } from "@/components/ui/decimal-input";
import { CashLedger, fetchLedgerPayments } from "@/components/restaurante/CashLedger";

function ClosedSessionDialog({ session, onClose }: { session: CashSession; onClose: () => void }) {
  const { data: payments = [] } = useQuery({
    queryKey: ["order_payments", session.id],
    queryFn: () => fetchLedgerPayments(session.id),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["cash_movements", session.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_movements")
        .select("*")
        .eq("session_id", session.id)
        .order("created_at");
      if (error) throw error;
      return data as CashMovement[];
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Caixa de {session.operator_name ?? "operador"} —{" "}
            {new Date(session.opened_at).toLocaleDateString("pt-BR")}
          </DialogTitle>
        </DialogHeader>
        <CashLedger
          openedAt={session.opened_at}
          openingBalance={Number(session.opening_balance)}
          payments={payments}
          movements={movements}
          branchId={session.branch_id}
        />
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/_authenticated/restaurante/caixa")({
  component: CaixaPage,
});

type CashSession = {
  id: string;
  branch_id: string | null;
  operator_id: string;
  operator_name: string | null;
  opening_balance: number;
  closing_balance_informed: number | null;
  closing_balance_calculated: number | null;
  status: "aberto" | "fechado";
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
};

type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  created_at: string;
};

const movementTypes: CashMovementType[] = ["suprimento", "sangria", "retirada", "ajuste"];

function CaixaPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [viewSession, setViewSession] = useState<CashSession | null>(null);

  const sessionKey = ["cash_session", companyId, user?.id];

  const { data: openSession } = useQuery({
    queryKey: sessionKey,
    enabled: !!companyId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("company_id", companyId!)
        .eq("operator_id", user!.id)
        .eq("status", "aberto")
        .maybeSingle();
      if (error) throw error;
      return (data as CashSession | null) ?? null;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["cash_sessions_history", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("cash_sessions")
        .select("*")
        .eq("company_id", companyId!)
        .eq("status", "fechado");
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("closed_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as CashSession[];
    },
  });

  return (
    <div className="space-y-6">
      {!openSession ? (
        <OpenCashCard
          onOpened={() => qc.invalidateQueries({ queryKey: sessionKey })}
          companyId={companyId ?? null}
          branchId={activeBranchId}
          userId={user?.id ?? null}
          operatorName={user?.email ?? null}
        />
      ) : (
        <ActiveSessionPanel
          session={openSession}
          onClosed={() => {
            qc.invalidateQueries({ queryKey: sessionKey });
            qc.invalidateQueries({ queryKey: ["cash_sessions_history"] });
          }}
        />
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Histórico de caixas fechados</h2>
        {history.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            Nenhum caixa fechado ainda.
          </Card>
        ) : (
          <div className="space-y-2">
            {viewSession && (
              <ClosedSessionDialog session={viewSession} onClose={() => setViewSession(null)} />
            )}
            {history.map((s) => {
              const diff =
                (Number(s.closing_balance_informed) || 0) -
                (Number(s.closing_balance_calculated) || 0);
              return (
                <Card
                  key={s.id}
                  className="p-3 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40"
                  onClick={() => setViewSession(s)}
                >
                  <div>
                    <p className="font-medium">
                      {s.operator_name ?? "Operador"} —{" "}
                      {new Date(s.opened_at).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fechado em{" "}
                      {s.closed_at ? new Date(s.closed_at).toLocaleString("pt-BR") : "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Esperado / Informado</p>
                    <p className="font-semibold">
                      {formatBRL(Number(s.closing_balance_calculated ?? 0))} /{" "}
                      {formatBRL(Number(s.closing_balance_informed ?? 0))}
                    </p>
                    <p
                      className={`text-xs ${Math.abs(diff) < 0.01 ? "text-muted-foreground" : diff < 0 ? "text-destructive" : "text-emerald-600"}`}
                    >
                      Diferença: {formatBRL(diff)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OpenCashCard({
  onOpened,
  companyId,
  branchId,
  userId,
  operatorName,
}: {
  onOpened: () => void;
  companyId: string | null;
  branchId: string | null;
  userId: string | null;
  operatorName: string | null;
}) {
  const [opening, setOpening] = useState(0);
  const [notes, setNotes] = useState("");

  const open = useMutation({
    mutationFn: async () => {
      if (!companyId || !userId) throw new Error("Sessão inválida");
      const id = crypto.randomUUID();
      const { error } = await supabase.from("cash_sessions").insert({
        id,
        company_id: companyId,
        branch_id: branchId,
        operator_id: userId,
        operator_name: operatorName,
        opening_balance: Number(opening),
        notes: notes || null,
      });
      if (error) throw error;
      const { data: n } = await supabase.rpc("flush_pending_delivery", { _session_id: id });
      return (n as number | null) ?? 0;
    },
    onSuccess: (n) => {
      toast.success(
        n ? `Caixa aberto — ${n} venda(s) de delivery pendente(s) lançada(s)` : "Caixa aberto",
      );
      onOpened();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Nenhum caixa aberto</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Informe o saldo inicial em dinheiro para abrir um novo caixa.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div>
          <Label>Saldo inicial (R$)</Label>
          <DecimalInput
            decimals={2}
            value={opening}
            onValueChange={setOpening}
          />
        </div>
        <div>
          <Label>Observações</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <Button onClick={() => open.mutate()} disabled={open.isPending}>
        <Unlock className="h-4 w-4 mr-1" /> Abrir caixa
      </Button>
    </Card>
  );
}

function ActiveSessionPanel({
  session,
  onClosed,
}: {
  session: CashSession;
  onClosed: () => void;
}) {
  const qc = useQueryClient();
  const [movOpen, setMovOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const { data: movements = [] } = useQuery({
    queryKey: ["cash_movements", session.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_movements")
        .select("*")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CashMovement[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["order_payments", session.id],
    queryFn: () => fetchLedgerPayments(session.id),
  });

  const byMethod: Record<PaymentMethod, number> = {
    dinheiro: 0,
    pix: 0,
    debito: 0,
    credito: 0,
    ifood_online: 0,
    keeta_online: 0,
    aiqfome_online: 0,
    ninetynine_online: 0,
    conta_cliente: 0,
  };
  payments.forEach((p) => (byMethod[p.method] += Number(p.amount)));
  const totalVendas = payments.reduce((s, p) => s + Number(p.amount), 0);

  const sup = movements.filter((m) => m.type === "suprimento").reduce((s, m) => s + Number(m.amount), 0);
  const aju = movements.filter((m) => m.type === "ajuste").reduce((s, m) => s + Number(m.amount), 0);
  const san = movements.filter((m) => m.type === "sangria").reduce((s, m) => s + Number(m.amount), 0);
  const ret = movements.filter((m) => m.type === "retirada").reduce((s, m) => s + Number(m.amount), 0);

  const calculated =
    Number(session.opening_balance) + totalVendas + sup + aju - san - ret;

  return (
    <>
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Caixa aberto</h2>
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 border">
                Em operação
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Aberto em {new Date(session.opened_at).toLocaleString("pt-BR")} por{" "}
              {session.operator_name ?? "operador"}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={movOpen} onOpenChange={setMovOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Movimentação
                </Button>
              </DialogTrigger>
              <MovementDialog
                sessionId={session.id}
                companyId={session.operator_id ? undefined : undefined}
                onDone={() => {
                  setMovOpen(false);
                  qc.invalidateQueries({ queryKey: ["cash_movements", session.id] });
                }}
              />
            </Dialog>
            <Button onClick={() => setCloseOpen(true)}>
              <Lock className="h-4 w-4 mr-1" /> Fechar caixa
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Saldo inicial" value={formatBRL(Number(session.opening_balance))} />
          <Stat label="Vendas (todas formas)" value={formatBRL(totalVendas)} />
          <Stat label="Suprimentos - Sangrias" value={formatBRL(sup - san - ret + aju)} />
          <Stat
            label="Saldo esperado (todas as formas)"
            value={formatBRL(calculated)}
            highlight
          />
        </div>

        <DeliveryQuickSale sessionId={session.id} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <CashLedger
            openedAt={session.opened_at}
            openingBalance={Number(session.opening_balance)}
            payments={payments}
            movements={movements}
            branchId={session.branch_id}
          />
          <Card className="p-4 space-y-2 text-sm">
            <h3 className="font-medium">Resumo</h3>
            <div className="flex justify-between">
              <span>(+) Saldo inicial</span>
              <span>{formatBRL(Number(session.opening_balance))}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">(+) ENTRADAS — PEDIDOS</p>
            {(Object.keys(byMethod) as PaymentMethod[])
              .filter((m) => byMethod[m] > 0)
              .map((m) => (
                <div key={m} className="flex justify-between">
                  <span>{paymentMethodLabel[m]}</span>
                  <span className="font-medium text-primary">{formatBRL(byMethod[m])}</span>
                </div>
              ))}
            {sup + aju > 0 && (
              <div className="flex justify-between">
                <span>Suprimentos/ajustes</span>
                <span>{formatBRL(sup + aju)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-1">
              <span>Total entradas</span>
              <span>{formatBRL(totalVendas + sup + aju)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">(-) SAÍDAS DO CAIXA</p>
            {san + ret > 0 ? (
              <div className="flex justify-between text-destructive">
                <span>Sangrias/retiradas</span>
                <span>-{formatBRL(san + ret)}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Não há registros de saída</p>
            )}
            <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
              <span>(=) Saldo final</span>
              <span>{formatBRL(calculated)}</span>
            </div>
          </Card>
        </div>
      </Card>

      {closeOpen && (
        <CloseSessionDialog
          session={session}
          calculated={calculated}
          byMethod={byMethod}
          movements={movements}
          onCancel={() => setCloseOpen(false)}
          onClosed={() => {
            setCloseOpen(false);
            toast.success("Caixa fechado");
            onClosed();
          }}
        />
      )}
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md border border-border p-3 ${highlight ? "bg-primary/5 border-primary/30" : ""}`}
    >
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function MovementDialog({
  sessionId,
  companyId: _c,
  onDone,
}: {
  sessionId: string;
  companyId?: string;
  onDone: () => void;
}) {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const [type, setType] = useState<CashMovementType>("suprimento");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { error } = await supabase.from("cash_movements").insert({
        company_id: companyId,
        branch_id: activeBranchId ?? null,
        session_id: sessionId,
        type,
        amount: Number(amount),
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: onDone,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova movimentação</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as CashMovementType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {movementTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {cashMovementLabel[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <DecimalInput
            decimals={2}
            value={amount}
            onValueChange={setAmount}
          />
        </div>
        <div>
          <Label>Motivo</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => save.mutate()} disabled={save.isPending || amount <= 0}>
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

async function ensureCategory(
  companyId: string,
  name: string,
  type: "receita" | "despesa",
) {
  const { data: found } = await supabase
    .from("financial_categories")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", name)
    .eq("type", type)
    .maybeSingle();
  if (found?.id) return found.id as string;
  const { data: created, error } = await supabase
    .from("financial_categories")
    .insert({ company_id: companyId, name, type })
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

function CloseSessionDialog({
  session,
  calculated,
  byMethod,
  movements,
  onCancel,
  onClosed,
}: {
  session: CashSession;
  calculated: number;
  byMethod: Record<PaymentMethod, number>;
  movements: CashMovement[];
  onCancel: () => void;
  onClosed: () => void;
}) {
  const { data: companyId } = useMyCompanyId();
  const [informed, setInformed] = useState<number>(Number(calculated.toFixed(2)));
  const [notes, setNotes] = useState("");
  const diff = informed - calculated;

  const close = useMutation({
    mutationFn: async () => {
      const closedAt = new Date();
      const { error } = await supabase
        .from("cash_sessions")
        .update({
          status: "fechado",
          closed_at: closedAt.toISOString(),
          closing_balance_informed: informed,
          closing_balance_calculated: calculated,
          notes: notes || session.notes,
        })
        .eq("id", session.id);
      if (error) throw error;

      if (!companyId) return 0;

      const day = closedAt.toISOString().slice(0, 10);
      const dayLabel = closedAt.toLocaleDateString("pt-BR");
      const operator = session.operator_name ?? "operador";

      const receitas = (Object.keys(byMethod) as PaymentMethod[]).filter(
        (m) => m !== "conta_cliente" && Number(byMethod[m]) > 0,
      );
      const saidas = movements.filter(
        (m) => m.type === "sangria" || m.type === "retirada",
      );

      const rows: Record<string, unknown>[] = [];

      if (receitas.length > 0) {
        const catReceita = await ensureCategory(companyId, "Vendas", "receita");
        receitas.forEach((m) => {
          rows.push({
            company_id: companyId,
            branch_id: session.branch_id,
            category_id: catReceita,
            description: `Caixa ${dayLabel} — ${paymentMethodLabel[m]} (${operator})`,
            amount: Number(byMethod[m]),
            type: "receita",
            status: "recebido",
            due_date: day,
            payment_date: day,
          });
        });
      }

      if (saidas.length > 0) {
        const catDespesa = await ensureCategory(
          companyId,
          "Movimentações de caixa",
          "despesa",
        );
        saidas.forEach((m) => {
          rows.push({
            company_id: companyId,
            branch_id: session.branch_id,
            category_id: catDespesa,
            description: `Caixa ${dayLabel} — ${cashMovementLabel[m.type]}${m.reason ? `: ${m.reason}` : ""} (${operator})`,
            amount: Number(m.amount),
            type: "despesa",
            status: "pago",
            due_date: day,
            payment_date: day,
          });
        });
      }

      if (rows.length > 0) {
        const { error: finErr } = await supabase
          .from("financial_transactions")
          .insert(rows as never);
        if (finErr) throw finErr;
      }
      return rows.length;
    },
    onSuccess: (count) => {
      if (count && count > 0) {
        toast.success(`${count} lançamento(s) enviados ao financeiro`);
      }
      onClosed();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Saldo esperado</Label>
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2 font-semibold">
                {formatBRL(calculated)}
              </div>
            </div>
            <div>
              <Label>Saldo contado (R$)</Label>
              <DecimalInput
                decimals={2}
                value={informed}
                onValueChange={setInformed}
              />
            </div>
          </div>
          <div>
            <Label>Diferença</Label>
            <div
              className={`rounded-md border border-border px-3 py-2 font-semibold ${Math.abs(diff) < 0.01 ? "" : diff < 0 ? "text-destructive" : "text-emerald-600"}`}
            >
              {formatBRL(diff)}
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => close.mutate()} disabled={close.isPending}>
            Confirmar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
