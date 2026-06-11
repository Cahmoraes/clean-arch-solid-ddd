---
created_at: "2026-06-10T11:32:26-03:00"
updated_at: "2026-06-10T11:32:26-03:00"
---

# Design — Container de Largura na Tela de Login

## Visão Geral

A tela de login (`/login`) não tem um container com `max-width` envolvendo seu conteúdo. Em monitores acima de 1152px, o grid de duas colunas — que contém a sessão "Treine onde você estiver" à esquerda e o formulário de login à direita — cresce infinitamente, ultrapassando os limites visuais do header e do footer da mesma tela.

O header e o footer do `PublicShell` já usam `mx-auto w-full max-w-6xl px-4 sm:px-6` como inner container. A correção consiste em envolver o grid de login no mesmo `max-w-6xl`, centralizando o conteúdo e alinhando sua borda lateral com a do header e footer.

**Escopo:**

| Incluso | Excluído |
|---|---|
| Wrapper `max-w-6xl` na tela `/login` | Outras telas públicas (cadastro, recuperar-senha, redefinir-senha, ativar) |
| | Mudanças em `PublicShell` |
| | Mudanças em cores, tipografia ou layout interno das colunas |
| | Telas autenticadas (já cobertas por `PageContainer`) |

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| **Consistência visual** | O conteúdo da tela de login deve respeitar os mesmos limites laterais do header e footer — a divergência é perceptível em monitores wide | Borda lateral do grid alinhada com `max-w-6xl` do header em qualquer viewport ≥ 1152px |
| **Manutenibilidade** | A correção deve ser mínima e cirúrgica, sem introduzir novos componentes ou alterar o `PublicShell` compartilhado | Mudança limitada a `login/page.tsx`; zero novos arquivos |
| **Não-regressão mobile** | O breakpoint de responsividade `max-[860px]:grid-cols-1` existente não pode ser afetado | Layout de coluna única em viewport ≤ 860px permanece intacto após a mudança |

**Consideradas, não priorizadas:** performance (mudança puramente CSS, impacto nulo), acessibilidade (sem alteração de semântica ou ordem de foco).

---

## Componentes

Nenhum novo componente é criado. A mudança é inline em `LoginForm`, função componente dentro de `login/page.tsx`.

### Antes

```tsx
// apps/frontend/src/app/(public)/login/page.tsx — LoginForm return
<div className="grid min-h-[calc(100vh-8rem)] grid-cols-[1.05fr_1fr] max-[860px]:grid-cols-1">
  <aside ...>...</aside>
  <div ...>...</div>
</div>
```

### Depois

```tsx
<div className="mx-auto w-full max-w-6xl">
  <div className="grid min-h-[calc(100vh-8rem)] grid-cols-[1.05fr_1fr] max-[860px]:grid-cols-1">
    <aside ...>...</aside>
    <div ...>...</div>
  </div>
</div>
```

**Ausência de `px-4 sm:px-6` no wrapper:** os itens de texto do header e footer precisam desse padding porque são flex containers sem padding interno próprio. As colunas do grid (`aside` e o div de formulário) já possuem `p-12` (48px) de padding interno. Adicionar `px-4 sm:px-6` ao wrapper externo criaria dupla indenção lateral, empurrando os elementos além do alinhamento esperado.

---

## Fluxo

```
PublicShell
  <header>
    <div class="mx-auto w-full max-w-6xl px-4 sm:px-6"> ← logo + nav
  <main>
    LoginForm
      <div class="mx-auto w-full max-w-6xl">            ← NOVO: limita o grid
        <div class="grid ...">                            ← grid 2 colunas
          <aside p-12>  Treine onde você estiver        ← coluna hero
          <div p-12>    Formulário de login             ← coluna form
  <footer>
    <div class="mx-auto w-full max-w-6xl px-4 sm:px-6"> ← rodapé
```

---

## Decisões Arquiteturais

### D1. Wrapper div separado em vez de classes adicionadas ao grid

- **Contexto:** A correção pode ser feita adicionando `mx-auto w-full max-w-6xl` ao próprio `div.grid` existente (Abordagem B) ou em um novo `div` envolvente (Abordagem A).
- **Decisão:** Wrapper div separado (Abordagem A).
- **Justificativa técnica:** Separação de responsabilidades: o wrapper externo é "container de largura", o div interno é "layout de grid". Seguir o mesmo padrão do `PageContainer` já estabelecido no projeto.
- **Justificativa de negócio:** Consistência com o padrão existente reduz carga cognitiva na manutenção futura.
- **Trade-offs aceitos:** +1 DOM node sem ganho semântico. Custo aceitável dado o benefício de clareza e consistência.

### D2. Telas públicas restantes fora de escopo

- **Contexto:** As telas de cadastro, recuperar-senha, redefinir-senha e ativar são também públicas e podem ter layouts similares.
- **Decisão:** Fora de escopo nesta feature.
- **Justificativa:** Essas telas usam cards verticalmente centralizados — um padrão distinto do grid 2-colunas do login. O problema de overflow relatado foi específico da tela de login.
- **Trade-offs aceitos:** Se as demais telas públicas tiverem problema semelhante, exigirão uma feature separada.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `max-w-6xl` + `p-12` resultar em coluna de formulário muito estreita em viewports intermediários (ex: 768–860px) | 2 | 1 | 2 🟢 | Verificar visualmente em 768px, 1024px e 1440px após a implementação; o breakpoint 860px que colapsa para 1 coluna já cobre o caso crítico |
| `min-h-[calc(100vh-8rem)]` no grid perder comportamento correto com o wrapper extra | 1 | 1 | 1 🟢 | O wrapper não tem height próprio; o `min-h` continua referenciando 100vh corretamente |

---

## Error Handling

Não aplicável — mudança puramente de layout/CSS, sem novos caminhos de erro, dados ou chamadas de rede.

---

## Testing

- **Visual / manual:** Verificar em viewport 1440px que borda lateral do grid alinha com o header e footer. Verificar em 860px (breakpoint) que o layout de coluna única permanece intacto. Verificar em 1152px (exatamente `max-w-6xl`) que não há overflow.
- **Regressão:** Os testes existentes de `login/page.test.tsx` e `login-volt.test.tsx` devem continuar passando sem alteração — a mudança não afeta comportamento, dados nem semântica dos elementos internos.
- **Gate do projeto:** `pnpm --filter frontend lint:fix` + `tsc:check` + `test` + `build` 100%.
