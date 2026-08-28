# Fechamento de caixa integrado ao Financeiro

Quando um caixa for fechado, o sistema lança automaticamente o resultado no módulo Financeiro.

## O que será lançado

Ao confirmar o fechamento do caixa, para cada forma de pagamento com valor > 0 é criado um lançamento de **receita** já com status **recebido**:

- Descrição: `Caixa 27/08 — Dinheiro (operador)`
- Valor: total vendido naquela forma de pagamento
- Data de vencimento e pagamento: data do fechamento
- Categoria: `Vendas` (tipo receita), criada automaticamente se ainda não existir
- Filial: a mesma filial do caixa

Se houver **sangrias/retiradas**, cada uma vira um lançamento de **despesa** (status pago) na categoria `Movimentações de caixa`, para o fluxo de caixa fechar corretamente.

Vendas em `Conta do cliente` não entram como receita no fechamento (o crédito já foi lançado quando o cliente pagou), evitando faturamento duplicado.

## Detalhes técnicos

- Alteração apenas em `src/routes/_authenticated/restaurante.caixa.tsx`, no `CloseSessionDialog`: após o `update` da sessão, inserir os registros em `financial_transactions` (garantindo/reaproveitando as categorias em `financial_categories`).
- Sem mudanças de banco de dados.
- Se o caixa não tiver vendas nem movimentações, nada é lançado.
- Feedback ao usuário: toast informando quantos lançamentos foram enviados ao financeiro.
