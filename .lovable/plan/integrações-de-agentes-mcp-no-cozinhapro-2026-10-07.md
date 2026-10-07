# Integrações de agentes (MCP) no CozinhaPro

Permite conectar o CozinhaPro ao ChatGPT, Claude, Cursor etc. A pessoa faz login com a conta dela do CozinhaPro e o assistente só vê os dados da empresa/filial a que ela tem acesso (mesmas regras de segurança do app).

## Ferramentas que o assistente terá (somente leitura nesta primeira versão)
- **Resumo do caixa**: caixa aberto da filial, total vendido por forma de pagamento.
- **Vendas do dia/período**: faturamento e número de comandas.
- **Estoque crítico**: itens abaixo do mínimo e próximos do vencimento.
- **Contas a pagar/receber**: lançamentos em aberto do financeiro.
- **Listar filiais**: para o assistente saber qual filial consultar.

Nada é alterado pelo assistente nesta versão (sem lançar vendas, sem apagar). Se quiser escrita depois, adicionamos.

## Login
- Proteção por login (OAuth): ao conectar, abre uma tela "Conectar [app] à sua conta" com Aprovar/Negar. Se não estiver logado, vai para o login e volta para essa tela.

## Depois de pronto
- Você precisa **publicar** o app para o endereço funcionar.

## Detalhes técnicos
- `@lovable.dev/mcp-js` + zod; exclusão no `bunfig.toml`; `mcpPlugin()` no `vite.config.ts`, endpoint `/mcp`.
- `src/lib/mcp/index.ts` (name `foodflow-pro`, title "FoodFlow Pro"), `supabase.ts` (cliente com token do usuário, RLS), tools em `src/lib/mcp/tools/`.
- Ativar servidor OAuth do backend; rota de consentimento `src/routes/[.]lovable.oauth.consent.tsx`; login respeita `next`.
- Gerar manifesto ao final.
