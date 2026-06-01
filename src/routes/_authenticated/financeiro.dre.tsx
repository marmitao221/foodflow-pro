import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  useMyCompanyId, type FinTransaction, type FinCategory,
  formatBRL, exportToExcel, exportToPDF,
} from "@/lib/financeiro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/financeiro/dre")({
  component: DRE,
});

function DRE() {
  const { data: companyId } = useMyCompanyId();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);

  const { data, isLoading } = useQuery({
    queryKey: ["fin-dre", companyId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      const [{ data: txs }, { data: cats }] = await Promise.all([
        supabase.from("financial_transactions").select("*")
          .eq("company_id", companyId!).gte("due_date", from).lte("due_date", to),
        supabase.from("financial_categories").select("*").eq("company_id", companyId!),
      ]);
      return {
        txs: (txs ?? []) as FinTransaction[],
        cats: (cats ?? []) as FinCategory[],
      };
    },
  });

  const dre = useMemo(() => {
    const txs = (data?.txs ?? []).filter((t) => t.status !== "cancelado");
    const cats = data?.cats ?? [];
    const catMap = new Map(cats.map((c) => [c.id, c.name]));
    const byCat = new Map<string, { name: string; type: "receita" | "despesa"; value: number }>();
    let receita = 0, despesa = 0;
    for (const t of txs) {
      const v = Number(t.amount);
      if (t.type === "receita") receita += v; else despesa += v;
      const key = t.category_id ?? `__none_${t.type}`;
      const name = t.category_id ? catMap.get(t.category_id) ?? "Sem categoria" : "Sem categoria";
      const row = byCat.get(key) ?? { name, type: t.type, value: 0 };
      row.value += v;
      byCat.set(key, row);
    }
    const receitas = [...byCat.values()].filter((r) => r.type === "receita").sort((a, b) => b.value - a.value);
    const despesas = [...byCat.values()].filter((r) => r.type === "despesa").sort((a, b) => b.value - a.value);
    const resultado = receita - despesa;
    const margem = receita > 0 ? (resultado / receita) * 100 : 0;
    return { receitas, despesas, receita, despesa, resultado, margem };
  }, [data]);

  const exportRows = () => [
    { Grupo: "RECEITAS", Categoria: "", Valor: dre.receita },
    ...dre.receitas.map((r) => ({ Grupo: "", Categoria: r.name, Valor: r.value })),
    { Grupo: "DESPESAS", Categoria: "", Valor: dre.despesa },
    ...dre.despesas.map((r) => ({ Grupo: "", Categoria: r.name, Valor: r.value })),
    { Grupo: "RESULTADO LÍQUIDO", Categoria: "", Valor: dre.resultado },
  ];

  const handleExcel = () => exportToExcel(`dre-${from}-a-${to}`, exportRows(), "DRE");
  const handlePDF = () => exportToPDF(
    `dre-${from}-a-${to}`,
    `DRE ${from} a ${to}`,
    ["Grupo", "Categoria", "Valor"],
    exportRows().map((r) => [r.Grupo, r.Categoria, formatBRL(Number(r.Valor))]),
  );

  if (!companyId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="dre-from">De</Label>
            <Input id="dre-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dre-to">Até</Label>
            <Input id="dre-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExcel}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePDF}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demonstrativo de Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b bg-primary/5">
                  <td className="py-2 font-semibold">(+) Receitas</td>
                  <td className="py-2 text-right font-semibold text-primary">{formatBRL(dre.receita)}</td>
                </tr>
                {dre.receitas.map((r) => (
                  <tr key={`r-${r.name}`} className="border-b text-muted-foreground">
                    <td className="py-1 pl-6">{r.name}</td>
                    <td className="py-1 text-right">{formatBRL(r.value)}</td>
                  </tr>
                ))}
                <tr className="border-b bg-destructive/5">
                  <td className="py-2 font-semibold">(−) Despesas</td>
                  <td className="py-2 text-right font-semibold text-destructive">{formatBRL(dre.despesa)}</td>
                </tr>
                {dre.despesas.map((r) => (
                  <tr key={`d-${r.name}`} className="border-b text-muted-foreground">
                    <td className="py-1 pl-6">{r.name}</td>
                    <td className="py-1 text-right">{formatBRL(r.value)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-foreground/30 bg-muted/50">
                  <td className="py-3 font-bold">(=) Resultado Operacional</td>
                  <td className={`py-3 text-right font-bold ${
                    dre.resultado >= 0 ? "text-primary" : "text-destructive"
                  }`}>{formatBRL(dre.resultado)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">Margem líquida</td>
                  <td className="py-2 text-right text-xs text-muted-foreground">
                    {dre.margem.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
