# Validação em Profundidade de Defesa

## Visão Geral

Quando você corrige um bug causado por dados inválidos, adicionar validação em um lugar parece suficiente. Mas essa única verificação pode ser contornada por caminhos de código diferentes, refatoração ou mocks.

**Princípio fundamental:** Valide em CADA camada pela qual os dados passam. Torne o bug estruturalmente impossível.

## Por Que Múltiplas Camadas

Validação única: "Corrigimos o bug"
Múltiplas camadas: "Tornamos o bug impossível"

Camadas diferentes capturam casos diferentes:
- Validação de entrada captura a maioria dos bugs
- Lógica de negócio captura casos extremos
- Guards de ambiente evitam perigos específicos de contexto
- Logging de debug ajuda quando outras camadas falham

## As Quatro Camadas

### Camada 1: Validação no Ponto de Entrada
**Propósito:** Rejeitar entrada obviamente inválida na fronteira da API

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory não pode estar vazio');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory não existe: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory não é um diretório: ${workingDirectory}`);
  }
  // ... prossiga
}
```

### Camada 2: Validação da Lógica de Negócio
**Propósito:** Garantir que os dados fazem sentido para esta operação

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir obrigatório para inicialização do workspace');
  }
  // ... prossiga
}
```

### Camada 3: Guards de Ambiente
**Propósito:** Evitar operações perigosas em contextos específicos

```typescript
async function gitInit(directory: string) {
  // Em testes, recuse git init fora de diretórios temporários
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Recusando git init fora do diretório temp durante os testes: ${directory}`
      );
    }
  }
  // ... prossiga
}
```

### Camada 4: Instrumentação de Debug
**Propósito:** Capturar contexto para análise forense

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('Prestes a fazer git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... prossiga
}
```

## Aplicando o Padrão

Quando você encontra um bug:

1. **Rastreie o fluxo de dados** — Onde o valor ruim se origina? Onde é usado?
2. **Mapeie todos os checkpoints** — Liste cada ponto pelo qual os dados passam
3. **Adicione validação em cada camada** — Entrada, negócio, ambiente, debug
4. **Teste cada camada** — Tente contornar a camada 1, verifique se a camada 2 captura

## Exemplo da Sessão

Bug: `projectDir` vazio causou `git init` no código-fonte

**Fluxo de dados:**
1. Configuração do teste → string vazia
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` executa em `process.cwd()`

**Quatro camadas adicionadas:**
- Camada 1: `Project.create()` valida não vazio/existe/gravável
- Camada 2: `WorkspaceManager` valida projectDir não vazio
- Camada 3: `WorktreeManager` recusa git init fora de tmpdir em testes
- Camada 4: Logging de stack trace antes de git init

**Resultado:** Todos os 1847 testes passaram, bug impossível de reproduzir

## Insight Principal

Todas as quatro camadas foram necessárias. Durante os testes, cada camada capturou bugs que as outras perderam:
- Caminhos de código diferentes contornaram a validação de entrada
- Mocks contornaram as verificações de lógica de negócio
- Casos extremos em plataformas diferentes precisaram de guards de ambiente
- Logging de debug identificou mau uso estrutural

**Não pare em um único ponto de validação.** Adicione verificações em cada camada.
