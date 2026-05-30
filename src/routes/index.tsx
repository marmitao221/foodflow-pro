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
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/login" search={{ mode: "signup" }}>Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Plataforma para cozinhas industriais e marmitarias
          </span>
          <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight md:text-6xl">
            Controle total do <span className="text-accent">CMV</span>, estoque e produção.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            CozinhaPro é o SaaS que ajuda restaurantes industriais, marmitarias e operações de alimentação coletiva
            a reduzir desperdícios, calcular custo real por refeição e gerenciar contratos corporativos.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/login" search={{ mode: "signup" }}>
                Criar conta grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: TrendingDown, title: "CMV em tempo real", desc: "Calcule o custo real das refeições com base em fichas técnicas e movimentações de estoque." },
            { icon: Boxes, title: "Estoque inteligente", desc: "Entradas, saídas, validades e alertas de mínimo — tudo integrado à produção." },
            { icon: ChefHat, title: "Produção planejada", desc: "Planeje cardápios, calcule rendimento e reduza sobras na cozinha." },
            { icon: FileSpreadsheet, title: "Contratos corporativos", desc: "Gerencie clientes, cardápios contratados e faturamento de alimentação coletiva." },
            { icon: BarChart3, title: "Indicadores claros", desc: "Dashboards com CMV, desperdício, custo por prato e margem por contrato." },
            { icon: ShieldCheck, title: "Multiempresa seguro", desc: "Arquitetura multi-tenant com isolamento total de dados entre empresas." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 transition-all hover:border-accent/40 hover:shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CozinhaPro — Construído para a operação real da cozinha.
        </div>
      </footer>
    </div>
  );
}
