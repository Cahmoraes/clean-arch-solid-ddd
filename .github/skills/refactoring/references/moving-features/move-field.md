# Move Field

**Formerly:** — | **Inverse of:** —

## When to Use
Use esta refatoração quando a estrutura de dados deixou de representar bem o domínio.
Ela é especialmente útil quando um campo vive melhor em outro record ou objeto,
quando mudanças em um campo exigem mudanças em outro, ou quando o mesmo valor é
atualizado em várias estruturas.

## Code Smells Addressed
- Estrutura de dados pobre, que força código extra só para contornar o modelo.

- Campo atualizado em múltiplas estruturas, sinal de que está no lugar errado.

## Example

### Before
```typescript
class CustomerContract {
  constructor(readonly startDate: Date) {}
}

class Customer {
  private _contract = new CustomerContract(new Date());

  constructor(
    readonly name: string,
    private _discountRate: number,
  ) {}

  get discountRate() {
    return this._discountRate;
  }

  becomePreferred() {
    this._discountRate += 0.03;
  }
}
```

### After
```typescript
class CustomerContract {
  constructor(
    readonly startDate: Date,
    private _discountRate: number,
  ) {}

  get discountRate() {
    return this._discountRate;
  }

  set discountRate(value: number) {
    this._discountRate = value;
  }
}

class Customer {
  private _contract = new CustomerContract(new Date(), 0.1);

  constructor(readonly name: string) {}

  get discountRate() {
    return this._contract.discountRate;
  }

  becomePreferred() {
    this._contract.discountRate = this.discountRate + 0.03;
  }
}
```

## Mechanics
1. Garanta que o campo de origem esteja encapsulado.

2. Teste.

3. Crie o campo, e também os accessors, no alvo.

4. Execute verificações estáticas.

5. Garanta que exista uma referência do objeto de origem para o objeto de destino.
   Pode ser um campo ou método já existente; se não houver, crie um meio de chegar ao alvo.

6. Ajuste os accessors para usar o campo do alvo.

7. Se o alvo for compartilhado entre objetos de origem, considere primeiro fazer o setter
   atualizar o campo de origem e o de destino, seguido de Introduce Assertion para detectar
   atualizações inconsistentes. Depois conclua a troca dos accessors.

8. Teste.

9. Remova o campo de origem.

10. Teste.

## Notes
- Fowler descreve esta refatoração como parte de uma mudança maior na estrutura de dados.

- Depois do movimento, vários clientes do campo passam a fazer mais sentido via objeto-alvo.

- Às vezes é preciso refatorar padrões de uso antes de conseguir mover o campo.

- A refatoração é mais fácil com classes, porque os dados já ficam protegidos por accessors.

- Com bare records sem encapsulation, o mesmo movimento é possível, mas mais delicado.

## Related Refactorings
- Encapsulate Variable

- Introduce Assertion

- Encapsulate Record
