# Módulo Produção Industrial

Entrega em duas fases. Contratos corporativos entram já na Fase 1, em formato simples.

## Fase 1 — Base operacional

### Banco de dados (nova migração)
- `production_contracts`: cliente corporativo (nome, contato, telefone), refeições/dia previstas, valor por refeição, ativo. Com `company_id` + `branch_id`.
- `production_plans`: data, turno, filial, cardápio (nome), quantidade prevista, observações.
- `production_plan_recipes`: pratos do cardápio vinculados às fichas técnicas (`recipes`), com quantidade planejada.
- `production_plan_contracts`: quantas refeições do plano vão para cada contrato (consolidação automática do dia).
- `production_runs`: execução por turno — responsável, início, término, quantidade produzida, servida, sobra limpa, desperdício, status (planejada/em_andamento/finalizada), observações.
- `production_consumptions`: registro do que foi baixado do estoque em cada produção (item, quantidade, custo), inclusive embalagens.
- `production_waste`: sobra limpa/descartada por prato com motivo da perda.
- Enum de turno: café da manhã, almoço, jantar, ceia, madrugada, personalizado.
- RLS em todas as tabelas via os helpers `private` já usados no projeto (isolamento por empresa + filial + permissão `producao`), com os GRANTs correspondentes.
- Trigger/função de baixa automática: ao iniciar a produção, explode as fichas técnicas na proporção da quantidade produzida, gera `stock_movements` de saída e grava `production_consumptions`. Se faltar estoque, a operação retorna alerta detalhado por insumo (não bloqueia silenciosamente).

### Telas (`/producao`)
- Abas: Dashboard, Planejamento, Produção, Desperdício, Contratos.
- **Dashboard**: refeições planejadas, produzidas, servidas, sobras, desperdício, consumo de insumos (R$) e eficiência (produzido/planejado e servido/produzido). Filtros de data, filial e turno. Atualização em tempo real.
- **Planejamento**: criação de planos por dia/turno com cardápio (pratos das fichas técnicas), quantidade prevista, rateio por contrato e observações. Criação para vários dias de uma vez (intervalo de datas).
- **Produção por turno**: iniciar produção (dispara baixa de estoque com pré-visualização e alerta de falta), registrar produzido/servido/sobras/desperdício, responsável e horários, finalizar turno.
- **Desperdício**: lançamento de sobra limpa/descartada com motivo e indicadores por produto, turno, filial e período.
- **Contratos**: cadastro simples de contratos corporativos e consolidado diário de refeições por contrato.

### Integrações
- Menu lateral: "Produção" deixa de estar "em breve" e usa a permissão `producao` já existente.
- Dashboard geral: refeições produzidas/servidas e desperdício passam a considerar a produção (hoje `desperdicio` é fixo em nulo).
- Estoque: consumo aparece como movimentações de saída normais; CMV da produção usa os custos das fichas técnicas.

## Fase 2 — Equipe e relatórios
- Equipe da produção: responsável, auxiliares, cozinheiros e conferente por turno, com produtividade por colaborador.
- Relatórios: produção diária, por turno, por filial, por contrato, consumo de insumos, sobras, desperdício e eficiência.
- Exportação PDF e Excel reutilizando os helpers já existentes em `src/lib/financeiro.ts`.
- Lançamento opcional no Financeiro do faturamento por contrato do período.

## Notas técnicas
- Toda leitura/escrita segue o padrão atual: cliente Supabase do navegador com RLS, filtro por `activeBranchId` do `company-context`, React Query + Realtime.
- A explosão de ficha técnica e a baixa de estoque ficam numa função `SECURITY DEFINER` no banco, para garantir atomicidade (sem baixa parcial em caso de erro).
