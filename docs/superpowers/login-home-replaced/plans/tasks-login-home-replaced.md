# Tarefas: Login e Home Replaced

**Spec:** `../specs/login-home-replaced-design.md`

**PRD:** `../prd/prd-login-home-replaced.md`

---

## Tarefas

- [ ] 1. Tema Pôr do sol (tokens, provider, variantes dark e chart) → `task-01.md`
- [ ] 2. ThemeToggle de 3 estados com ícone Sunset → `task-02.md`
- [ ] 3. Preferência de movimento e MotionToggle → `task-03.md`
- [ ] 4. Toggles de tema e movimento no header público → `task-04.md`
- [ ] 5. Cena pixel sunset e sol em faixas → `task-05.md`
- [ ] 6. PixelTrail: rastro de pixels em Canvas2D → `task-06.md`
- [ ] 7. Boot de terminal, pixel-hover e script pré-paint → `task-07.md`
- [ ] 8. Login imersivo: textos, rastro, boot e hover → `task-08.md`
- [ ] 9. Home pública: hero sunset, textos e features → `task-09.md`
- [ ] 10. E2E de desempenho, pausa e boot por sessão → `task-10.md`

## Restrições Globais

- Nenhuma dependência nova no frontend (spec, "Características Arquiteturais": "Nenhuma dependência nova; `PixelTrail` em Canvas2D puro, carregado só nas duas telas")
- Título e formulário visíveis no primeiro frame (sem `opacity:0` nem clip total). Em repouso, 0 eventos `Layout` e no máximo 5 `Paint` em 3s (`scene-performance.spec.ts`). `PixelTrail` sem rAF ativo quando o rastro some
- Pares de texto do tema `sunset` com AA (4.5:1 texto, 3:1 UI). `prefers-reduced-motion` ou pausa ativa desligam boot, rastro e cenas
- `theme`: `"light" | "dark" | "sunset" | "system"`; um valor desconhecido cai no `defaultTheme="dark"`
- `volt:scene-motion-paused` (`localStorage`): `"true"` significa pausado; ausente ou qualquer outro valor significa animar
- `volt:boot-played` (`sessionStorage`): presença significa que o boot já tocou nesta aba
- Os `data-testid` (`cta-signup`, `cta-login`, `login-submit`, `login-hero-mobile`) e os rótulos dos campos permanecem
- Boot em até ~600ms no total, em `steps()`, uma vez por sessão
- Textos exatos: tabela "Textos" da spec (ex.: "Sua cidade inteira é **sua academia**.", "Qualquer academia. Um **check-in**.")

## Foco de Revisão

- Trocar de Pôr do sol para Neon ou Neblina remove a classe `.sunset` do `<html>` (sem mistura de tokens) → `task-01`
- `localStorage` bloqueado: o botão de pausa ainda alterna em memória e nada lança exceção → `task-03`
- `PixelTrail` não deixa rAF agendado depois que as células somem, nem desenha com a pausa ativa → `task-06`
- O boot nunca começa com o título ou o formulário ocultos, e não toca com `data-motion-paused` ou reduced motion → `task-07`
- Recarregar na mesma aba não repete o boot; aba nova repete → `task-10`
