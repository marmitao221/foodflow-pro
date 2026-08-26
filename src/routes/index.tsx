import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Boxes, ChefHat, FileSpreadsheet, ShieldCheck, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CozinhaPro — Controle de CMV, estoque e produção para cozinhas industriais" },
      { name: "description", content: "Reduza desperdícios, calcule custo real por refeição e gerencie contratos corporativos em um único SaaS." },
      { property: "og:title", content: "CozinhaPro — Gestão para cozinhas industriais e marmitarias" },
      { property: "og:description", content: "CMV em tempo real, estoque integrado à produção e indicadores claros da operação." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: TrendingDown, title: "CMV em tempo real", desc: "Custo real das refeições a partir das fichas técnicas e das movimentações de estoque." },
  { icon: Boxes, title: "Estoque integrado", desc: "Entradas, saídas, validades e alertas de mínimo conectados à produção." },
  { icon: ChefHat, title: "Produção planejada", desc: "Planeje cardápios, calcule rendimento e reduza sobras na cozinha." },
  { icon: FileSpreadsheet, title: "Contratos corporativos", desc: "Clientes, cardápios contratados e faturamento de alimentação coletiva." },
  { icon: BarChart3, title: "Indicadores claros", desc: "CMV, desperdício, custo por prato e margem por contrato em um só lugar." },
  { icon: ShieldCheck, title: "Multiempresa seguro", desc: "Isolamento total de dados entre empresas e filiais." },
];

const painel = [
  { label: "CMV do mês", value: "31,4%", hint: "meta 33%" },
  { label: "Refeições servidas", value: "1.284", hint: "últimos 7 dias" },
  { label: "Custo médio / refeição", value: "R$ 8,92", hint: "-4,1% vs. mês anterior" },
  { label: "Itens em estoque crítico", value: "3", hint: "revisar compras" },
];

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4">
          <Logo />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login" search={{ mode: "signup" }}>Começar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-primary" />
                Cozinhas industriais e marmitarias
              </span>
              <h1 className="mt-6 font-display text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl">
                Controle total do CMV, do estoque e da produção.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
                O CozinhaPro reúne fichas técnicas, estoque, caixa e financeiro em uma única
                operação — para você saber, todos os dias, quanto custa cada refeição.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/login" search={{ mode: "signup" }}>
                    Criar conta <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Visão da operação
                </span>
                <span className="text-xs text-muted-foreground">hoje</span>
              </div>
              <dl className="mt-2 divide-y divide-border">
                {painel.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <dt className="truncate text-sm text-muted-foreground">{m.label}</dt>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">{m.hint}</p>
                    </div>
                    <dd className="font-display text-2xl tracking-tight">{m.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="font-display text-3xl tracking-tight">Tudo o que a cozinha precisa medir</h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Módulos que conversam entre si, sem planilhas paralelas.
            </p>
            <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title}>
                  <f.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="mt-4 font-display text-xl tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} CozinhaPro</span>
          <span>Construído para a operação real da cozinha.</span>
        </div>
      </footer>
    </div>
  );
}
