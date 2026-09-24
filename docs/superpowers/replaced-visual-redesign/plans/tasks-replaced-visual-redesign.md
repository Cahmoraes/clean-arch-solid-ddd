# Tarefas: Replaced Visual Redesign

**Spec:** `../specs/replaced-visual-redesign-design.md`

**PRD:** `../prd/prd-replaced-visual-redesign.md`

---

## Tarefas

- [x] 1. Tokens Noite neon nos temas escuro e claro → `task-01.md`
- [x] 2. Contraste calculado dos tokens nos dois temas → `task-02.md`
- [x] 3. BrandMark em pixel e sidebar escura nos dois temas → `task-03.md`
- [x] 4. Trocar cores literais por tokens semânticos → `task-04.md`
- [x] 5. Hook useSceneMotion com pausa, movimento reduzido e visibilidade → `task-05.md`
- [x] 6. MotionToggle nos dois shells → `task-06.md`
- [x] 7. Componente PixelScene estático com fallback de erro → `task-07.md`
- [x] 8. Animação das cenas com transform e opacity → `task-08.md`
- [x] 9. Cenas no login e no hero do dashboard → `task-09.md`
- [x] 10. Cena no estado vazio → `task-10.md`
- [x] 11. Capa de academia sem imagem usa cena → `task-11.md`
- [x] 12. Tela de Usuários na direção Noite neon → `task-12.md`
- [x] 13. Tela de Check-ins na direção Noite neon → `task-13.md`
- [x] 14. Tela de Academias na direção Noite neon → `task-14.md`
- [x] 15. Passada de paleta nas demais telas → `task-15.md`
- [x] 16. Acessibilidade axe nos dois temas no Playwright → `task-16.md`
- [x] 17. Medição de paint das cenas no Playwright → `task-17.md`
- [x] 18. Gate final e entrega por ondas → `task-18.md`

## Restrições Globais

- Componentes usam só tokens semânticos; nenhuma cor literal nova em componente (spec, Características Arquiteturais)
- Glow só em bordas e formas; nunca em texto (spec, D2)
- Animação só com `transform` e `opacity` (spec, Características Arquiteturais)
- Texto >= 4.5:1 e componentes >= 3:1 nos dois temas (spec, Características Arquiteturais)
- `PixelScene` é `aria-hidden`; valores fixos, sem `Math.random()` no render (spec, Componentes e Riscos)
- Preferência de pausa guardada no navegador do usuário; ausência ou falha de leitura significa "animar" (spec, Fronteiras e Contratos)
- Fontes seguem Space Grotesk, Inter e JetBrains Mono (spec, Decisões locais)

## Foco de Revisão

- Armazenamento local indisponível ou bloqueado (leitura ou escrita lança exceção) → cena anima, sem exceção, e o toggle funciona na sessão → `task-05`
- `matchMedia` ausente no ambiente → tratado como sem preferência de movimento reduzido, sem exceção → `task-05`
- `IntersectionObserver` ausente → cena tratada como visível, sem exceção → `task-05`
- Cena inválida ou erro ao renderizar `PixelScene` → tela normal com fundo liso, sem quebrar a página → `task-07`
- Chave de imagem da academia vazia ou só com espaços → fallback de cena; chave válida → imagem prevalece → `task-11`
