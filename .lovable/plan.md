# Módulo Restaurante (PDV) — Plano de Implementação

Módulo grande e integrado. Será entregue em **3 fases** para garantir qualidade. Cada fase é funcional sozinha.

---

## FASE 1 — Cadastros base (Produtos + Mesas)

### Banco (migration)
- Enum `product_category`: refeicao, marmita, bebida, sobremesa, lanche, porcao, adicional
- Enum `table_status`: livre, ocupada, reservada, fechamento_pendente
- Tabela `products` (company_id, name, category, sku, description, price, cost, unit, stock, min_stock, image_url, is_active)
- Tabela `restaurant_tables` (company_id, branch_id, number, name, capacity, status)
- Bucket de storage `product-images` (público)
- RLS via `private.is_company_member` + GRANTs

### Frontend
- `src/routes/_authenticated/restaurante.tsx` — layout com abas
- `restaurante.produtos.tsx` — CRUD com filtros por categoria, busca, upload de imagem
- `restaurante.mesas.tsx` — grid visual do salão, abrir/fechar/reservar
- Item "Restaurante" no AppSidebar com ícone `UtensilsCrossed`

---

## FASE 2 — Operação (Comandas + Caixa)

### Banco
- Enum `order_type`: mesa, balcao, delivery, retirada
- Enum `order_status`: aberta, fechada, cancelada
- Enum `payment_method`: dinheiro, pix, debito, credito
- Enum `cash_movement_type`: sangria, suprimento, retirada, ajuste
- Tabela `orders` (comandas: number, type, table_id, customer_name, waiter, subtotal, service_fee, discount, total, status)
- Tabela `order_items` (order_id, product_id, quantity, unit_price, notes)
- Tabela `cash_sessions` (operator_id, opened_at, closed_at, opening_balance, closing_*, status)
- Tabela `cash_movements` (session_id, type, amount, reason)
- Tabela `order_payments` (order_id, session_id, method, amount)
- Trigger para gerar número sequencial de comanda por empresa
- Trigger para baixa automática de estoque ao fechar comanda
- RLS + GRANTs

### Frontend
- `restaurante.comandas.tsx` — lista de comandas abertas + dialog de comanda (adicionar/remover itens, fechar com pagamento misto)
- `restaurante.caixa.tsx` — abertura, movimentações, fechamento detalhado por forma de pgto
- Regra: apenas 1 caixa aberto por operador por filial

---

## FASE 3 — Integrações + Dashboard + Relatórios

### Integração Financeiro
- Ao fechar caixa: server function cria automaticamente `financial_transaction` (tipo receita, status recebido, categoria "Receita Operacional - Restaurante" criada se não existir), descrição "Fechamento de Caixa Restaurante DD/MM/YYYY"
- Valor = soma de `order_payments` da sessão

### Integração Estoque
- Trigger no banco: ao inserir `order_items` com status comanda=fechada, decrementa `products.stock`
- Alerta visual quando `stock <= min_stock` nas telas de produtos e dashboard

### Dashboard
- `restaurante.dashboard.tsx`: mesas livres/ocupadas, comandas abertas, vendas do dia, ticket médio, top produtos, vendas por forma de pgto, status do caixa

### Relatórios
- `restaurante.relatorios.tsx`: filtros por período, exportação PDF/Excel (reusa helpers de `src/lib/financeiro.ts`)
- Vendas por período / produto / categoria / mesa / garçom; histórico de caixa

### Multi-filial
- Todas as tabelas operacionais (mesas, comandas, caixa) com `branch_id` obrigatório
- Filtro pelo `useCompany().activeBranchId` em todas as telas

---

## Detalhes técnicos

- Stack: TanStack Start + Supabase (Lovable Cloud), React Query, shadcn/ui
- Padrão: RLS por `private.is_company_member(auth.uid(), company_id)`
- Tokens de design existentes (verde/laranja em `src/styles.css`) — sem cores literais
- pt-BR em toda a UI
- Sequencial de comanda: função `nextval` por empresa via tabela auxiliar `order_counters(company_id, last_number)`

---

## Confirmação

Devido ao tamanho, vou começar pela **Fase 1 agora** (Produtos + Mesas + storage bucket + sidebar). Após validação, sigo para Fase 2 (Comandas + Caixa) e depois Fase 3 (Integrações + Dashboard + Relatórios).

Posso prosseguir?
