import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import { UtensilsCrossed, Grid3x3, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurante")({
  head: () => ({ meta: [{ title: "Restaurante — CozinhaPro" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/restaurante" || location.pathname === "/restaurante/") {
      throw redirect({ to: "/restaurante/produtos" });
    }
  },
  component: RestauranteLayout,
});

const tabs = [
  { to: "/restaurante/produtos", label: "Produtos", icon: ShoppingBag },
  { to: "/restaurante/mesas", label: "Mesas", icon: Grid3x3 },
] as const;

function RestauranteLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Restaurante</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de produtos, gestão de mesas, comandas e caixa.
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
