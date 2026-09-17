# Arquitetura CSS

O frontend (`app/`) usa **Tailwind CSS v4** com o plugin `@tailwindcss/vite` e um plugin PostCSS próprio (`app/build/postcss-scope-layers.js`) que isola o CSS gerado do CSS nativo do WordPress.

## Arquivos

| Arquivo | Função |
|---|---|
| `app/src/assets/css/tailwind.css` | Configuração do Tailwind: tokens (`@theme`), variante `dark`, utilitários personalizados. **Não emite CSS** — pode ser usado com `@reference` em blocos `<style>` dos componentes Vue. |
| `app/src/assets/css/globals.css` | Variáveis globais (`--fd-base-*`, `--fd-accent-*`, tokens semânticos) e regras base. |
| `app/src/apps/css/_base.css` | Base de todos os apps Vue: preflight + utilitários escopados em `.flexify-dashboard-isolation`. |
| `app/src/apps/css/theme.css` | Carregado em todo o wp-admin: utilitários escopados em `#fd-body-holder` + estilos das telas nativas. |
| `app/src/apps/css/theme/*.css` | Estilos das telas nativas do WordPress/plugins dentro de `@layer fd-theme`. |

## Camadas e escopo

```
@layer wordpress-base   ← CSS do WordPress e de plugins (reescrito pelo PHP em Plugin::layer_wordpress_styles)
@layer fd-theme         ← theme.css (utilitários prefixados com #fd-body-holder + telas nativas)
@layer properties, base
@layer fd-isolation     ← apps Vue (preflight e utilitários prefixados com :where(.flexify-dashboard-isolation))
```

Regras escritas dentro de `@layer fd-isolation-scope` ou `@layer fd-theme-scope` são prefixadas pelo plugin PostCSS e movidas para `fd-isolation`/`fd-theme`:

- `:where(.space-y-2 > :not(:last-child))` → `:where(#fd-body-holder .space-y-2 > :not(:last-child))`
- `.hover\:bg-zinc-100:hover` → `:where(.flexify-dashboard-isolation) .hover\:bg-zinc-100:hover`
- seletores de elemento (preflight) recebem o prefixo no início.

## Tokens em tempo de execução

As cores são variáveis RGB definidas em `:root` e sobrescritas pelas configurações:

- `zinc-*` → `rgb(var(--fd-base-*))`
- `brand-*` e `indigo-*` → `rgb(var(--fd-accent-*))`
- `rounded-sm|md|lg|xl` → derivados de `--radius`
- `font-sans` → `var(--fd-font-sans)`

## Build

```bash
npm run build --prefix app
```
