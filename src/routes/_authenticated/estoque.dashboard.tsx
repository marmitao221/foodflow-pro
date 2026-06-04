import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId, formatBRL } from "@/lib/restaurante";
import { formatQty, daysUntil } from "@/lib/estoque";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock, Boxes, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque/dashboard")({
  component: EstoqueDashboard,
});

function EstoqueDashboard() {
  const { data: companyId } = useMyCompanyId();

  const { data: items = [] } = useQuery({
    queryKey: ["stock-items-dash", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id,name,unit,quantity,unit_value,min_stock,expiry_date,is_active")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalItens = items.length;
  const valorTotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_value), 0);
  const baixos = items.filter((i) => Number(i.quantity) <= Number(i.min_stock) && Number(i.min_stock) > 0);
  const vencendo = items.filter((i) => {
    const d = daysUntil(i.expiry_date as string | null);
    return d !== null && d <= 30;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard icon={<Boxes className="h-4 w-4" />} label="Itens ativos" value={String(totalItens)} />
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Valor em estoque" value={formatBRL(valorTotal)} />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label="Estoque baixo"
          value={String(baixos.length)}
        />
        <KpiCard
          icon={<CalendarClock className="h-4 w-4 text-accent" />}
          label="Vencendo em 30d"
          value={String(vencendo.length)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens com estoque baixo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {baixos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item abaixo do mínimo.</p>
            )}
            {baixos.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Mín: {formatQty(Number(i.min_stock))} {i.unit}
                  </p>
                </div>
                <Badge variant="destructive">
                  {formatQty(Number(i.quantity))} {i.unit}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos do vencimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vencendo.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item próximo do vencimento.</p>
            )}
            {vencendo
              .slice()
              .sort((a, b) => (a.expiry_date! < b.expiry_date! ? -1 : 1))
              .map((i) => {
                const d = daysUntil(i.expiry_date as string);
                const vencido = (d ?? 0) < 0;
                return (
                  <div key={i.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(i.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant={vencido ? "destructive" : "secondary"}>
                      {vencido ? `Vencido há ${Math.abs(d!)}d` : `${d}d restantes`}
                    </Badge>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
