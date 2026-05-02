# ADR001 — Implementar Decodificação JWT Manual no Frontend

- Status: Aceito
- Data: 02/05/2026
- Autor: Caique Moraes

---

## Decisão

Implementaremos a decodificação de tokens JWT manualmente no frontend (`src/lib/jwt.ts`) utilizando APIs nativas do navegador (`atob`) e do Node.js (`Buffer`), sem dependência de bibliotecas externas como `jwt-decode`, `jose` ou `jsonwebtoken`.

## Contexto

O frontend precisa extrair claims do access token JWT (sub, role, exp) para hidratar o auth-store Zustand e controlar acesso baseado em roles. O token é emitido e verificado exclusivamente pelo backend — o frontend **nunca valida a assinatura**, apenas lê o payload.

Forças e restrições que moldaram a decisão:

- O frontend executa apenas **decode** (leitura do payload base64), não **verify** (validação criptográfica da assinatura)
- O backend emite tokens com dois formatos de payload: flat (`sub: string, role: string`) e nested (`sub: { id, email, role }`) — é necessária normalização customizada
- A validação dos claims é simples: apenas 3 campos com tipos primitivos (`sub: string`, `role: "MEMBER" | "ADMIN"`, `exp: number`)
- O projeto prioriza bundle size mínimo e zero dependências desnecessárias

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Implementação manual com APIs nativas
  - Prós: zero dependências, bundle mínimo (~100 linhas), normalização customizada dos dois formatos de payload do backend, sem código de verificação criptográfica desnecessário
  - Contras: manutenção interna do código de decode, precisa de testes próprios

- **Opção 2** — Biblioteca `jwt-decode` + Zod para validação
  - Prós: biblioteca madura e testada pela comunidade, schema Zod reutilizável
  - Contras: dependência externa para algo trivial (~20 linhas de decode), Zod é overkill para 3 campos primitivos, não resolve a normalização de formatos customizada do backend

- **Opção 3** — Biblioteca `jose` (completa)
  - Prós: spec-compliant, suporta decode e verify, boa tipagem TypeScript
  - Contras: peso significativamente maior no bundle (inclui toda a stack criptográfica), API complexa para um caso de uso simples, verificação de assinatura desnecessária no frontend

## Consequências

- ✅ Positivo: Zero dependências externas — elimina riscos de supply chain e vulnerabilidades transitivas
- ✅ Positivo: Bundle size mínimo — apenas ~100 linhas de código puro
- ✅ Positivo: Normalização flexível — suporta ambos os formatos de payload do backend sem acoplamento a uma estrutura fixa
- ✅ Positivo: Testes unitários cobrindo ambos os formatos e edge cases (tokens malformados, claims inválidos)
- ❌ Negativo: Manutenção interna — alterações no formato do JWT exigem atualização manual do decoder
- ❌ Negativo: Se a complexidade crescer (mais claims, validação de múltiplos token types), a solução pode precisar ser revisitada em favor de `jwt-decode` + Zod

## Recomendações

- Se no futuro o número de claims extraídos crescer significativamente ou novos formatos de token forem introduzidos, reavaliar a migração para `jwt-decode` + schema Zod para centralizar validação
- Manter a responsabilidade de verificação de assinatura exclusivamente no backend — o frontend deve tratar o token como opaco do ponto de vista de segurança
