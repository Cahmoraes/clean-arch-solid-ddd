# Remove Dead Code

**Formerly:** — | **Inverse of:** —

## When to Use
Use esta refatoração assim que descobrir código que não é mais usado.
Mesmo quando o compilador o elimina, código morto continua atrapalhando quem tenta entender
o sistema e espera que uma mudança ali altere o comportamento.
O ganho principal aqui é clareza imediata.

## Code Smells Addressed
- Função, bloco ou ramificação sem uso real no sistema.

- Código comentado ou preservado "para depois" apesar de existir version control.

## Example

### Before
```typescript
function renderInvoice(total: number) {
  return `Total: ${total}`;
}

function oldInvoiceBanner() {
  return "LEGACY";
}

function oldTaxRule() {
  return 0;
}

if (false) {
  oldInvoiceBanner();
  oldTaxRule();
}
```

### After
```typescript
function renderInvoice(total: number) {
  return `Total: ${total}`;
}
```

## Mechanics
1. Se o código morto puder ser referenciado de fora, como uma função completa,
   faça uma busca para verificar se existem callers.

2. Remova o código morto.

3. Teste.

## Notes
- Fowler enfatiza que o custo principal do código morto é cognitivo, não de memória ou CPU.

- Compiladores decentes já removem muita coisa sem uso, mas isso não ajuda a leitura do código-fonte.

- Sem sinais de alerta no arquivo, outra pessoa ainda perde tempo entendendo algo que não afeta mais a saída.

- O autor lembra que não somos cobrados pelo peso do binário,
  então o problema aqui não é armazenamento, e sim compreensão.

- O autor não se preocupa em "guardar" o trecho no código, porque version control já faz esse papel.

- Comentar código morto era um hábito útil antes de sistemas de versão convenientes.

- Hoje, manter o trecho comentado só adiciona ruído onde deveria haver intenção clara.

- Se o código voltar a ser útil, recuperar a revisão antiga é mais seguro do que deixá-lo no arquivo.

- Mesmo em código enviado para dispositivos, o trecho morto ainda pesa mais para quem lê do que para a máquina.

- Fowler comenta que quase nunca precisa deixar uma nota apontando para a revisão onde removeu o trecho.

- A regra prática do capítulo é simples: se não é usado, apague.

- O trecho morto não merece espaço em produção nem em leitura diária.

## Related Refactorings
- Nenhuma refatoração específica é destacada nesta seção.
