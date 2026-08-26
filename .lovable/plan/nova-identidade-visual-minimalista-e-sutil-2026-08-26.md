# Nova Identidade Visual — Minimalista e Sutil

## Direção escolhida

- **Paleta "Branco Nuvem"** — brancos frios, cinzas com leve tom azul e um único acento azul.
  `#fafbfc` fundo · `#e8ecf1` superfícies · `#94a3b8` texto secundário · `#3b82f6` acento
- **Tipografia** — Instrument Serif nos títulos (elegante, editorial) + Work Sans no corpo (limpa, ótima em telas densas).
- **Layout da landing** — hero em split screen: texto à esquerda, visual calmo à direita.
- **Intensidade 3** — renovação real da pele visual, sem redesenhar fluxos nem reorganizar módulos.

## O que muda

**Sistema de design (`src/styles.css`)**
- Nova paleta semântica em oklch: fundo quase branco, cards brancos puros, bordas muito suaves.
- Acento azul usado com parcimônia — só em ações primárias, links e destaques de dado.
- Sidebar deixa de ser um bloco verde escuro e passa a ser clara, separada apenas por uma borda fina.
- Sombras trocadas por elevação mínima; raio de borda reduzido para um traço mais seco.
- Dark mode recalibrado: cinza-azulado profundo em vez de verde, mantendo o mesmo acento.
- Tokens `--font-display` (Instrument Serif) e `--font-sans` (Work Sans).

**Fontes (`src/routes/__root.tsx`)**
- `<link>` de preconnect + Google Fonts para Instrument Serif e Work Sans.

**Landing page (`src/routes/index.tsx`)**
- Hero reestruturado em split screen: headline em serifa, subtítulo, dois CTAs e, do lado direito, um painel discreto simulando indicadores reais do sistema (CMV, refeições, estoque).
- Grid de recursos com cards mais leves: sem fundo colorido nos ícones, apenas ícone fino, título em serifa e borda hairline.
- Header e footer reduzidos ao essencial.

**Logo (`src/components/Logo.tsx`)**
- Marca monocromática: ícone em traço fino dentro de um quadrado sutil, nome em serifa, subtítulo em caixa alta bem discreta.

**Sidebar (`src/components/AppSidebar.tsx`)**
- Ajuste visual para o tema claro: item ativo marcado por fundo suave e barra fina no acento, em vez de contraste forte.

## Fora do escopo

Nenhuma mudança em rotas, banco de dados, permissões, cálculos ou regras de negócio. Só camada visual e de apresentação.

## Detalhes técnicos

- Todos os valores entram como tokens semânticos em `:root` e `.dark` de `src/styles.css`, mapeados em `@theme inline`. Nenhuma cor literal em componente.
- Fontes carregadas via `head().links` no root route (nunca `@import` de URL no CSS, que quebra o build no Tailwind v4).
- Contraste verificado em claro e escuro; o acento azul mantém legibilidade sobre fundos claros.
- Build e preview validados ao final.
