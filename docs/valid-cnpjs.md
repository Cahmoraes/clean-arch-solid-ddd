# CNPJs Válidos para Testes

Este arquivo contém uma lista de CNPJs válidos que podem ser utilizados para testes na aplicação.

## CNPJs Válidos

### Formatados
- `11.222.333/0001-81`
- `12.345.678/0001-95`
- `11.444.777/0001-61`
- `03.545.720/2859-66`
- `97.430.318/8995-38`
- `98.258.105/8907-49`
- `98.852.452/4388-60`

### Sem Formatação
- `11222333000181`
- `12345678000195`
- `11444777000161`
- `03545720285966`
- `97430318899538`
- `98258105890749`
- `98852452438860`

## CNPJs Inválidos para Testes

### Casos comuns de invalidez
- `11.111.111/1111-11` - Todos os dígitos iguais
- `00.000.000/0000-00` - Todos zeros
- `12.345.678/0001-00` - Dígito verificador incorreto
- `123.456.789-01` - Formato de CPF
- `12345` - Muito curto
- `123456789012345` - Muito longo
- `` - Vazio
- `abc.def.ghi/jklm-no` - Não numérico

## Nota sobre Validação

Todos os CNPJs listados como válidos passaram pela validação completa do algoritmo brasileiro, incluindo:
- Verificação de 14 dígitos
- Validação dos dois dígitos verificadores
- Rejeição de sequências de dígitos iguais

## Como usar nos testes

```typescript
// Exemplo de uso em testes
const validCNPJ = '11.222.333/0001-81'
const invalidCNPJ = '11.111.111/1111-11'

const cnpjResult = CNPJ.create(validCNPJ)
expect(cnpjResult.isSuccess()).toBe(true)

const invalidResult = CNPJ.create(invalidCNPJ)
expect(invalidResult.isFailure()).toBe(true)
```
