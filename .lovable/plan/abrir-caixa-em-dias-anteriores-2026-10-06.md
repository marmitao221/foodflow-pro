# Abrir caixa em dias anteriores

## O que muda para você
- Na tela de abertura de caixa aparece um campo **"Data do caixa"**, já preenchido com hoje. Você pode escolher um dia anterior (ex.: ontem) e abrir o caixa daquele dia.
- O caixa aberto em dia anterior funciona igual ao de hoje: você lança vendas de delivery, sangrias, suprimentos e fecha normalmente.
- Ao **fechar** um caixa de dia anterior, o fechamento e os lançamentos no financeiro usam a **data daquele dia** (não a de hoje) — assim o financeiro fica correto por dia.
- No histórico, o caixa aparece com a data escolhida.
- Continua valendo a regra de um caixa aberto por vez: para abrir um caixa retroativo, o caixa atual precisa estar fechado.

## Detalhes técnicos
- `OpenCashCard` (`restaurante.caixa.tsx`): novo campo `Input type="date"` (padrão = hoje); `opened_at` = data escolhida ao meio-dia local.
- `CloseSessionDialog`: se o `opened_at` da sessão for de outro dia, `closed_at` = fim do dia da sessão (23:59) e `due_date/payment_date` das `financial_transactions` = data da sessão; caso contrário, comportamento atual.
- Sem mudança no banco de dados.
