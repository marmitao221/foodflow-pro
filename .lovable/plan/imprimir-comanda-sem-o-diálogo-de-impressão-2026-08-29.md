# Imprimir comanda sem o diálogo de impressão

O código do site já imprime direto (iframe oculto, sem aba intermediária). O diálogo "Imprimir" que ainda aparece é do navegador: **nenhum site pode fechá-lo por código** — é uma proteção do Chrome. A única forma de eliminá-lo é ligar o modo de impressão silenciosa no próprio Chrome do computador do caixa.

## O que vou fazer no sistema

1. **Guia de impressão direta** na tela de Comandas: um botão discreto "Impressão direta" abre um passo a passo curto:
   - Definir a impressora térmica como padrão do Windows.
   - Criar um atalho do Chrome com `--kiosk-printing` (texto pronto para copiar).
   - Usar o sistema por esse atalho: a comanda passa a sair na hora, sem diálogo.
2. **Detecção automática**: se o modo kiosk estiver ativo, a comanda imprime instantaneamente (comportamento atual já funciona); se não estiver, mostro uma dica única ("Ativar impressão direta") no lugar de repetir o aviso a cada impressão.

Nenhuma mudança no layout do cupom, no conteúdo ou no banco de dados.

## Detalhes técnicos

- `src/routes/_authenticated/restaurante.comandas.tsx`: novo diálogo `DirectPrintHelpDialog` com as instruções e um bloco copiável do comando do atalho; botão ao lado de "Imprimir comanda".
- A preferência "já configurei" fica em `localStorage` para não poluir a interface depois.
