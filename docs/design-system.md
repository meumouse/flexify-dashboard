# Design System

O Flexify Dashboard segue o design system do [TailAdmin](https://github.com/TailAdmin/vue-tailwind-admin-dashboard) (edição gratuita, MIT), adaptado para cores personalizáveis. Os tokens ficam em `app/src/assets/css/tailwind.css` (utilitários) e `app/src/assets/css/globals.css` (valores padrão). A arquitetura de build está em [arquitetura-css.md](arquitetura-css.md).

## Cores

### Personalizáveis (Configurações → Tema)

| Utilitário | Variável | Padrão |
|---|---|---|
| `brand-25 … brand-950` | `--fd-accent-*` | escala de `#008aff` |
| `gray-0 … gray-950` | `--fd-base-*` | cinza do TailAdmin (`#101828` no 900) |

As variáveis guardam canais RGB (`--fd-accent-500: 0 138 255`) e são impressas pelo PHP em todo carregamento (`Utility\ThemeTokens`). Use sempre os utilitários (`bg-brand-500`, `text-gray-700`, `bg-brand-500/10`).

> **Aliases legados:** `zinc-*` → `gray-*` e `indigo-*` → `brand-*`. Não use em código novo.

### Semânticas (fixas)

| Uso | Escala | Principal |
|---|---|---|
| Sucesso | `success-25 … 950` | `success-500 #12b76a` |
| Erro | `error-25 … 950` | `error-500 #f04438` |
| Alerta | `warning-25 … 950` | `warning-500 #f79009` |
| Informação | `blue-light-25 … 950` | `blue-light-500 #0ba5ec` |
| Laranja | `orange-25 … 950` | `orange-500 #fb6514` |
| Outras | `gray-dark #1a2231`, `theme-pink-500`, `theme-purple-500` | |

## Tipografia

- Fonte padrão: **Outfit** (auto-hospedada). A fonte pode ser trocada nas configurações (`--fd-font-sans`).
- Escala: `text-title-2xl` (72/90), `text-title-xl` (60/72), `text-title-lg` (48/60), `text-title-md` (36/44), `text-title-sm` (30/38), `text-title-xs` (24/32), `text-theme-xl` (20/30), `text-theme-lg` (18/28), `text-theme-md` (16/24), `text-theme-sm` (14/20), `text-theme-xs` (12/18), `text-theme-2xs` (10/14).
- **É a única escala.** A crua do Tailwind (`text-sm`, `text-base`, `text-2xl`…) não se usa, e `app/src/react/ui/scales.test.ts` falha se ela aparecer. Tamanho por tag (`h1`–`h6`, `p`, `small`) em [AGENTS.md](../AGENTS.md).

| Elemento | Classes |
|---|---|
| Título de página | `text-theme-xl font-semibold text-gray-800 dark:text-white/90` |
| Título de card | `text-theme-md font-semibold text-gray-800 dark:text-white/90` |
| Valor de métrica | `text-title-sm font-bold text-gray-800 dark:text-white/90` |
| Texto secundário | `text-theme-sm text-gray-500 dark:text-gray-400` |
| Label de formulário | `mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-400` |

## Sombras, raios e breakpoints

- Sombras: `shadow-theme-xs|sm|md|lg|xl`, `shadow-focus-ring` (anel de foco com a cor de destaque), `shadow-tooltip`.
- Raios (`--radius: 0.5rem`), quatro valores: badges pequenos `rounded-sm`, botões/inputs `rounded-lg`, blocos dentro de card `rounded-xl`, cards e modais `rounded-2xl`, e `rounded-full` só para avatar e indicador circular. Variar o lado de um valor da escala (`rounded-t-2xl`) é permitido; outro valor, não.
- Breakpoints extras: `2xsm` (375px), `xsm` (425px), `3xl` (2000px).

## Modo escuro

A classe `.dark` no `<html>` ativa as variantes `dark:`.

| Superfície | Claro | Escuro |
|---|---|---|
| Fundo da página | `bg-gray-50` | `dark:bg-gray-900` |
| Card | `bg-white border-gray-200` | `dark:bg-white/[0.03] dark:border-gray-800` |
| Sidebar/header/modal | `bg-white` | `dark:bg-gray-900` |
| Dropdown/popover | `bg-white` | `dark:bg-gray-dark` |
| Texto principal | `text-gray-800` | `dark:text-white/90` |
| Divisórias | `border-gray-100` | `dark:border-gray-800` |

## Gráficos

Use `useChartTheme()` (`app/src/composables/useChartTheme.js`) para herdar fonte, grade, eixos, tooltip e a paleta (reage ao modo escuro e à cor de destaque):

```js
const { chartOptions } = useChartTheme();
const options = computed(() => chartOptions({ xaxis: { categories: labels.value } }));
```

## Extensões (React/Vue)

As variáveis `--fd-accent-*`, `--fd-base-*` e `--fd-font-sans` são públicas e podem ser usadas por cards e componentes de terceiros: `color: rgb(var(--fd-accent-500))`. O filtro PHP `flexify-dashboard/theme/tokens` permite ajustar as declarações.

## Layout

| Área | Implementação | Regras |
|---|---|---|
| Sidebar | `components/app/menu` | 290 px expandida / 90 px recolhida; recolhida expande ao passar o mouse (sobrepõe o conteúdo). Abaixo de `lg` vira painel lateral (`FdSheet`) aberto pelo botão de menu. Redimensionamento opcional em **Configurações → Menu → Resizable sidebar** (`sidebar_resizable`). |
| Itens de menu | `MenuItemLink`, `SubMenuItem` | Ativo `bg-brand-50 text-brand-500`, inativo `text-gray-700 hover:bg-gray-100`; submenu recuado `ms-9`; contadores em badge `brand`. |
| Header | `components/app/toolbar` | `bg-white border-b`, botão para recolher a sidebar, busca (`Ctrl/⌘ K`), barra do WP desenhada a partir de `WP_Admin_Bar`, alternância claro/escuro e menu do usuário (perfil, site, configurações, tema, sair). |
| Conteúdo | `components/app/wrapper` | Fundo `bg-gray-50 dark:bg-gray-900`. |

> Classes utilitárias **não se aplicam ao próprio elemento** `.flexify-dashboard-isolation` (o escopo vale para descendentes). Use uma regra CSS dedicada, como `.fd-sidebar-container`.

## Telas nativas do WordPress

`app/src/apps/css/theme.css` é carregado em todo o wp-admin e estiliza as telas que não são Vue:

- `theme/wp-admin-legacy.css` — regras herdadas (dashboard, site health, metaboxes, integrações de plugins).
- `theme/tailadmin-wp.css` — receitas do TailAdmin para títulos, botões (`.button`, `.button-primary`, `.page-title-action`), campos, avisos (`.notice`), abas (`.nav-tab`), tabelas (`.wp-list-table`), metaboxes (`.postbox`) e WooCommerce (`mark.instock`, `mark.order-status`, abas de dados do produto).

Todas as regras ficam na camada `fd-theme` e usam `:not(:where(.flexify-dashboard-isolation *))` para não afetar os apps Vue. A ordem das camadas é `wordpress-base < base < fd-theme < theme < components < utilities < fd-isolation`, declarada em `globals.css` e em `Plugin::layer_wordpress_styles()`.
