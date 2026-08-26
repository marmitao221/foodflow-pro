# Animações de entrada (módulo + scroll)

Objetivo: dar vida à navegação com movimento sutil, coerente com a identidade minimalista, e que **se repita sempre** que o conteúdo entra na tela.

## O que vai acontecer

1. **Entrada de módulo** — ao abrir qualquer tela autenticada (Dashboard, Estoque, Financeiro, Equipe, RH, Restaurante...), o conteúdo aparece com um fade curto subindo poucos pixels. A animação dispara de novo a cada troca de rota.

2. **Revelar ao rolar** — blocos (KPIs, gráficos, listas, cards de acesso rápido) começam levemente transparentes e deslocados; ao entrar na área visível, aparecem suavemente. Ao sair da tela voltam ao estado inicial, então **repetem toda vez** que voltam a aparecer.

3. **Cascata leve** — em grades (KPIs, atalhos, cards), os itens aparecem em sequência com um atraso mínimo entre eles, sem parecer lento.

4. **Acessibilidade** — quem tem "reduzir movimento" ativado no sistema vê o conteúdo direto, sem animação.

Duração alvo: 250–400 ms, com curva suave. Nada de bounce, nada de zoom exagerado.

## Detalhes técnicos

- Novas keyframes/utilitários em `src/styles.css` (`fade-up`, `reveal`, variáveis de delay) + bloco `@media (prefers-reduced-motion: reduce)` que anula tudo.
- Novo hook `src/hooks/use-reveal.ts` usando `IntersectionObserver` **sem `unobserve`**, alternando um atributo `data-visible` na entrada e na saída — é isso que garante a repetição.
- Novo componente `src/components/Reveal.tsx` (wrapper com `as`, `delay`) para envolver seções sem poluir o JSX.
- Animação de módulo aplicada no `<main>` de `src/routes/_authenticated.tsx`, com `key` no pathname para reexecutar a cada rota.
- Aplicação inicial dos `Reveal` no Dashboard (hero, acesso rápido, KPIs, gráficos, alertas) e na landing `src/routes/index.tsx`; as demais telas herdam a animação de entrada de módulo automaticamente.
- Sem novas dependências (CSS + IntersectionObserver nativos).

## Verificação

Playwright: abrir o dashboard, rolar para baixo e para cima, e conferir por screenshots que os blocos reaparecem animados na segunda passagem.
