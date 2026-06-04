import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import { Package, LayoutDashboard, Tags, Truck, ArrowDownToLine, ArrowUpFromLine, Boxes } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — CozinhaPro" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/estoque" || location.pathname === "/estoque/") {
      throw redirect({ to: "/estoque/dashboard" });
    }
  },
  component: EstoqueLayout,
});

const tabs = [
  { to: "/estoque/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/estoque/itens", label: "Itens", icon: Boxes },
  { to: "/estoque/categorias", label: "Categorias", icon: Tags },
  { to: "/estoque/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/estoque/entradas", label: "Entradas", icon: ArrowDownToLine },
  { to: "/estoque/saidas", label: "Saídas", icon: ArrowUpFromLine },
] as const;

function EstoqueLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            Controle de insumos, fornecedores, entradas e saídas.
          </p>
        </div>
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
