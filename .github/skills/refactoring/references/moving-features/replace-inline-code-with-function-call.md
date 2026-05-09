# Replace Inline Code with Function Call

**Formerly:** — | **Inverse of:** —

## When to Use
Use esta refatoração quando um trecho inline faz o mesmo trabalho que uma função já existente.
A chamada nomeada comunica intenção melhor do que a mecânica e elimina duplicação.
Ela é especialmente boa quando o nome da função explica o propósito do trecho com mais clareza
do que o código inline consegue explicar sozinho.

## Code Smells Addressed
- Código inline duplicando comportamento já encapsulado em uma função.

- Trecho que explica como fazer algo, quando o sistema já tem um nome melhor para esse trabalho.

## Example

### Before
```typescript
function hasMassachusetts(states: string[]) {
  return states.includes("MA");
}

const states = ["CT", "MA", "RI"];

let appliesToMass = false;
for (const state of states) {
  if (state === "MA") {
    appliesToMass = true;
  }
}
```

### After
```typescript
function hasMassachusetts(states: string[]) {
  return states.includes("MA");
}

const states = ["CT", "MA", "RI"];

const appliesToMass = hasMassachusetts(states);
```

## Mechanics
1. Substitua o código inline por uma chamada à função existente.

2. Teste.

## Notes
- Fowler apresenta esta troca como uma forma de empacotar comportamento em um nome útil.

- A principal vantagem de leitura é que a função nomeia o propósito, não a mecânica.

- A principal vantagem de manutenção é evitar que você procure trechos parecidos para atualizar.

- O autor só evita essa troca quando a semelhança é coincidência, não identidade de propósito.

- O nome da função é o melhor guia: ele deve fazer sentido exatamente no lugar do código inline.

- Se o nome não funcionar, pode ser um caso de Rename Function, não de reutilização direta.

- Se mudar o corpo da função e você não espera que o trecho inline mude junto,
  não faça a troca.

- A reutilização correta depende de identidade de intenção, não apenas de aparência parecida.

- Quando o trecho inline ainda não tem uma boa função equivalente,
  o passo natural costuma ser criar ou melhorar essa função antes da substituição.

- Fowler destaca como especialmente satisfatório substituir código inline por chamadas de biblioteca.

- O ganho é pequeno na mecânica, mas grande na leitura quando o nome certo já existe.

- Se a função certa já existe, reutilizá-la é normalmente a escolha mais direta.

## Related Refactorings
- Rename Function

- Extract Function
