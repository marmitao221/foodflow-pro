# Convites por link para a equipe

Criar links de convite: o administrador gera um link, envia para a pessoa, e ela só preenche **nome, e-mail e senha**. Ao concluir, já entra na empresa como **funcionário**, na filial e com as permissões que o administrador definiu no convite.

## Como vai funcionar

1. Em **Equipe > Funcionários** aparece um botão "Convidar por link".
2. No diálogo o admin escolhe: filial, permissões (Rotina, Checklists, Produção, Estoque, Restaurante, Caixa, Relatórios), validade (7 dias por padrão) e, opcionalmente, o nome/e-mail esperado.
3. O sistema gera um link único (ex.: `/convite/<código>`) com botão de copiar.
4. Quem abre o link vê o nome da empresa e um formulário simples: nome, e-mail, senha, confirmar senha. Sem confirmação de e-mail.
5. Ao enviar: cria a conta, cria o vínculo como funcionário com exatamente as permissões do convite, cria o cadastro do funcionário na empresa, marca o convite como usado e já entra logado na área permitida.
6. Uma lista mostra os convites pendentes/usados/expirados, com opção de revogar e copiar link novamente.

## Regras de segurança

- Convite é de uso único, expira na data definida e pode ser revogado.
- O perfil criado é sempre **funcionário** (nunca administrador) e limitado à filial do convite.
- As permissões vêm apenas do convite gravado no banco — nada é enviado pelo navegador de quem se cadastra.
- A página do convite mostra somente o nome da empresa; nenhum outro dado da empresa é exposto.
- Convite inválido/expirado/já usado mostra mensagem clara e não cria nada.

## Detalhes técnicos

- Migração: tabela `team_invites` (`company_id`, `branch_id`, `token`, `permissions[]`, `expires_at`, `created_by`, `accepted_at`, `accepted_user_id`, `revoked_at`, `full_name`, `email`) com GRANTs e RLS: apenas admins da empresa (via helper `private.is_admin_of`) leem/criam/revogam; sem acesso anônimo.
- `src/lib/convites.functions.ts` (createServerFn):
  - `createTeamInvite` — protegido, valida se quem chama é admin da empresa e grava o convite.
  - `listTeamInvites` / `revokeTeamInvite` — protegidos, admin da empresa.
  - `getInviteInfo` — público, recebe o token e devolve só `{ companyName, valid, reason }`.
  - `acceptInvite` — público, cria o usuário via admin API (e-mail confirmado), grava `memberships` (role `operator` + permissões do convite + `branch_id`), cria/vincula `employees`, marca o convite como aceito. Rejeita token inválido, expirado, revogado ou já usado.
- Rota pública `src/routes/convite.$token.tsx` (fora de `_authenticated`) com formulário e login automático após o cadastro, redirecionando para a primeira área permitida (`homeFor`).
- UI de gestão no diálogo de `equipe.funcionarios.tsx`, reaproveitando `PERMISSIONS` e o seletor de filiais existente.
