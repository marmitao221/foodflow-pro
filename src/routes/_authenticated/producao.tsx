import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import { ChefHat, LayoutDashboard, CalendarDays, Flame, Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Produção Industrial — CozinhaPro" },
      {
        name: "description",
        content:
          "Planeje, produza e controle refeições por turno com baixa automática de estoque, sobras e desperdício.",
      },
      { property: "og:title", content: "Produção Industrial — CozinhaPro" },
      {
        property: "og:description",
        content: "Planejamento, produção por turno, insumos e desperdício em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/producao" || location.pathname === "/producao/") {
      throw redirect({ to: "/producao/dashboard" });
    }
  },
  component: ProducaoLayout,
});

const tabs = [
  { to: "/producao/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/producao/planejamento", label: "Planejamento", icon: CalendarDays },
  { to: "/producao/turnos", label: "Produção", icon: Flame },
  { to: "/producao/desperdicio", label: "Sobras e desperdício", icon: Trash2 },
  { to: "/producao/contratos", label: "Contratos", icon: FileText },
] as const;

function ProducaoLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <ChefHat className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produção Industrial</h1>
          <p className="text-sm text-muted-foreground">
            Planejamento, produção por turno, consumo de insumos e desperdício.
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
