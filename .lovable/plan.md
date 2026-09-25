# Vendas de delivery direto no caixa (iFood, 99Food, Keeta)

## Parte 1 — Lançamento rápido (pronto hoje)
- Adicionar **99Food** como forma de pagamento ("99Food Online"), junto com iFood, Keeta e Aiqfome.
- No caixa aberto, novo bloco **"Venda de delivery"** com botões: iFood, 99Food, Keeta, Aiqfome.
- Clicou, digita o valor (ex.: 46,00) e o nº do pedido (opcional) → a venda entra na hora na movimentação do caixa como "Pedido iFood nº ... — R$ 46,00", forma de pagamento iFood.
- Entra nos totais por forma de pagamento e vai para o financeiro no fechamento, como já acontece hoje.

## Parte 2 — iFood automático
- Nova tela **Configurações > Integrações > iFood**: você cola as chaves do Portal do Desenvolvedor (guardadas com segurança) e o ID da loja, e escolhe a filial.
- Quando o iFood avisa que um pedido foi **concluído**, o sistema busca o valor e lança sozinho no caixa aberto daquela filial ("Pedido iFood nº 1234 — R$ 46,00").
- Pedido cancelado não entra. O mesmo pedido nunca entra duas vezes.
- Se não houver caixa aberto, a venda fica guardada como "pendente" e é lançada assim que você abrir o caixa.
- Você precisa cadastrar no portal do iFood o endereço que eu vou te passar depois de pronto.

## 99Food e Keeta automáticos
Ficam para depois: hoje não liberam acesso aberto para lojas. Até lá, use o lançamento rápido (Parte 1). Se você conseguir acesso de parceiro com eles, eu integro do mesmo jeito do iFood.

## Detalhes técnicos
- Migração: valor `ninetynine_online` no enum `payment_method`; tabela `delivery_integrations` (company_id, branch_id, provider, merchant_id, ativo) e `delivery_orders` (provider, external_id único, valor, status, session_id nulo = pendente), com GRANTs + RLS via `private.is_company_member`.
- Venda de delivery rápida: cria `orders` tipo delivery fechado + `order_payments` na sessão aberta (reaproveita toda a lógica atual de caixa/fechamento).
- iFood: segredos `IFOOD_CLIENT_ID` / `IFOOD_CLIENT_SECRET`; rota pública `/api/public/ifood/webhook` com verificação de assinatura `X-IFood-Signature` (HMAC do client secret); token OAuth client_credentials; busca detalhes em `/order/v1.0/orders/{id}` quando o evento é CONCLUDED; lança via admin client apenas após validar assinatura e merchant cadastrado.
- Pendentes são lançados ao abrir o caixa da filial.
