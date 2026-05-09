# Move Function

**Formerly:** Move Method | **Inverse of:** —

## When to Use
Use esta refatoração quando a função depende mais de outro contexto do que do módulo,
classe ou escopo em que vive hoje.
Ela também ajuda quando os chamadores certos estão em outro lugar, ou quando um helper
aninhado ganhou valor próprio e precisa ficar mais acessível.

## Code Smells Addressed
- Função que referencia elementos de outro contexto mais do que do seu contexto atual.

- Limites modulares que espalham comportamento relacionado e enfraquecem a encapsulation.

## Example

### Before
```typescript
class AccountType {
  constructor(readonly isPremium: boolean) {}
}

class Account {
  constructor(
    readonly type: AccountType,
    private daysOverdrawn: number,
  ) {}

  overdraftCharge() {
    if (this.type.isPremium) {
      const base = 10;
      return base + Math.max(0, this.daysOverdrawn - 7) * 0.85;
    }
    return this.daysOverdrawn * 1.75;
  }
}
```

### After
```typescript
class AccountType {
  constructor(readonly isPremium: boolean) {}

  overdraftCharge(daysOverdrawn: number) {
    if (this.isPremium) {
      const base = 10;
      return base + Math.max(0, daysOverdrawn - 7) * 0.85;
    }
    return daysOverdrawn * 1.75;
  }
}

class Account {
  constructor(
    readonly type: AccountType,
    private daysOverdrawn: number,
  ) {}

  overdraftCharge() {
    return this.type.overdraftCharge(this.daysOverdrawn);
  }
}
```

## Mechanics
1. Examine todos os elementos que a função escolhida usa no contexto atual e avalie se
   algum deles também deve se mover.

2. Se houver uma função chamada que também deva mudar de lugar, mova-a primeiro.

3. Se uma função de alto nível for a única chamadora de subfunções, faça inline dessas
   subfunções nela, mova a função resultante e reextraia no destino.

4. Verifique se a função escolhida é um método polimórfico e considere declarações em
   superclasses e subclasses.

5. Copie a função para o contexto de destino e ajuste-a ao novo lar.
   Se o corpo usa elementos do contexto de origem, passe esses elementos como parâmetros
   ou passe uma referência ao contexto de origem.

6. Faça análise estática.

7. Descubra como referenciar a função de destino a partir do contexto de origem e
   transforme a função de origem em uma delegação.

8. Teste.

9. Considere aplicar Inline Function na função de origem.

## Notes
- Quanto mais difícil for decidir o melhor lugar, menos crítica costuma ser a escolha inicial.

- Fowler destaca que vale experimentar um contexto e mover de novo mais tarde, se preciso.

- O novo contexto pode pedir um nome melhor para a função.

- A função de origem pode permanecer como delegação por tempo indeterminado.

- Se os chamadores alcançam o destino com a mesma facilidade, remover o intermediário é melhor.

## Related Refactorings
- Combine Functions into Class

- Extract Class

- Inline Function
