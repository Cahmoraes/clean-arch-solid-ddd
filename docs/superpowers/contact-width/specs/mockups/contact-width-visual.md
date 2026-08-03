# Mockup visual: Ajuste de largura da seção de contato

## Descrição

A seção "Fale conosco" (ContactSection) deve ter a mesma largura máxima da seção "Escolha seu plano" (PlansSectionHero).

## Referência visual

- A seção de planos usa `className="mx-auto w-full max-w-xl"`.
- A seção de contato deve espelhar essa configuração.

## Comportamento esperado

- Em telas grandes: a seção de contato fica centralizada com largura máxima de `max-w-xl` (576px no scale padrão do Tailwind).
- Em telas menores que `max-w-xl`: a seção ocupa 100% da largura disponível (`w-full`), preservando responsividade.
- O heading, o formulário e os cards de informação ficam contidos dentro do mesmo bloco limitado.

## Escopo

- Apenas o componente `apps/frontend/src/features/contact/components/contact-section.tsx` é alterado.
- Nenhum outro componente, página ou estilo global deve ser modificado.
