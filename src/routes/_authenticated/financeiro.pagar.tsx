import { createFileRoute } from "@tanstack/react-router";
import { useMyCompanyId } from "@/lib/financeiro";
import { useCompany } from "@/lib/company-context";
import { TransactionsList } from "@/components/financeiro/TransactionsList";

export const Route = createFileRoute("/_authenticated/financeiro/pagar")({
  component: Pagar,
});

function Pagar() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  if (!companyId) return null;
  return <TransactionsList companyId={companyId} branchId={activeBranchId} type="despesa" />;
}
