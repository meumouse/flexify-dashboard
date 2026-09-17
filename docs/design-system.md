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
- Escala extra: `text-title-2xl` (72/90), `text-title-xl` (60/72), `text-title-lg` (48/60), `text-title-md` (36/44), `text-title-sm` (30/38), `text-title-xs` (24/32), `text-theme-xl` (20/30), `text-theme-sm` (14/20), `text-theme-xs` (12/18).

| Elemento | Classes |
|---|---|
| Título de página | `text-xl font-semibold text-gray-800 dark:text-white/90` |
| Título de card | `text-lg font-semibold text-gray-800 dark:text-white/90` |
| Valor de métrica | `text-title-sm font-bold text-gray-800 dark:text-white/90` |
| Texto secundário | `text-sm text-gray-500 dark:text-gray-400` |
| Label de formulário | `mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400` |

## Sombras, raios e breakpoints

- Sombras: `shadow-theme-xs|sm|md|lg|xl`, `shadow-focus-ring` (anel de foco com a cor de destaque), `shadow-tooltip`.
- Raios (`--radius: 0.5rem`): botões/inputs `rounded-lg`, tabelas/alertas `rounded-xl`, cards `rounded-2xl`, modais `rounded-3xl`, badges `rounded-full`.
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
| Header | `components/app/toolbar` | `bg-white border-b`, botão para recolher a sidebar, busca (`Ctrl/⌘ K`), barra do WP, alternância claro/escuro e menu do usuário (perfil, site, configurações, tema, sair). |
| Conteúdo | `components/app/wrapper` | Fundo `bg-gray-50 dark:bg-gray-900`. |

> Classes utilitárias **não se aplicam ao próprio elemento** `.flexify-dashboard-isolation` (o escopo vale para descendentes). Use uma regra CSS dedicada, como `.fd-sidebar-container`.
