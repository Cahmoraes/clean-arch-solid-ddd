---
created_at: "2026-08-09T17:31:37-03:00"
updated_at: "2026-08-09T17:31:37-03:00"
---

# Margem lateral no bottom sheet de filtros (mobile)

## Visão Geral

Em resoluções móveis, o painel "Filtros" (bottom sheet) usado nas telas de check-ins e de usuários administrativos não possui padding lateral no corpo — os chips de status e os botões "Limpar"/"Aplicar" ficam colados nas bordas da tela, enquanto o título "Filtros" acima mantém o padding padrão de 16px. Esta feature corrige a inconsistência aplicando o mesmo respiro lateral ao corpo do sheet.

## Características Arquiteturais

**Priorizadas:**

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Consistência visual | Painel usado em 2 telas admin de alto tráfego (usuários, check-ins) | Padding horizontal do corpo (16px) igual ao do header em ambas as telas |
| Manutenibilidade | Evita que um 3º consumidor futuro do `Sheet` repita o mesmo bug | Fix aplicado no componente base, não nos consumidores |

**Consideradas, não priorizadas:** performance (mudança é puramente CSS, sem impacto de runtime).

## Especificação Visual

**Artefato curado:** `mockups/sheet-filtros-mobile-padding-visual.md`

**Fonte de design original:** nenhuma — problema reportado via screenshots do app real; layout de correção validado via mockup do companion de brainstorming.

**Decisões visuais (norte, não pixel-final):**
- Corpo do sheet ganha `px-4` (16px), igual ao padding do header.
- Nenhuma mudança de hierarquia, cor ou componente — só alinhamento de espaçamento.

**Fidelidade:** mudança direta em classes Tailwind do componente base; não há re-derivação de fidelidade na implementação.

## Estrutura de Componentes

Nenhum componente novo. Um único componente base é editado:

- **`apps/frontend/src/components/ui/sheet.tsx`** — `SheetContent`, `SheetHeader` e `SheetFooter`.

Consumidores (não modificados, herdam o fix automaticamente):

- `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- `apps/frontend/src/features/admin/components/user-filter-bar.tsx`

## Decisões Arquiteturais

### D1. Fix no componente base compartilhado `sheet.tsx`, não nos consumidores

- **Contexto:** apenas 2 arquivos consomem `SheetContent` hoje (`check-in-filter-bar.tsx`, `user-filter-bar.tsx`), ambos com o mesmo bug. Alternativas: (A) padding no componente base; (B) `px-4` local em cada wrapper de corpo dos 2 consumidores.
- **Decisão:** opção A — `SheetContent` ganha `px-4`; `SheetHeader` e `SheetFooter` trocam `p-4` por padding vertical apenas (`pt-4 pb-1.5` e equivalente), já que o horizontal passa a vir do pai.
- **Justificativa técnica:** remove a duplicação de padding horizontal entre header/footer e o corpo; protege qualquer consumidor futuro de `Sheet` contra o mesmo bug.
- **Justificativa de negócio:** menor custo de manutenção — um único ponto de correção; segue o precedente já estabelecido no projeto para o mesmo tipo de bug (feature `responsividade-mobile-admin-usuarios`, fix de margem lateral em `dialog.tsx`/`alert-dialog.tsx`).
- **Trade-offs aceitos:** o `px-4` passa a valer também para `side="right"`/`"left"` do `Sheet`, hoje sem uso no projeto — julgado desejável (mesmo raciocínio do precedente), mas é uma mudança de comportamento não observável nos 2 consumidores atuais até que um novo uso apareça.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Padding duplicado remanescente se `SheetHeader`/`SheetFooter` não forem ajustados junto com `SheetContent` | 2 | 2 | 4 🟡 | Task única cobre os 3 elementos (`SheetContent`, `SheetHeader`, `SheetFooter`) na mesma edição |
| Quebra de teste existente que faz snapshot/assert de classes CSS | 1 | 1 | 1 🟢 | Rodar suíte de `check-in-filter-bar.test.tsx` e `user-filter-bar.test.tsx` após a mudança |

## Testes

- Rodar `check-in-filter-bar.test.tsx` e `user-filter-bar.test.tsx` (não devem quebrar — mudança é só de classes, sem alteração de estrutura DOM/comportamento).
- Verificação manual em viewport mobile (≤414px) nas duas telas (Usuários, Check-ins), comparando com o "Depois" aprovado no artefato de mockup.
