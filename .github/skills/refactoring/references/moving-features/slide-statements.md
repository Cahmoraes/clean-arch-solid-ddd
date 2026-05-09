# Slide Statements

**Formerly:** Consolidate Duplicate Conditional Fragments | **Inverse of:** —

## When to Use
Use esta refatoração para manter código relacionado junto.
Ela ajuda a agrupar leituras e escritas da mesma estrutura de dados, aproximar declarações do uso
e preparar o terreno para refatorações como Extract Function.

## Code Smells Addressed
- Código relacionado espalhado e misturado com linhas de outra responsabilidade.

- Declarações e cálculos longe do ponto em que são realmente usados.

## Example

### Before
```typescript
const pricingPlan = retrievePricingPlan();
const order = retrieveOrder();
const baseCharge = pricingPlan.base;
let charge;
const chargePerUnit = pricingPlan.unit;
const units = order.units;
let discount;

charge = baseCharge + units * chargePerUnit;
discount = Math.max(units - pricingPlan.discountThreshold, 0) * pricingPlan.discountFactor;
```

### After
```typescript
const pricingPlan = retrievePricingPlan();
const baseCharge = pricingPlan.base;
const chargePerUnit = pricingPlan.unit;

const order = retrieveOrder();
const units = order.units;
let charge;
let discount;

charge = baseCharge + units * chargePerUnit;
discount = Math.max(units - pricingPlan.discountThreshold, 0) * pricingPlan.discountFactor;
```

## Mechanics
1. Identifique a posição-alvo para a qual você quer mover o fragmento.
   Examine os statements entre origem e destino para ver se existe interferência.
   Se houver interferência, abandone a movimentação.

2. Um fragmento não pode deslizar para trás além do ponto em que qualquer elemento
   que ele referencia é declarado.

3. Um fragmento não pode deslizar para frente além de qualquer elemento que o referencia.

4. Um fragmento não pode atravessar um statement que modifica algo que ele referencia.

5. Se o fragmento modifica um elemento, ele não pode atravessar outro statement que
   referencia o valor modificado.

6. Corte o fragmento na origem e cole-o na posição-alvo.

7. Teste.

8. Se o teste falhar, quebre o slide em passos menores: mova menos código ou reduza o
   tamanho do fragmento que está sendo movido.

## Notes
- Fowler usa esta refatoração muitas vezes como passo preparatório para Extract Function.

- Declarar variáveis perto do primeiro uso é um caso comum e simples desse movimento.

- Código sem side effects é muito mais fácil de rearranjar com segurança.

- Em condicionais, deslizar código para fora remove duplicação; deslizar para dentro a replica.

- Quando o slide desejado falha, o remédio é reduzir o passo, não forçar a mudança.

## Related Refactorings
- Extract Function

- Split Variable

- Move Statements into Function
