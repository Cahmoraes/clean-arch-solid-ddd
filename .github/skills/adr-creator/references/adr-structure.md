# Estrutura e Referência de ADR

## Template completo

```markdown
ADR{ID} — {Título Descritivo e Afirmativo}

- Status: {Rascunho | Proposto | Aceito | Desativado}
- Data: {dd/mm/aaaa}
- Autor: {Nome Completo ou Equipe} <{email}>

---

## Decisão

{Frase concisa, afirmativa e sem ambiguidade sobre o que foi decidido. Menciona qual opção foi escolhida.}

## Contexto

{Circunstâncias, forças, restrições e motivações que levaram à decisão. Explica por que a decisão é importante.}

## Opções Consideradas

- **Opção A** — {descrição}
  - Prós: {lista}
  - Contras: {lista}

- **Opção B** — {descrição}
  - Prós: {lista}
  - Contras: {lista}

## Consequências

- ✅ Positivo: {impacto positivo}
- ❌ Negativo: {impacto negativo ou risco}

## Recomendações

- {Nome} ({Papel}) — {data} — {recomendação ou pergunta feita}
```

---

## Orientações por campo

### Título
- Deve ser **descritivo, afirmativo e claro**, resumindo a essência da decisão
- ✅ Bom: *"Adotar Nanoid para geração de IDs curtos de inventário"*
- ❌ Ruim: *"IDs de inventário"*

### ID
- Deve ser **único e sequencial** (ADR001, ADR002, ...)
- O ID consta no título para facilitar navegação e referência cruzada

### Data
- Corresponde à **data da última alteração** do ADR
- Se o status é *Aceito*, representa quando a decisão foi efetivamente tomada

### Autor
- Nome completo ou nome da equipe/squad + e-mail de contato

### Decisão
- Concisa, afirmativa, declarativa, sem ambiguidade
- Sem detalhes de implementação — apenas qual opção foi escolhida

### Contexto
- Reúne fatos, circunstâncias e forças que moldaram a decisão
- Explica por que a decisão é importante e o que estava na mente dos responsáveis

---

## Exemplo completo real

```markdown
ADR002 — Redução do Tamanho dos IDs de Inventário com Nanoid

- Status: Aceito
- Data: 25/03/2020
- Autor: Wisen Tanasa <wisen@exemplo.com>

---

## Decisão

Criaremos IDs de inventário mais curtos com letras e números gerados aleatoriamente (opção 1), utilizando a biblioteca Nanoid com as seguintes configurações:

- **Building ID:** comprimento 6, caracteres: `23456789ABCDEFGHJKMNPQRSTUVWXYZ`
- **Space ID:** comprimento 8, caracteres: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`
- **Supplier ID:** comprimento 5, caracteres: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`

## Contexto

Atualmente nossos IDs de inventário são UUIDs longos (ex: `22cadcb6-00e5-4baa-a701-785854fc2a9e`). À medida que escalamos, a experiência do usuário é prejudicada: IDs longos dificultam digitação direta na URL e compartilhamento sem encurtadores.

Critérios de decisão:
- Curto e fácil de comunicar
- Baixa probabilidade de colisão
- Clareza visual (sem confusão entre `0` e `O`)
- Custo baixo de implementação

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Nanoid com letras e números aleatórios
  - Prós: sem infraestrutura extra, compatível com arquitetura serverless, baixíssima chance de colisão
  - Contras: possibilidade remota de gerar palavras ofensivas

- **Opção 2** — ID sequencial automático
  - Prós: garante unicidade
  - Contras: exige nova infraestrutura, incompatível com serverless

- **Opção 3** — ID gerado manualmente
  - Prós: zero colisões, zero palavras ofensivas
  - Contras: exige intervenção humana excessiva

- **Opção 4** — Nanoid "bonito" (caracteres esteticamente agradáveis)
  - Contras: não encontramos biblioteca de código aberto adequada

- **Opção 5** — Combinação nome do edifício + ID gerado
  - Contras: adicionar slug resolve o mesmo problema com menos complexidade

## Consequências

- ✅ Positivo: IDs curtos melhoram UX — fáceis de digitar e compartilhar
- ✅ Positivo: sem necessidade de nova infraestrutura
- ✅ Positivo: compatível com arquitetura serverless existente
- ❌ Negativo: probabilidade remota de geração de palavras ofensivas (considerada aceitável)

## Recomendações

- Monira R. (Gerente de Produto) — 25/08/2024 — Consideramos a possibilidade de palavras ofensivas serem geradas automaticamente?
- Hanna A. (Infraestrutura) — 24/08/2024 — Qual a probabilidade de colisão em cada opção? Considerar geração em banco de dados para garantir unicidade.
- Rebecca F. (UX) — 25/08/2024 — O ID precisa ter significado semântico ou apenas ser legível?
- Pete H. (Segurança) — 25/08/2024 — IDs serão expostos publicamente? Avaliar vazamento de padrões internos.
- Alina B. (Arquiteta) — 24/08/2024 — Verificar licenciamento das bibliotecas — custos e manutenção ativa.
```
