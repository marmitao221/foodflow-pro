import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Tags, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — CozinhaPro" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/financeiro" || location.pathname === "/financeiro/") {
      throw redirect({ to: "/financeiro/fluxo" });
    }
  },
  component: FinanceiroLayout,
});

const tabs = [
  { to: "/financeiro/fluxo", label: "Fluxo de Caixa", icon: Wallet },
  { to: "/financeiro/pagar", label: "Contas a Pagar", icon: ArrowUpCircle },
  { to: "/financeiro/receber", label: "Contas a Receber", icon: ArrowDownCircle },
  { to: "/financeiro/categorias", label: "Categorias", icon: Tags },
  { to: "/financeiro/dre", label: "DRE", icon: FileBarChart },
] as const;

function FinanceiroLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Controle de fluxo de caixa, contas a pagar/receber, categorias e DRE.
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
