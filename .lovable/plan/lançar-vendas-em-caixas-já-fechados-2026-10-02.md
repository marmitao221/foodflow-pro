# Lançar vendas em caixas já fechados

## O que muda para você
- No "Histórico de caixas fechados", ao abrir um caixa de outro dia, aparece o botão **"Lançar venda neste caixa"**.
- Você escolhe a forma de pagamento (Dinheiro, Pix, Débito, Crédito, iFood, 99Food, Keeta, Aiqfome), digita o valor e uma descrição opcional (ex.: "Marmita G").
- A venda entra na lista de movimentações daquele caixa, com a data e hora do dia do caixa (não a de hoje), e soma nos totais por forma de pagamento.
- **Financeiro:** como o caixa já foi fechado e mandado para o financeiro, a venda nova é lançada automaticamente lá também, como receita recebida na data daquele caixa. Assim nada fica faltando.
- O saldo calculado do caixa fechado é atualizado com o novo valor.
- Somente quem tem acesso ao Caixa consegue lançar; funcionários só nos caixas da própria filial.

## Detalhes técnicos
- Reutilizar o formulário do `DeliveryQuickSale` em um novo componente `ClosedSessionSaleForm` dentro do `ClosedSessionDialog` (`restaurante.caixa.tsx`).
- Inserção direta: `orders` (status fechada, `opened_at/closed_at` = horário de fechamento do caixa, branch da sessão) + `order_items` + `order_payments` (session_id da sessão fechada), via `crypto.randomUUID()`.
- Se a forma não for `conta_cliente`, inserir `financial_transactions` (receita, recebido, categoria "Vendas" via `ensureCategory`, `due_date/payment_date` = data do caixa).
- Atualizar `closing_balance_calculated` da sessão (+ valor) e invalidar queries do ledger/histórico.
- Sem mudança no banco (RLS atual já permite essas inserções para membros da filial).
