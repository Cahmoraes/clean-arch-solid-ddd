# Split Loop

**Formerly:** — | **Inverse of:** —

## When to Use
Use esta refatoração quando um loop faz duas coisas ao mesmo tempo.
Separar cada cálculo reduz a carga de entendimento, facilita mudanças futuras e abre espaço
para extrair funções que retornam um único valor.
Um loop de propósito único também tende a expor melhor o resultado que produz.

## Code Smells Addressed
- Loop com múltiplas responsabilidades no mesmo passe.

- Cálculos diferentes acoplados só para evitar uma segunda iteração.

## Example

### Before
```typescript
let youngest = people[0]?.age ?? Infinity;
let totalSalary = 0;

for (const person of people) {
  if (person.age < youngest) {
    youngest = person.age;
  }
  totalSalary += person.salary;
}

return `youngestAge: ${youngest}, totalSalary: ${totalSalary}`;
```

### After
```typescript
let totalSalary = 0;
for (const person of people) {
  totalSalary += person.salary;
}

let youngest = people[0]?.age ?? Infinity;
for (const person of people) {
  if (person.age < youngest) {
    youngest = person.age;
  }
}

return `youngestAge: ${youngest}, totalSalary: ${totalSalary}`;
```

## Mechanics
1. Copie o loop.

2. Identifique e elimine side effects duplicados.

3. Teste.

4. Quando terminar, considere aplicar Extract Function em cada loop.

## Notes
- Fowler trata a preocupação com performance como uma etapa separada da refatoração.

- Se a dupla iteração virar gargalo real, juntar os loops de novo é fácil depois.

- Na prática, a travessia de listas raramente é o bottleneck mais importante.

- Separar loops costuma habilitar otimizações mais fortes do que a micro-otimização original.

- Um loop que calcula um único valor passa a poder apenas retornar esse valor.

- Loops que fazem muitas coisas tendem a precisar preencher estruturas ou variáveis locais extras.

- O exemplo do livro segue com Slide Statements e depois com Extract Function.

- Depois da separação, um dos loops do exemplo vira pipeline e o outro recebe Substitute Algorithm.

## Related Refactorings
- Extract Function

- Slide Statements

- Replace Loop with Pipeline

- Substitute Algorithm
