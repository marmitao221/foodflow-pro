# Nova Identidade Visual — CozinhaPro

## Objetivo
Redefinir a identidade visual do SaaS CozinhaPro (gestão de restaurantes industriais, marmitarias e alimentação coletiva), mantendo a estrutura e funcionalidades existentes, mas renovando cores, tipografia, composição e sensação geral da interface.

## Processo
1. **Capturar a UI atual** — screenshot da landing page e/ou dashboard para servir de referência visual real.
2. **Coletar preferências do usuário** — paleta de cores, par de fontes e estrutura de layout, via perguntas visuais.
3. **Gerar 3 direções de design** — variações concretas baseadas nas escolhas do usuário, mantendo o mesmo gosto visual travado entre elas.
4. **Implementar a direção escolhida** — aplicar tokens no `src/styles.css`, ajustar componentes-chave (Logo, AppSidebar, landing page, cards de destaque) e garantir consistência clara/escura.

## Escopo
- Foco na camada visual (tokens, tipografia, espaçamento, bordas, sombras, composição da landing).
- Não alterar fluxos de negócio, rotas, banco de dados ou permissões.
- Preservar a acessibilidade e o suporte a dark mode.

## Entregáveis
- `src/styles.css` atualizado com nova paleta semântica.
- Componentes visuais refatorados (Logo, landing page, cards).
- Build passando e preview atualizado.
