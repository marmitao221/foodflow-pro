# Dashboard com card de destaque e acesso rápido

Reorganizar o Dashboard Executivo no estilo da referência enviada: um card grande de destaque no topo, uma grade de atalhos "Acesso rápido" com ícones, e os indicadores e gráficos atuais mantidos abaixo, em versão mais enxuta.

## 1. Card de destaque (topo)

- Card largo, cantos bem arredondados, fundo em gradiente da cor primária (azul da identidade atual) com o valor em tipografia grande.
- Seletor de métrica: o usuário escolhe qual número aparece em destaque, entre:
  - Faturamento do dia
  - Faturamento do mês
  - Lucro estimado do mês
  - CMV do mês
  - Refeições servidas
  - Contas a pagar / a receber
- A escolha fica salva no navegador, então o dashboard volta sempre com a métrica preferida.
- Se o valor for negativo, o card fica vermelho (tom destrutivo); positivo, azul. A troca é suave.
- Abaixo do valor, uma linha curta de contexto (ex.: "vs. mês anterior", meta de CMV).

## 2. Acesso rápido

- Grade de atalhos com ícone em quadrado arredondado claro e legenda embaixo, 3 colunas no celular e 6 no desktop.
- Atalhos: Comandas, Caixa, Estoque, Fichas Técnicas, Financeiro, Equipe (mais Produção/Relatórios se houver rota).
- Cada atalho só aparece se o usuário tiver permissão para o módulo, reaproveitando as permissões já existentes.

## 3. Indicadores e gráficos (abaixo)

- Mantidos, porém minimizados: cartões de KPI mais compactos, sem ícones coloridos pesados, apenas rótulo, número e variação.
- Gráficos com traço fino, sem grade pesada nem legenda redundante, altura reduzida, usando as cores de gráfico do tema.
- Área de alertas automáticos permanece como está, apenas com espaçamento e tipografia alinhados ao novo visual.

## Detalhes técnicos

- Alterações concentradas em `src/routes/_authenticated/dashboard.tsx`; o serviço de dados `src/lib/dashboard.ts` não muda (todos os valores necessários já são retornados).
- Novo componente local para o card de destaque e para a grade de atalhos, dentro do mesmo arquivo de rota.
- Métrica escolhida persistida em `localStorage`, lida em `useEffect` para não quebrar a renderização no servidor.
- Cores exclusivamente por tokens semânticos (`primary`, `destructive`, `muted`, `chart-*`) em `src/styles.css`; nenhuma cor literal.
- Atalhos com `<Link>` do TanStack Router e filtro via os utilitários de permissão existentes (`src/lib/permissions.ts`).
