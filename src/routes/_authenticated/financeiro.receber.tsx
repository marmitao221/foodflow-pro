import { createFileRoute } from "@tanstack/react-router";
import { useMyCompanyId } from "@/lib/financeiro";
import { TransactionsList } from "@/components/financeiro/TransactionsList";

export const Route = createFileRoute("/_authenticated/financeiro/receber")({
  component: Receber,
});

function Receber() {
  const { data: companyId } = useMyCompanyId();
  if (!companyId) return null;
  return <TransactionsList companyId={companyId} type="receita" />;
}
