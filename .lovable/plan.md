# Caixa com movimentações e reabertura de comandas

## O que você vai ver
Na tela do Caixa aberto, um layout parecido com a imagem enviada:

- **Coluna esquerda**: status "Caixa aberto", saldo inicial, operador e data/hora de abertura.
- **Centro – Movimentação**: tabela com todas as movimentações do caixa do dia, em ordem de horário:
  - Data/Hora, Descrição (ex.: "Pedido nº 362 (Comanda 4 / Mesa 2)", "Sangria – troco"), Entrada, Saída, Forma de pagamento.
  - Primeira linha: Saldo inicial. Rodapé com total de entradas e saídas.
  - Botão de informação (ícone "i") em cada pedido.
- **Direita – Resumo**: saldo inicial, entradas por forma de pagamento, total de entradas, saídas, saldo final e o botão "Fechar caixa" (o mesmo fechamento de hoje, que já manda para o financeiro).

## Ao clicar em uma venda
Abre uma janela com a comanda completa: número, mesa/tipo, cliente, atendente, horário, itens (ex.: 1 Marmita G, 1 Coca-Cola), taxa, desconto, total e formas de pagamento usadas. Botão **"Reimprimir comanda"** usando exatamente o mesmo cupom que já sai hoje (fonte grande, preto forte, total visível).

## Onde fica salvo
As comandas já ficam gravadas no sistema com todos os itens — nada novo precisa ser salvo. Também vou deixar o **histórico de caixas fechados clicável**, abrindo as movimentações daquele caixa, para você reimprimir comandas de dias anteriores.

## Detalhes técnicos
- Mover `printOrder` e helpers do cupom de `restaurante.comandas.tsx` para `src/lib/comanda-print.ts` e reutilizar nas duas telas (sem mudar o cupom).
- Consulta de `order_payments` da sessão com join em `orders` (número, tipo, mesa) + `cash_movements`, mesclados e ordenados por `created_at`.
- Novo `OrderDetailDialog` carregando `orders`, `order_items`, `order_payments` e cabeçalho da empresa.
- Sem alterações no banco de dados.
