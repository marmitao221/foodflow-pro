# Corrigir o valor total na impressão da comanda

O valor está sendo alinhado no limite direito de uma linha monoespaçada. Com a fonte maior, essa parte pode ultrapassar a área útil da impressora e o número fica cortado, embora o texto “TOTAL A PAGAR” apareça.

## Alteração

- Calcular o total impresso com segurança a partir do total da comanda, usando subtotal, taxa e desconto como alternativa caso o valor esteja ausente ou inválido.
- Imprimir `TOTAL A PAGAR` e o valor em uma linha exclusiva, com o número próximo do texto e sem depender do alinhamento até a borda direita.
- Manter a fonte forte, o tamanho atual e todo o restante do cupom sem alterações.

## Verificação

- Conferir uma comanda com itens, taxa e desconto.
- Confirmar visualmente que o valor numérico aparece completo no cupom de 80 mm.
