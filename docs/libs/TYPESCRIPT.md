# TypeScript

## Visão Geral

TypeScript é um superset do JavaScript que adiciona tipagem estática opcional. No projeto, está configurado com decoradores experimentais e emissão de metadados para suportar injeção de dependências com Inversify.

## Configuração no Projeto

### TypeScript Version
- **Versão**: 5.8.3
- **Build Tool**: tsup para produção, tsx para desenvolvimento
- **Target**: ESNext
- **Module System**: ESNext (módulos ES)

### tsconfig.json Principal
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

### Configuração de Decoradores Experimentais
```typescript
// Para usar decoradores com injeção de dependências
import 'reflect-metadata'

@injectable()
export class UserService {
  constructor(
    @inject('UserRepository') private userRepository: UserRepository
  ) {}
}
```

## Padrões de Uso

### 1. Tipos Customizados
```typescript
// @types/custom.d.ts
export interface User {
  id: string
  email: string
  name: string
  created_at: Date
  updated_at: Date
}

export interface CreateUserDTO {
  name: string
  email: string
  password: string
}
```

### 2. Utility Types
```typescript
// @types/optional.d.ts
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

// Uso
type UserUpdate = Optional<User, 'id' | 'created_at' | 'updated_at'>
```

### 3. Configuração de Decoradores
```typescript
// Para classes de serviço
@injectable()
export class CheckInService {
  constructor(
    @inject('CheckInRepository') private checkInRepository: CheckInRepository,
    @inject('GymRepository') private gymRepository: GymRepository
  ) {}
}

// Para controladores
@controller('/users')
export class UserController {
  @httpPost('/')
  async create(@request() req: Request, @response() res: Response) {
    // implementação
  }
}
```

## Configuração de Build

### Desenvolvimento
```bash
# Execução em desenvolvimento com tsx
npm run dev
# tsx watch --env-file=.env src/main.ts
```

### Produção
```bash
# Build com tsup
npm run build
# tsup src --out-dir build
```

### tsup.config.ts
```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src'],
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'build'
})
```

## Integração com Outras Tecnologias

### 1. Com Fastify
```typescript
// Tipagem para plugins Fastify
declare module 'fastify' {
  interface FastifyInstance {
    container: Container
  }
}
```

### 2. Com Prisma
```typescript
// Prisma Client tipado automaticamente
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
// TypeScript infere todos os tipos automaticamente
```

### 3. Com Vitest
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
})
```

## Recursos Avançados

### 1. Metadados de Decoradores
```typescript
import 'reflect-metadata'

// Permite reflexão em runtime para injeção de dependências
const metadata = Reflect.getMetadata('design:paramtypes', UserService)
```

### 2. Strict Mode
- `strict: true` habilitado para máxima segurança de tipos
- `forceConsistentCasingInFileNames: true` para consistência
- `noEmit: true` pois usa tsup para build

### 3. Module Resolution
- `moduleResolution: "node"` para compatibilidade com Node.js
- `esModuleInterop: true` para interoperabilidade com CommonJS
- Path mapping configurado para imports absolutos com `@/*`

## Benefícios no Projeto

1. **Type Safety**: Detecção de erros em tempo de compilação
2. **IntelliSense**: Autocompletar melhorado no editor
3. **Refactoring**: Renomeação segura de símbolos
4. **Documentação**: Tipos servem como documentação viva
5. **DI Container**: Suporte robusto para injeção de dependências

## Comandos Úteis

```bash
# Verificação de tipos
npx tsc --noEmit

# Build de produção
npm run build

# Desenvolvimento com hot reload
npm run dev

# Linting com TypeScript
npm run lint
```

## Links de Referência

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [tsconfig.json Reference](https://www.typescriptlang.org/tsconfig)
- [Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
