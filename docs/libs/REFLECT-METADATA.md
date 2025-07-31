# Reflect Metadata

### Versão
- **Versão atual no projeto**: 0.2.2

## Principais Características

O **reflect-metadata** é uma biblioteca que implementa a API de reflexão de metadados para TypeScript e JavaScript. Permite a adição e recuperação de metadados associados a decorators:

- **API de reflexão**: Fornece métodos para definir, obter e manipular metadados
- **Suporte a decorators**: Integração perfeita com decorators TypeScript
- **Polyfills inclusos**: Inclui polyfills para Map, Set e WeakMap para ambientes antigos
- **Injeção de dependência**: Base para frameworks de DI como InversifyJS
- **Type metadata**: Acesso a informações de tipo em runtime
- **Cross-platform**: Funciona em Node.js, browsers e bundlers

### Funcionalidades Principais
- Definição de metadados customizados
- Recuperação de informações de tipo
- Suporte a parameter types e return types
- Base para frameworks de dependency injection
- Compatibilidade com decorators experimentais do TypeScript

## Casos de Uso

### 1. Configuração Básica no TypeScript
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}

// main.ts
import 'reflect-metadata'
```

### 2. Decorator Customizado com Metadados
```typescript
import 'reflect-metadata'

// Decorator para marcar métodos como rotas
function Route(path: string, method: string = 'GET') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('route:path', path, target, propertyKey)
    Reflect.defineMetadata('route:method', method, target, propertyKey)
  }
}

class UserController {
  @Route('/users', 'GET')
  getUsers() {
    return 'Lista de usuários'
  }

  @Route('/users/:id', 'GET')
  getUserById() {
    return 'Usuário específico'
  }
}

// Recuperar metadados das rotas
function getRoutes(controller: any) {
  const prototype = Object.getPrototypeOf(controller)
  const methodNames = Object.getOwnPropertyNames(prototype)
    .filter(name => name !== 'constructor')

  return methodNames.map(methodName => {
    const path = Reflect.getMetadata('route:path', prototype, methodName)
    const method = Reflect.getMetadata('route:method', prototype, methodName)
    
    return {
      method: methodName,
      path,
      httpMethod: method
    }
  }).filter(route => route.path)
}
```

### 3. Injeção de Dependência Simples
```typescript
import 'reflect-metadata'

// Símbolos para identificar dependências
const SERVICE_IDENTIFIER = {
  UserService: Symbol.for('UserService'),
  EmailService: Symbol.for('EmailService')
}

// Decorator para marcar classes como injetáveis
function Injectable(target: any) {
  Reflect.defineMetadata('injectable', true, target)
  return target
}

// Decorator para injetar dependências
function Inject(serviceIdentifier: symbol) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata('inject:tokens', target) || []
    existingTokens[parameterIndex] = serviceIdentifier
    Reflect.defineMetadata('inject:tokens', existingTokens, target)
  }
}

@Injectable
class UserService {
  getUser(id: string) {
    return { id, name: 'João' }
  }
}

@Injectable
class EmailService {
  sendEmail(to: string, subject: string) {
    console.log(`Email enviado para ${to}: ${subject}`)
  }
}

@Injectable
class UserController {
  constructor(
    @Inject(SERVICE_IDENTIFIER.UserService) private userService: UserService,
    @Inject(SERVICE_IDENTIFIER.EmailService) private emailService: EmailService
  ) {}

  async createUser(userData: any) {
    const user = this.userService.getUser(userData.id)
    this.emailService.sendEmail(user.name, 'Bem-vindo!')
    return user
  }
}
```

### 4. Container de Injeção de Dependência
```typescript
import 'reflect-metadata'

interface ServiceContainer {
  get<T>(serviceIdentifier: symbol): T
  bind<T>(serviceIdentifier: symbol, implementation: new (...args: any[]) => T): void
}

class DIContainer implements ServiceContainer {
  private services = new Map<symbol, any>()
  private instances = new Map<symbol, any>()

  bind<T>(serviceIdentifier: symbol, implementation: new (...args: any[]) => T) {
    this.services.set(serviceIdentifier, implementation)
  }

  get<T>(serviceIdentifier: symbol): T {
    // Verificar se já existe uma instância
    if (this.instances.has(serviceIdentifier)) {
      return this.instances.get(serviceIdentifier)
    }

    // Obter a implementação
    const implementation = this.services.get(serviceIdentifier)
    if (!implementation) {
      throw new Error(`Serviço não encontrado para: ${String(serviceIdentifier)}`)
    }

    // Verificar se é injetável
    const isInjectable = Reflect.getMetadata('injectable', implementation)
    if (!isInjectable) {
      throw new Error(`Classe não é injetável: ${implementation.name}`)
    }

    // Obter tokens de injeção
    const tokens = Reflect.getMetadata('inject:tokens', implementation) || []
    
    // Resolver dependências
    const dependencies = tokens.map((token: symbol) => this.get(token))

    // Criar instância
    const instance = new implementation(...dependencies)
    this.instances.set(serviceIdentifier, instance)

    return instance
  }
}

// Uso do container
const container = new DIContainer()

container.bind(SERVICE_IDENTIFIER.UserService, UserService)
container.bind(SERVICE_IDENTIFIER.EmailService, EmailService)

const userController = container.get<UserController>(SERVICE_IDENTIFIER.UserService)
```

### 5. Validação com Metadados
```typescript
import 'reflect-metadata'

// Decorator para validação
function IsEmail(target: any, propertyKey: string) {
  Reflect.defineMetadata('validation:email', true, target, propertyKey)
}

function IsRequired(target: any, propertyKey: string) {
  Reflect.defineMetadata('validation:required', true, target, propertyKey)
}

function MinLength(length: number) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('validation:minLength', length, target, propertyKey)
  }
}

class CreateUserDto {
  @IsRequired
  @IsEmail
  email!: string

  @IsRequired
  @MinLength(3)
  name!: string

  @MinLength(6)
  password!: string
}

// Validador que usa os metadados
function validate(obj: any): string[] {
  const errors: string[] = []
  const prototype = Object.getPrototypeOf(obj)
  
  for (const propertyKey of Object.getOwnPropertyNames(obj)) {
    const value = obj[propertyKey]

    // Validar required
    const isRequired = Reflect.getMetadata('validation:required', prototype, propertyKey)
    if (isRequired && (!value || value.trim() === '')) {
      errors.push(`${propertyKey} é obrigatório`)
      continue
    }

    if (value) {
      // Validar email
      const isEmail = Reflect.getMetadata('validation:email', prototype, propertyKey)
      if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${propertyKey} deve ser um email válido`)
      }

      // Validar minLength
      const minLength = Reflect.getMetadata('validation:minLength', prototype, propertyKey)
      if (minLength && value.length < minLength) {
        errors.push(`${propertyKey} deve ter pelo menos ${minLength} caracteres`)
      }
    }
  }

  return errors
}
```

### 6. Metadata de Tipos do TypeScript
```typescript
import 'reflect-metadata'

// Decorator que mostra informações de tipo
function LogType(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const type = Reflect.getMetadata('design:type', target, propertyKey)
  const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey)
  const returnType = Reflect.getMetadata('design:returntype', target, propertyKey)

  console.log(`Method: ${propertyKey}`)
  console.log(`Type: ${type?.name}`)
  console.log(`Param types: ${paramTypes?.map((t: any) => t.name).join(', ')}`)
  console.log(`Return type: ${returnType?.name}`)
}

class ExampleService {
  @LogType
  processUser(id: number, name: string): Promise<string> {
    return Promise.resolve(`Processed: ${name}`)
  }

  @LogType
  getUserCount(): number {
    return 42
  }
}
```

### 7. Sistema de Middleware com Metadados
```typescript
import 'reflect-metadata'

// Decorator para aplicar middlewares
function UseMiddleware(...middlewares: Function[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('middlewares', middlewares, target, propertyKey)
  }
}

// Decorator para autenticação
function RequireAuth(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const existingMiddlewares = Reflect.getMetadata('middlewares', target, propertyKey) || []
  Reflect.defineMetadata('middlewares', [authMiddleware, ...existingMiddlewares], target, propertyKey)
}

function authMiddleware(req: any, res: any, next: Function) {
  console.log('Verificando autenticação...')
  next()
}

function loggingMiddleware(req: any, res: any, next: Function) {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
}

class ApiController {
  @UseMiddleware(loggingMiddleware)
  @Route('/public', 'GET')
  getPublicData() {
    return 'Dados públicos'
  }

  @RequireAuth
  @UseMiddleware(loggingMiddleware)
  @Route('/private', 'GET')
  getPrivateData() {
    return 'Dados privados'
  }
}
```

## Principais Métodos da API

### Reflect.defineMetadata()
- **Propósito**: Define metadados em um target/propriedade
- **Sintaxe**: `Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey?)`

### Reflect.getMetadata()
- **Propósito**: Recupera metadados de um target/propriedade
- **Sintaxe**: `Reflect.getMetadata(metadataKey, target, propertyKey?)`

### Reflect.hasMetadata()
- **Propósito**: Verifica se metadados existem
- **Sintaxe**: `Reflect.hasMetadata(metadataKey, target, propertyKey?)`

### Reflect.deleteMetadata()
- **Propósito**: Remove metadados de um target/propriedade
- **Sintaxe**: `Reflect.deleteMetadata(metadataKey, target, propertyKey?)`

## Design Keys Padrão

### design:type
- **Uso**: Tipo da propriedade ou método
- **Exemplo**: `Reflect.getMetadata('design:type', target, propertyKey)`

### design:paramtypes
- **Uso**: Tipos dos parâmetros de um método/construtor
- **Exemplo**: `Reflect.getMetadata('design:paramtypes', target, propertyKey)`

### design:returntype
- **Uso**: Tipo de retorno de um método
- **Exemplo**: `Reflect.getMetadata('design:returntype', target, propertyKey)`

## Boas Práticas

1. **Import sempre no topo**: Importe `reflect-metadata` no ponto de entrada da aplicação
2. **Use símbolos para keys**: Prefira Symbol.for() para chaves de metadados globais
3. **Namespace metadados**: Use prefixos para evitar colisões (ex: 'validation:', 'route:')
4. **Validate metadata**: Sempre verifique se metadados existem antes de usar
5. **Performance**: Cache metadados recuperados quando possível
6. **Type safety**: Use interfaces TypeScript para definir estruturas de metadados

## Integração com Arquitetura Limpa

Na arquitetura limpa do projeto, reflect-metadata é usado principalmente:

- **Dependency Injection**: Container IoC para injeção automática de dependências
- **Decorators**: Sistema de decorators para routes, validação e middlewares
- **Metadata-driven**: Configuração baseada em metadados em vez de código imperativo
- **Framework Integration**: Base para integração com frameworks como InversifyJS
- **Type Information**: Acesso a informações de tipo em runtime para validações

O reflect-metadata é fundamental para implementar padrões avançados de design em TypeScript, especialmente em arquiteturas que fazem uso intensivo de dependency injection e decorators.
