# Anti-Padrões de Teste

**Carregue esta referência quando:** escrever ou mudar testes, adicionar mocks, ou sentir tentação de adicionar métodos apenas para teste em código de produção.

## Visão Geral

Testes devem verificar comportamento real, não comportamento de mock. Mocks são um meio de isolar, não a coisa sendo testada.

**Princípio fundamental:** Teste o que o código faz, não o que os mocks fazem.

**Seguir TDD estrito previne esses anti-padrões.**

## As Leis de Ferro

```
1. NUNCA teste comportamento de mock
2. NUNCA adicione métodos apenas para teste em classes de produção
3. NUNCA mocke sem entender dependências
```

## Anti-Padrão 1: Testar Comportamento de Mock

**A violação:**
```typescript
// ❌ RUIM: Testando que o mock existe
test('renderiza sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});
```

**Por que está errado:**
- Você está verificando que o mock funciona, não que o componente funciona
- Teste passa quando o mock está presente, falha quando não está
- Não informa nada sobre comportamento real

**Correção do parceiro humano:** "Estamos testando o comportamento de um mock?"

**A correção:**
```typescript
// ✅ BOM: Teste o componente real ou não o mocke
test('renderiza sidebar', () => {
  render(<Page />);  // Não mockar sidebar
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});

// OU se a sidebar deve ser mockada para isolamento:
// Não assertar no mock - teste o comportamento de Page com a sidebar presente
```

### Função de Portão

```
ANTES de assertar em qualquer elemento de mock:
  Pergunte: "Estou testando comportamento real do componente ou apenas a existência do mock?"

  SE testando existência do mock:
    PARE - Delete a assertion ou desmocke o componente

  Teste comportamento real em vez disso
```

## Anti-Padrão 2: Métodos Apenas para Teste na Produção

**A violação:**
```typescript
// ❌ RUIM: destroy() só usada em testes
class Session {
  async destroy() {  // Parece API de produção!
    await this._workspaceManager?.destroyWorkspace(this.id);
    // ... limpeza
  }
}

// Nos testes
afterEach(() => session.destroy());
```

**Por que está errado:**
- Classe de produção poluída com código apenas para teste
- Perigoso se chamado acidentalmente em produção
- Viola YAGNI e separação de responsabilidades
- Confunde ciclo de vida do objeto com ciclo de vida da entidade

**A correção:**
```typescript
// ✅ BOM: Utilitários de teste tratam a limpeza de testes
// Session não tem destroy() - é stateless em produção

// Em test-utils/
export async function limparSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) {
    await workspaceManager.destroyWorkspace(workspace.id);
  }
}

// Nos testes
afterEach(() => limparSession(session));
```

### Função de Portão

```
ANTES de adicionar qualquer método à classe de produção:
  Pergunte: "Isso só é usado por testes?"

  SE sim:
    PARE - Não adicione
    Coloque nos utilitários de teste em vez disso

  Pergunte: "Esta classe é dona do ciclo de vida deste recurso?"

  SE não:
    PARE - Classe errada para este método
```

## Anti-Padrão 3: Mockar Sem Entender

**A violação:**
```typescript
// ❌ RUIM: Mock quebra lógica do teste
test('detecta servidor duplicado', () => {
  // Mock impede escrita de config de que o teste depende!
  vi.mock('ToolCatalog', () => ({
    discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
  }));

  await addServer(config);
  await addServer(config);  // Deveria lançar - mas não vai!
});
```

**Por que está errado:**
- Método mockado tinha efeito colateral do qual o teste dependia (escrever config)
- Over-mocking para "ser seguro" quebra o comportamento real
- Teste passa pelo motivo errado ou falha misteriosamente

**A correção:**
```typescript
// ✅ BOM: Mocke no nível correto
test('detecta servidor duplicado', () => {
  // Mocke a parte lenta, preserve o comportamento que o teste precisa
  vi.mock('MCPServerManager'); // Apenas mocke a inicialização lenta do servidor

  await addServer(config);  // Config escrito
  await addServer(config);  // Duplicado detectado ✓
});
```

### Função de Portão

```
ANTES de mockar qualquer método:
  PARE - Não mocke ainda

  1. Pergunte: "Que efeitos colaterais o método real tem?"
  2. Pergunte: "Este teste depende de algum desses efeitos colaterais?"
  3. Pergunte: "Entendo completamente do que este teste precisa?"

  SE depende de efeitos colaterais:
    Mocke em nível mais baixo (a operação realmente lenta/externa)
    OU use test doubles que preservam o comportamento necessário
    NÃO o método de alto nível do qual o teste depende

  SE não tem certeza do que o teste depende:
    Execute o teste com implementação real PRIMEIRO
    Observe o que realmente precisa acontecer
    ENTÃO adicione mocking mínimo no nível correto

  Sinais de alerta:
    - "Vou mockar isso para ser seguro"
    - "Isso pode ser lento, melhor mockar"
    - Mockar sem entender a cadeia de dependências
```

## Anti-Padrão 4: Mocks Incompletos

**A violação:**
```typescript
// ❌ RUIM: Mock parcial - apenas campos que você acha que precisa
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' }
  // Faltando: metadata que código downstream usa
};

// Depois: quebra quando código acessa response.metadata.requestId
```

**Por que está errado:**
- **Mocks parciais escondem suposições estruturais** — Você só mockei os campos que conhece
- **Código downstream pode depender de campos não incluídos** — Falhas silenciosas
- **Testes passam mas integração falha** — Mock incompleto, API real completa
- **Falsa confiança** — Teste não prova nada sobre comportamento real

**A Regra de Ferro:** Mocke a estrutura de dados COMPLETA como existe na realidade, não apenas os campos que seu teste imediato usa.

**A correção:**
```typescript
// ✅ BOM: Espelhe a completude da API real
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
  // Todos os campos que a API real retorna
};
```

### Função de Portão

```
ANTES de criar respostas de mock:
  Verifique: "Que campos a resposta real da API contém?"

  Ações:
    1. Examine resposta real da API em docs/exemplos
    2. Inclua TODOS os campos que o sistema pode consumir downstream
    3. Verifique que o mock corresponde completamente ao schema de resposta real

  Crítico:
    Se você está criando um mock, deve entender a estrutura COMPLETA
    Mocks parciais falham silenciosamente quando código depende de campos omitidos

  Se não tiver certeza: Inclua todos os campos documentados
```

## Anti-Padrão 5: Testes de Integração como Reflexão Tardia

**A violação:**
```
✅ Implementação completa
❌ Sem testes escritos
"Pronto para testes"
```

**Por que está errado:**
- Testes fazem parte da implementação, não seguimento opcional
- TDD teria capturado isso
- Não pode afirmar que está completo sem testes

**A correção:**
```
Ciclo TDD:
1. Escreva teste com falha
2. Implemente para passar
3. Refatore
4. AÍ sim afirme que está completo
```

## Quando Mocks Ficam Muito Complexos

**Sinais de alerta:**
- Setup do mock mais longo que a lógica do teste
- Mockando tudo para fazer o teste passar
- Mocks sem métodos que componentes reais têm
- Teste quebra quando o mock muda

**Pergunta do parceiro humano:** "Precisamos estar usando um mock aqui?"

**Considere:** Testes de integração com componentes reais geralmente mais simples do que mocks complexos

## TDD Previne Esses Anti-Padrões

**Por que TDD ajuda:**
1. **Escreva o teste primeiro** → Força você a pensar no que está realmente testando
2. **Observe falhar** → Confirma que o teste testa comportamento real, não mocks
3. **Implementação mínima** → Nenhum método apenas para teste se infiltra
4. **Dependências reais** → Você vê do que o teste realmente precisa antes de mockar

**Se você está testando comportamento de mock, violou TDD** — você adicionou mocks sem observar o teste falhar contra código real primeiro.

## Referência Rápida

| Anti-Padrão | Correção |
|-------------|---------|
| Assertar em elementos de mock | Testar componente real ou desmockê-lo |
| Métodos apenas para teste na produção | Mover para utilitários de teste |
| Mockar sem entender | Entender dependências primeiro, mockar minimamente |
| Mocks incompletos | Espelhar a API real completamente |
| Testes como reflexão tardia | TDD — testes primeiro |
| Mocks super complexos | Considerar testes de integração |

## Sinais de Alerta

- Assertion verifica test IDs com `*-mock`
- Métodos apenas chamados em arquivos de teste
- Setup do mock é >50% do teste
- Teste falha quando você remove o mock
- Não consegue explicar por que o mock é necessário
- Mockando "apenas para ser seguro"

## O Resumo Final

**Mocks são ferramentas para isolar, não coisas para testar.**

Se TDD revela que você está testando comportamento de mock, você errou o caminho.

Correção: Teste comportamento real ou questione por que está mockando.
