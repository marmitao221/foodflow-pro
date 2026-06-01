import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";

export type FinType = "receita" | "despesa";
export type FinStatus = "pendente" | "pago" | "recebido" | "cancelado";

export type FinCategory = {
  id: string;
  company_id: string;
  name: string;
  type: FinType;
  color: string | null;
};

export type FinTransaction = {
  id: string;
  company_id: string;
  branch_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  type: FinType;
  status: FinStatus;
  due_date: string;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
};

export function useMyCompanyId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-company-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("company_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data?.company_id as string | undefined) ?? null;
    },
  });
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export const statusLabel: Record<FinStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

export async function exportToExcel(
  filename: string,
  rows: Record<string, unknown>[],
  sheetName = "Dados",
) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 84, 50] },
  });
  doc.save(`${filename}.pdf`);
}
