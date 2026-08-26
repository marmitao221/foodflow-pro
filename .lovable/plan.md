# Clientes e conta (crédito) no Restaurante

## O que será criado

### 1. Cadastro de clientes
Nova aba **Clientes** dentro de Restaurante:
- Campos: **Nome** e **Telefone** (só isso).
- Listar, buscar por nome/telefone, editar e inativar.
- Cada cliente pertence à empresa e à filial ativa.

### 2. Conta do cliente (saldo pré-pago)
Na ficha de cada cliente:
- **Saldo atual** em destaque (ex.: R$ 400,00).
- Botão **Adicionar crédito** (ex.: lança 400 reais na conta do Schell) com valor, forma de pagamento e observação.
- Botão de **ajuste/estorno** manual para correções.
- **Histórico** de movimentos: créditos, consumos (com o número da comanda) e ajustes, com data e valor.

### 3. Consumo abatendo do saldo
No fechamento da comanda:
- Ao vincular um cliente à comanda, aparece a forma de pagamento **"Conta do cliente"**.
- O valor pago por essa forma é **descontado do saldo** automaticamente.
- Bloqueio se o saldo for insuficiente (mostra o saldo disponível).
- Ao cancelar/reabrir uma comanda paga na conta, o valor volta para o saldo.

### 4. Cliente na comanda
- No campo de cliente da comanda, passa a existir busca nos clientes cadastrados (o nome livre continua funcionando para quem não é cadastrado).
- O saldo do cliente aparece ao lado quando ele está vinculado.

## Detalhes técnicos

- Migração no banco:
  - `customers` (company_id, branch_id, name, phone, is_active, timestamps) — RLS via helpers `private.can_access` do módulo Restaurante, com GRANTs para `authenticated`/`service_role`.
  - `customer_transactions` (company_id, branch_id, customer_id, type: `credito`/`consumo`/`ajuste`, amount, order_id, note, created_at) com mesma política.
  - `customers.balance` mantido por trigger a partir de `customer_transactions` (fonte da verdade = histórico).
  - Novo valor no enum `payment_method`: `conta_cliente`.
  - `orders.customer_id` (nullable) referenciando `customers`.
- Frontend:
  - `src/lib/clientes.ts` com tipos e helpers de saldo/formatação.
  - `src/routes/_authenticated/restaurante.clientes.tsx` + nova aba em `restaurante.tsx`.
  - Ajustes em `restaurante.comandas.tsx`: seleção de cliente, método `conta_cliente`, validação de saldo, e lançamento do consumo ao fechar.
  - `paymentMethodLabel` em `src/lib/restaurante.ts` ganha "Conta do cliente".
- Permissões: a aba segue a permissão de Restaurante já existente.
