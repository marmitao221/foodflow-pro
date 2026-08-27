# Comanda impressa no layout do cupom modelo

Refazer a impressão da comanda (Restaurante > Comandas > "Imprimir comanda") para sair igual ao cupom da foto: bloco de texto monoespaçado, 80mm, com cabeçalho da empresa, aviso de não fiscal, número do pedido, itens com valor unitário, total a pagar, tempo de mesa, atendente e rodapé de agradecimento.

## Layout do cupom

```text
             Delicitta
      Av. Otavio de Souza Cruz, 962
           centro - Sorriso, MT
            (66) 99691-5630
       CNPJ: 44.022.030/0001-74
----------------------------------
    IMPRESSO EM 27/08/2026 13:03:25

   *** NAO E DOCUMENTO FISCAL ***

   ABERTO EM 27/08/2026 13:03
          (Pedido N.: 2733)
              COMANDA 1  /  MESA 4
ITEM (V.Unit)                Total
1 Coca 1,5L (15,00)          15,00
----------------------------------
TOTAL:                       15,00
Taxa de servico:              0,00
Desconto:                     0,00
= TOTAL A PAGAR:             15,00

Tempo: 00h00m
Atendente: adriana

   * Obrigado pela Preferencia *
            Volte Sempre!
```

Regras de conteúdo:
- Cabeçalho vem dos dados reais: nome/CNPJ/telefone da empresa (Configurações > Empresa) e endereço/cidade/UF da filial ativa. Campos vazios são omitidos (sem linha em branco).
- "Tempo" = diferença entre abertura da comanda e o momento da impressão, em `00h00m`.
- Atendente = `waiter_name` da comanda; se vazio, usa o operador logado.
- Linhas de taxa de serviço e desconto só aparecem quando maiores que zero.
- Tipo da comanda (mesa/balcão/delivery/retirada), mesa e cliente aparecem logo abaixo de "COMANDA n".
- Observações da comanda, quando houver, entram antes do rodapé.

## Detalhes técnicos

- `src/routes/_authenticated/restaurante.comandas.tsx`: adicionar um `useQuery` que busca `companies` (name, cnpj, phone) e a filial ativa (`branches`: address, city, state) via `useMyCompanyId()` + `activeBranchId`.
- Reescrever `printOrder(order, items, header)` para gerar o cupom como texto pré-formatado (`<pre>`, fonte monoespaçada, largura fixa de 34 colunas, padding a 80mm), com helpers de alinhamento (centralizar, par label/valor à direita). Mantém `window.open` + `print()` e o aviso de pop-up bloqueado.
- Nenhuma mudança de banco de dados ou de lógica de fechamento/pagamento.
