# Planejamento — Design System TailAdmin + Gestão WooCommerce

> Documento de planejamento. Versão alvo sugerida: **3.0.0** (mudança visual ampla).
> Referências: [TailAdmin Vue (MIT)](https://github.com/TailAdmin/vue-tailwind-admin-dashboard), [demo](https://demo.tailadmin.com/).

---

## 1. Diagnóstico do estado atual

### 1.1 Frontend (`app/`)
| Tema | Situação encontrada | Impacto |
|---|---|---|
| **Tailwind** | `package.json` instala **v3.4.19**, mas o código foi escrito para **v4**: 9 arquivos `.vue` usam `@reference "@/assets/css/tailwind.css"` (arquivo **inexistente**) e o `src/apps/styles/theme.css` versionado foi compilado com **v4.1.18**. | Build atual não reproduz o CSS em produção. **Bloqueante.** |
| **Tokens** | `tailwind.config.js` define só `brand-*` → `--fd-accent-*` e `primary`. O tema v4 perdido mapeava `zinc-*` → `--fd-base-*`, `font-sans` → `--fd-font-sans`, tokens shadcn (`--background`, `--card`…). | `bg-background`, `bg-muted`, `flexify-dashboard-isolation` etc. não existem mais no build v3. |
| **CSS por página** | 17 entradas Vite; cada uma importa `_base.css` com `@tailwind base/components/utilities`. | Preflight + utilitários duplicados em cada bundle. |
| **`theme.css`** (telas nativas do WP) | 87 linhas manuais + ~318 KB de CSS compilado numa única linha, sem fonte. Carregado em todo o admin com `@layer fd-theme` (PHP reordena CSS do WP em `@layer wordpress-base`). | Não pode ser recompilado — precisa ser reescrito. |
| **Cores fixas** | `zinc-*`: **6.017** ocorrências em 176 arquivos. `brand-*`: 566. `red/green/amber/blue`: ~850. Hex arbitrários `[#24303f]`, `[#1c2434]`, `[#2e3a47]`… (tokens do TailAdmin v1): 99. 55 arquivos com `<style>`. | Re-skin por aliasing de tokens é obrigatório; reescrita manual não escala. |
| **Dark mode** | Classe `.dark` em `html` e `body` (`components/app/wrapper`), preferência em `localStorage.uipc_theme`, `force_global_theme`. `dark:` usado 3.711 vezes. `theme.css` força `#24303f !important`. 12 cópias idênticas de `useDarkMode.js`. | Compatível com TailAdmin (`.dark`). Limpeza necessária. |
| **Cor de destaque** | `accent_theme_color` (padrão `#008aff`) → `generateColorScheme.js` gera escala 50–950. Hoje a escala só é aplicada em runtime quando o dropdown do `UserDetails` abre. | Bug: `brand-*` depende de CSS externo. |
| **Fonte** | Nenhuma embutida; `--fd-font-sans` via PHP (`Plugin.php` → `output_custom_font_css`), fonte customizável nas configurações. | Outfit vira padrão, mantendo customização. |
| **Shadow DOM** | Só toolbar do frontend e drawer mobile do menu usam shadow root (estilos copiados por `adoptedStyleSheets`). Vários imports mortos. | Tokens precisam ser variáveis CSS (herdam para dentro do shadow root). |
| **Componentes** | Biblioteca própria em `components/utility` com classes inline, sem variantes. Duplicações: 4 checkboxes, 2 drawers, 2 media libraries, `woocommerce-customer` duplicado, pastas órfãs `src/cards`, `src/custom-renders`, `src/sections`. | Consolidar durante a Fase 2. |
| **Layout** | Sidebar escura `#1c2434`, 240 px redimensionável (160–360), minimizada `auto`; toolbar `bg-zinc-50`. | TailAdmin: sidebar clara 290/90 px, header branco sticky. |
| **Gráficos** | ApexCharts em 3 cards; cores vindas do PHP (`rgb(0,138,255)`) e fallbacks JS; tema de tooltip lido uma vez (não reage ao dark mode). | Criar preset de tema reativo. |
| **Ícones** | 298 SVGs estilo Material Symbols usados como `mask` + `currentColor`. | Mantidos (compatíveis com `fill-current`). |
| **React** | `veaury` permite extensões React em toolbar/sidebar/cards. | Tokens precisam existir como variáveis CSS públicas. |

### 1.2 Backend (`admin/src/`)
- Padrão de substituição de tela nativa (`PostsList`, `CustomUsersPage`…): `load-{tela}.php` → checa capacidade + `Settings::is_enabled('use_modern_*')` → `ob_start` em `in_admin_header` → descarta buffer em `admin_footer` → imprime `<div id="fd-*-page">` → `<script type="module">` do bundle via manifest (`Utility/Scripts.php`).
- Dados para o JS vão por atributos de `<script>` (`#fd-script` + seletor secundário lido em `app/src/setup/setGlobalProperties.js`).
- REST: namespace `flexify-dashboard/v1`, permissão via `RestPermissionChecker::check_permissions()`; front usa `lmnFetch` (lê `X-WP-Total`).
- **WooCommerce hoje:** cards de ecommerce no dashboard (`Rest/WooCommerceDashboard.php`, que usa `wc_get_orders(limit => -1)`, sem paginação) e painel de cliente na tela de usuários (`wc/v3`). **Produtos são explicitamente ignorados** em `PostsList::init_posts_page()` e **não há nada para pedidos**.
- `admin/composer.json` usa `classmap-authoritative`: **toda classe nova exige `composer dump-autoload -o`**.
- Configuração nova exige 3 pontos: `Default_Options`, `GlobalOptions` (schema REST + sanitize) e `app/src/pages/settings/src/settings-config.js`.
- Sem testes, lint ou padrão de código configurados.
- Achado paralelo: o rótulo de `use_classic_post_tables` em `settings-config.js` parece invertido em relação ao PHP.

---

## 2. Decisões de arquitetura (recomendadas)

| # | Decisão | Recomendação | Motivo |
|---|---|---|---|
| D1 | Versão do Tailwind | **Migrar para Tailwind v4** (`@tailwindcss/vite`) | O código já está em v4, o CSS em produção é v4 e o TailAdmin é v4 (`@theme`). |
| D2 | Estratégia de re-skin | **Aliasing de tokens primeiro, codemod depois**: `zinc-*` passa a resolver para a escala `gray` do TailAdmin; depois um codemod troca `zinc` → `gray` arquivo a arquivo. | Troca visual imediata em 6 mil ocorrências sem big-bang. |
| D3 | Cor de destaque | Paleta **`brand` do TailAdmin (`#465fff`) como padrão**, mantendo a personalização (`--fd-accent-*`), aplicada via `<style>` inline no PHP em todo carregamento. | Preserva recurso existente e corrige o bug de aplicação. |
| D4 | Cor base | `--fd-base-*` com valores da escala `gray` do TailAdmin como padrão. | Mesmo mecanismo, novo padrão. |
| D5 | Fonte | **Outfit auto-hospedada** (woff2 400/500/600/700) como padrão; configuração de fonte customizada continua valendo. | Performance/LGPD (sem Google Fonts por padrão). |
| D6 | Layout | Sidebar clara 290 px / 90 px (expande no hover), header branco sticky, container `max-w-[1536px] p-4 md:p-6`. Redimensionador de painel: **removido** (ou opcional atrás de configuração). | Fidelidade ao TailAdmin. |
| D7 | Licença | Tokens e receitas do **TailAdmin free (MIT)** podem ser reutilizados com o aviso MIT em `licence.md`. Páginas **Pro** (products-list, invoices, transactions…) servem **só como referência de layout** — não copiar markup. | Conformidade. |
| D8 | API WooCommerce | **`wc/v3` para CRUD** (produtos, variações, categorias, pedidos, notas, reembolsos — já compatível com HPOS e permissões) + **endpoints `flexify-dashboard/v1` para agregados** (contagens por status, métricas, ações em massa, payloads enxutos). | Menos código próprio, compatibilidade com o ecossistema. |
| D9 | Escopo de edição | v1: **listas + edição rápida + detalhe de pedido em Vue**; editor completo de produto e criação manual de pedido continuam no editor nativo (reestilizado), com editor Vue numa fase posterior. | Metaboxes/abas de plugins terceiros (frete, NF-e, marketplaces) só aparecem no editor nativo. |
| D10 | Ativação | Novas telas atrás de toggles `use_modern_products_page` / `use_modern_orders_page`, com link “Abrir na tela padrão do WooCommerce”. | Rollback seguro. |

---

## 3. Fases

Tamanho relativo: **P** (pequeno) · **M** (médio) · **G** (grande) · **GG** (muito grande).

### Fase 0 — Fundação de build · **M** · *pré-requisito de tudo*
**Objetivo:** voltar a ter um build reproduzível e pronto para receber o design system.

1. Migrar para Tailwind v4: remover `tailwind.config.js`/`postcss.config.js`, instalar `tailwindcss@4` + `@tailwindcss/vite` + `@tailwindcss/forms`.
2. Criar `app/src/assets/css/tailwind.css` (o arquivo que os `@reference` esperam) com `@import "tailwindcss"`, `@custom-variant dark (&:is(.dark *))` e `@source` apontando para `src/`.
3. Reconstruir a partir do CSS compilado antigo (usado **só como referência**) as classes que sumiram: `flexify-dashboard-isolation`, `flexify-dashboard-normalize`, tokens shadcn usados por `ui/drawer`, `zinc-750`, `shadow-xs` etc.
4. Trocar os 17 `_base.css` com preflight por: um CSS base compartilhado + CSS por página só com `@reference`.
5. Rodar `npm run build` e validar que `app/dist/.vite/manifest.json` gera todas as entradas que `Scripts.php` procura (incluindo `assets/styles/theme.css`).
6. `Login.php` carrega `app/src/apps/styles/login.css` direto de `src` → apontar para `dist`.
7. Remover código morto: `src/cards`, `src/custom-renders`, `src/sections`, CSS órfãos em `src/apps/styles`, imports de `ShadowRoot` não usados, 11 cópias extras de `useDarkMode.js` → 1 composable.
8. **Linha de base visual:** capturas de tela (claro/escuro, 1440 px e 375 px) de todas as páginas antes das mudanças.
9. Adicionar ESLint + Prettier mínimos ao `app/` (sem reformatar tudo de uma vez).

**Critério de aceite:** build limpo, plugin funcionando igual à linha de base, sem regressão visual relevante.

---

### Fase 1 — Tokens do design system · **M**
**Objetivo:** todas as fundações visuais do TailAdmin disponíveis como utilitários **e** variáveis CSS.

1. Em `tailwind.css`, bloco `@theme` com:
   - **Cores:** `brand`, `gray`, `success`, `error`, `warning`, `blue-light`, `orange` (25–950), `gray-dark #1a2231`, `theme-pink-500`, `theme-purple-500`.
   - `brand-*` → `var(--fd-accent-*)` e `gray-*` → `var(--fd-base-*)`, com os valores do TailAdmin como fallback.
   - **Alias temporário:** `zinc-*` → mesmas variáveis de `gray-*` (D2).
   - **Tipografia:** `--font-outfit`/`font-sans` → `var(--fd-font-sans, Outfit)`, escalas `title-2xl…title-xs` e `theme-xl/sm/xs`.
   - **Sombras:** `theme-xs…theme-xl`, `focus-ring`, `tooltip`, `datepicker`.
   - **Breakpoints:** `2xsm 375`, `xsm 425`, `3xl 2000`. **z-index:** 1, 9, 99, 999, 9999, 99999, 999999.
   - Utilitários `custom-scrollbar`, `no-scrollbar`, `menu-item*`, `menu-dropdown-*`.
2. PHP: imprimir `--fd-accent-*`, `--fd-base-*` e `--fd-font-sans` num único `<style>` inline em todo carregamento (admin, login e frontend) a partir de `accent_theme_scale`/`base_theme_scale`; remover a aplicação tardia do `UserDetails.vue`.
3. Atualizar os padrões: `accent_theme_color = #465fff`, escala base = gray TailAdmin; `generateColorScheme.js` com resultado próximo da escala oficial quando a cor for a padrão.
4. Outfit auto-hospedada em `assets/fonts/` + `@font-face`; `output_custom_font_css` usa Outfit como fallback.
5. Dark mode: superfícies `gray-900` (sidebar/header/modal), cards `white/[0.03]`, bordas `gray-800`, dropdowns `gray-dark`; remover os `!important` de `#24303f`/`#2e3a47`; `.dark` só em `<html>`.
6. Preset de gráficos `useChartTheme()` (Outfit, sem toolbar, grade só no eixo Y, cores `brand-500`/`brand-300`, tooltip reativo ao dark mode); remover cores fixas dos providers PHP (`Analytics/Providers/*`).
7. Documentação: `docs/design-system.md` (tokens, quando usar cada cor, receitas) + aviso MIT do TailAdmin em `licence.md`.
8. Expor tokens como API pública para extensões React/Vue (variáveis `--color-*` geradas pelo v4 + nota na doc de cards).

**Critério de aceite:** mudar a cor de destaque nas configurações muda o brand em todo o admin sem recarregar CSS; claro/escuro com contraste AA; todas as telas já “puxam” para a paleta TailAdmin via alias.

---

### Fase 2 — Biblioteca de componentes · **G**
**Objetivo:** componentes base com as receitas do TailAdmin, variantes por props e dark mode. Criar `app/src/components/ds/` (ou atualizar `utility/` mantendo a API dos existentes para não quebrar páginas).

| Componente | Ação | Referência TailAdmin |
|---|---|---|
| `Button` (`app-button`) | Variantes `primary`, `outline`, `danger`, `warning`, `ghost`; tamanhos `sm`/`md`; ícone, loading, disabled | `ui/Button.vue` |
| `Input`, `TextArea` | Label, hint, estados erro/sucesso/disabled, ícone à esquerda | `forms/FormElements` |
| `Select` (reka-ui) | Mesmo visual do input, chevron, busca opcional, múltiplo | idem |
| `Checkbox`, `Radio` | **Consolidar os 4 checkboxes em 1** (+ variante tabela `h-4 w-4`) | idem |
| `Switch` (novo) | Toggle on/off; renomear o atual `toggle` para `SegmentedControl` | idem |
| `Badge` (substitui `status-tag`) | light/solid × primary/success/error/warning/info/light/dark; ponto pulsante opcional | `ui/Badge.vue` |
| `Alert` (novo) | success/error/warning/info | `ui/Alert.vue` |
| `Avatar` | Tamanhos + status | `ui/Avatar.vue` |
| `Card` (novo) | Wrapper, header (título, descrição, ações), body | `common/ComponentCard.vue` |
| `PageHeader` + `Breadcrumb` (novos) | Título + trilha + slot de ações | `common/PageBreadcrumb.vue` |
| `MetricCard` / `StatStrip` (novos) | Ícone, rótulo, valor, variação % | `ecommerce/EcommerceMetrics.vue` |
| `Dropdown` (`context-menu`) | Painel `rounded-2xl`, itens, separadores, teclado | `common/DropdownMenu.vue` |
| `Modal`, `Confirm` | Painel `rounded-3xl`, backdrop blur, botão fechar redondo, tamanhos | `ui/Modal.vue` |
| `Drawer` | **Consolidar `utility/drawer` + `ui/drawer`** | — |
| `Tabs` | Variantes sublinhado e segmentado, contador | `StatisticsChart.vue` |
| `DataTable` (`table`) | Cabeçalho ordenável, seleção, linha expansível, sticky header, densidade, colunas visíveis, skeleton, vazio | `BasicTableOne.vue` |
| `Pagination` (novo) | “Mostrando X a Y de Z”, páginas, itens por página | — |
| `Tooltip`, `Popover` | `shadow-tooltip` | — |
| `Toast` (`notifications`) | Claro/escuro seguindo o tema (hoje sempre escuro) | — |
| `DateRangePicker` | Tema do vue-datepicker com tokens | tema flatpickr do `main.css` |
| `EmptyState`, `Skeleton`, `Spinner` | Padronizar | — |
| `Dropzone` / seletor de imagem | Borda tracejada `hover:border-brand-500` | — |

Extras:
- **Página interna “Design System”** (submenu oculto, só para `manage_options` e `WP_DEBUG`) com todos os componentes, para QA visual e para desenvolvedores de extensões.
- Acessibilidade: foco visível (`focus-ring`), `aria-*`, navegação por teclado em dropdown/modal/tabs.

**Critério de aceite:** todos os componentes na página de QA em claro/escuro e 375/768/1280 px; nenhuma página existente quebrada.

---

### Fase 3 — Layout (shell) · **M**
**Objetivo:** estrutura do TailAdmin em todo o wp-admin.

1. **Sidebar** (`components/app/menu`): `bg-white dark:bg-gray-900`, borda direita, 290 px expandida / 90 px recolhida com expansão no hover, títulos de grupo `text-xs uppercase text-gray-400`, itens `menu-item-active/inactive`, submenus `ms-9`, badges de contagem (ex.: pedidos em processamento), logo 150×40 / ícone 32×32. Mobile (< xl): off-canvas com backdrop.
2. Manter tudo o que existe: busca no menu, favoritos, seletor de site remoto, notificações do admin, `MenuMinimized`, hooks `flexify-dashboard/sidebar/render/*`, menus do Menu Builder e dashicons/ícones de terceiros.
3. **Header** (`components/app/toolbar`): `sticky bg-white dark:bg-gray-900 border-b`, botão de recolher sidebar, busca global com atalho, alternância de tema, notificações, menu do usuário (`w-[260px] rounded-2xl`), hooks de render mantidos. Integrar a admin bar do WP (`wp-toolbar`) sem cores fixas (`#343A40`/`#1c2434`).
4. **Conteúdo** (`components/app/wrapper`): `bg-gray-50 dark:bg-gray-950`, container `max-w-[1536px] mx-auto p-4 md:p-6`; revisar `--fd-body-height`/`--fd-toolbar-height` para as páginas de altura total (mídia, database).
5. Remover (ou tornar opcional) o `panel-resizer`; migrar `localStorage.uipc_panel_width` e `fd-menu-state`.
6. Recarregar a toolbar do frontend (shadow DOM) com os novos tokens.
7. Suporte RTL (`ms-/me-/start/end`).

**Critério de aceite:** navegação idêntica à atual em funcionalidade, visual igual ao TailAdmin, sem layout shift no carregamento (`output_temporary_body_hider`).

---

### Fase 4 — Migração das páginas Vue existentes · **GG** (incremental)
**Checklist por página:** codemod `zinc → gray` · remover hex/rgb fixos · trocar componentes antigos pelos da Fase 2 · `PageHeader` + `Card` · dark mode · 375/768/1280 px · strings traduzíveis.

Ordem sugerida (uso × visibilidade):
1. **Dashboard** — grid 12 colunas, cards com `MetricCard`, gráficos com `useChartTheme`; cards de ecommerce no layout do dashboard ecommerce do TailAdmin; revisar a API pública de cards (`docs/dashboard-card-api.md`).
2. **Posts** (lista + edição inline)
3. **Usuários** (+ remover a cópia duplicada de `woocommerce-customer`)
4. **Comentários**
5. **Mídia** (+ decidir entre `media-library` e `media-library-v2`)
6. **Plugins**
7. **Configurações** (+ nova categoria “WooCommerce”, preview da cor de destaque/fonte)
8. **Login** (`login.css` com 363 linhas manuais → tokens)
9. Activity log, Admin notices, Role editor, Menu creator, Database explorer
10. Toolbar do frontend

Ao final: **remover o alias `zinc → gray`** e bloquear `zinc-` via lint.

---

### Fase 5 — Telas nativas do WordPress e WooCommerce (`theme.css`) · **G**
**Objetivo:** telas não substituídas por Vue com a mesma aparência. Pode rodar em paralelo à Fase 4.

1. Reescrever `app/src/apps/styles/theme.css` como fonte legível (dividida em parciais) dentro de `@layer fd-theme`, usando os tokens.
2. Cobrir: formulários (`input`, `select`, `textarea`, `.form-table`), botões (`.button`, `.button-primary`), avisos (`.notice`), `.postbox`/metaboxes, `WP_List_Table`, abas (`.nav-tab`), paginação, modais do WP (thickbox/media modal), editor de blocos (moldura), telas de configurações.
3. **WooCommerce nativo:** editor clássico de produto (abas `#woocommerce-product-data`, variações, galeria), edição de pedido (HPOS e legado), configurações do WC, relatórios/Analytics (`.woocommerce-layout__header`, componentes React do wc-admin), importador/exportador CSV, cupons.
4. Remover o filtro “magic dark mode” (inversão de cores) onde o CSS dedicado passar a cobrir.

**Critério de aceite:** checklist de telas nativas + WooCommerce em claro/escuro sem elementos ilegíveis.

---

### Fase 6 — Fundação WooCommerce (backend + infraestrutura) · **M**
1. Classe de integração `Integrations/WooCommerce/*` carregada só com `class_exists('WooCommerce')`; unificar os `is_woocommerce_active()` duplicados.
2. Declarar compatibilidade HPOS (`FeaturesUtil::declare_compatibility('custom_order_tables', …)`).
3. Configurações `use_modern_products_page` e `use_modern_orders_page` (Default_Options + schema/sanitize em GlobalOptions + `settings-config.js` na categoria “WooCommerce”); ao alternar, girar o `menu-cache` key.
4. Dados globais para o JS (estender `setGlobalProperties.js`): moeda, símbolo, posição, separadores e decimais, unidades de peso/dimensão, impostos ativos, gestão de estoque, limite de estoque baixo, status de pedido (`wc_get_order_statuses()`, incluindo customizados), tipos de produto, gateways e métodos de envio ativos, HPOS ativo, URLs nativas.
5. Endpoints `flexify-dashboard/v1`:
   - `GET /woocommerce/products/summary` — contagens por status, sem estoque, estoque baixo, rascunhos.
   - `GET /woocommerce/orders/summary` — contagens por status + receita do período.
   - `POST /woocommerce/products/bulk` e `POST /woocommerce/orders/bulk` — ações em massa em lote, com checagem de permissão por item.
   - `GET /woocommerce/orders/{id}/context` — dados que o `wc/v3` não entrega prontos (ações de pedido disponíveis, histórico do cliente, atribuição de origem, URLs de edição nativa).
   - `GET /woocommerce/export` — CSV da listagem filtrada (ou link para o exportador nativo).
6. Capacidades: `edit_products`/`delete_products` (produtos), `edit_shop_orders` (pedidos), `manage_woocommerce` (agregados) — testar com o papel `shop_manager`.
7. Performance: reescrever `WooCommerceDashboard` para não usar `wc_get_orders(limit => -1)` (usar tabelas do wc-admin/Analytics ou consultas agregadas + cache em transient).
8. i18n: corrigir strings misturadas (domínio `woocommerce` e textos em PT como fonte) em `WooCommerceDashboard.php`.
9. `composer dump-autoload -o` para as classes novas.

---

### Fase 7 — Gestão de Produtos · **G**
**Integração:** classe `Pages/ProductsList.php` em `load-edit.php` quando `post_type=product` (remover o bloqueio atual em `PostsList`), mount `#fd-products-page`, bundle `Products.js` + entrada no `vite.config.js`, router hash.

**Listagem (`#/`):**
- `PageHeader`: “Produtos”, ações **Exportar**, **Importar** (importador nativo) e **Adicionar produto**.
- `StatStrip`: total, publicados, sem estoque, estoque baixo, rascunhos.
- Abas por status com contagem: Todos, Publicados, Rascunhos, Pendentes, Privados, Lixeira.
- Busca (nome, SKU) com debounce; filtros: categoria, tag, tipo (simples, variável, agrupado, externo), status de estoque, em destaque, faixa de preço.
- Colunas: seleção · imagem 48 px + nome + SKU · categorias · tipo · preço (regular/promocional, faixa para variáveis) · estoque (`Badge` + quantidade) · status · destaque (estrela alternável) · data · ações.
- Ordenação por nome, SKU, preço, estoque e data; paginação com itens por página; estado dos filtros na URL (voltar/avançar funciona); colunas visíveis salvas por usuário.
- **Produtos variáveis:** linha expansível com as variações (atributos, SKU, preço, estoque) editáveis inline.
- Ações por linha: editar (editor nativo), edição rápida, duplicar, ver na loja, lixeira / restaurar / excluir permanentemente.
- **Ações em massa:** mover para lixeira, restaurar, excluir, alterar status, definir status de estoque, ajustar preço (valor/percentual, regular ou promocional), adicionar/remover categoria, marcar destaque.
- **Edição rápida (Drawer):** nome, slug, status, visibilidade do catálogo, SKU, preço regular/promocional (+ agendamento), gestão de estoque/quantidade/status/encomendas, peso e dimensões, classe de entrega, categorias, tags, destaque, imagem principal.
- Estados: skeleton, vazio (com CTA), erro com retry, toasts de sucesso/erro, confirmação para ações destrutivas.

**Categorias e tags (`#/categories`, `#/tags`):** lista hierárquica, criar/editar/excluir, imagem, pai, slug, contagem, reordenação (opcional).

**Critério de aceite:** paridade com a listagem nativa (exceto colunas de terceiros), HPOS indiferente, 1.000+ produtos paginados sem lentidão, papel `shop_manager` funcional, link para a tela padrão sempre visível.

---

### Fase 8 — Gestão de Pedidos · **GG**
**Integração:** classe `Pages/OrdersList.php` cobrindo **HPOS** (`admin.php?page=wc-orders`, hook `load-woocommerce_page_wc-orders`) e **legado** (`edit.php?post_type=shop_order`); mount `#fd-orders-page`, bundle `Orders.js`. A ação `edit` do HPOS (`&action=edit&id=`) e `post.php` do legado redirecionam para a rota Vue quando o toggle estiver ativo (com opção “abrir no editor nativo”).

**Listagem (`#/`):**
- `PageHeader`: “Pedidos”, **Exportar**, **Adicionar pedido** (editor nativo na v1).
- `StatStrip`: aguardando pagamento, processando, em espera, receita do período (com seletor de período).
- Abas por status com contagem (inclui status customizados de plugins).
- Busca (nº do pedido, nome, e-mail, SKU do item); filtros: período, status, método de pagamento, método de envio, cliente, origem (atribuição), “criado via”.
- Colunas: seleção · nº + data (relativa) · cliente (avatar, nome, e-mail) · status (`Badge` com mapa de cores) · itens · total (com reembolso riscado) · pagamento · envio/destino · origem · ações.
- **Pré-visualização rápida (Drawer)** — equivalente ao “olho” nativo: itens, endereços, pagamento, ações de status.
- **Ações em massa:** alterar status (processando, em espera, concluído, cancelado), lixeira/restaurar/excluir, exportar selecionados.
- Atualização periódica opcional (novos pedidos) + badge de contagem no menu.

**Detalhe do pedido (`#/order/:id`):**
- Cabeçalho: nº, `Badge` de status, data, ações — alterar status, **reembolsar**, ações de pedido do WC (reenviar e-mails, regenerar permissões de download), imprimir, abrir no editor nativo, anterior/próximo.
- **Itens:** miniatura, nome + variação/meta, SKU, qtd, custo unitário, impostos, total; cupons aplicados.
- **Resumo:** subtotal, descontos, frete, taxas, impostos, reembolsado, total líquido.
- **Cliente:** link para a tela de usuários (reusar `woocommerce-customer`), nº de pedidos e total gasto, IP/user agent.
- **Endereços** de cobrança e entrega editáveis (+ copiar da cobrança).
- **Pagamento:** método, ID da transação, data de pagamento.
- **Linha do tempo de notas:** adicionar nota privada ou para o cliente, excluir.
- **Modal de reembolso:** por item/quantidade, frete, valor manual, reembolsar pelo gateway quando suportado, repor estoque, motivo.
- **Metadados personalizados** (somente leitura na v1) e **slots/hooks de extensão** (`flexify-dashboard/orders/detail/render/*`) para plugins brasileiros (NF-e, etiquetas de frete, rastreamento).

**Critério de aceite:** fluxo diário completo (ver → mudar status → nota → reembolso) sem sair da tela; HPOS ligado/desligado/sincronizando; ações registradas no Activity Log.

---

### Fase 9 — Editores Vue avançados (posterior/opcional) · **GG**
- **Editor de produto Vue** (`#/product/:id`, `#/new`) inspirado no layout “Add Product” (cards Descrição · Preço e disponibilidade · Imagens · Envio · Atributos/variações · SEO), com fallback automático para o editor nativo quando houver metaboxes de terceiros.
- **Criação/edição manual de pedido** (adicionar itens, recalcular impostos/frete, aplicar cupom).
- Gerenciador de atributos globais e cupons.

---

### Fase 10 — QA, performance e lançamento · **M** (contínua ao final de cada fase)
- **Matriz de testes:** WP 6.0 e atual · WooCommerce atual e anterior · HPOS on/off/sincronização · PHP 7.4 e 8.3 · Chrome/Firefox/Safari · claro/escuro · 375/768/1280/1920 px · RTL · papéis admin/shop_manager/editor.
- **Acessibilidade:** contraste AA, foco, teclado, leitores de tela nos componentes críticos.
- **Performance:** tamanho dos bundles por página (meta: CSS compartilhado único), tempo de resposta dos endpoints com 10k pedidos.
- **Traduções:** gerar POT/JSON para os novos bundles (`languages/`); garantir que `Products.js`/`Orders.js` recebem `wp.i18n`.
- **Testes mínimos:** Vitest para composables (formatação de moeda, filtros, mapeamento de status); smoke tests PHP dos endpoints.
- Changelog, migração de configurações (padrões novos só para quem não personalizou a cor), bump de versão, `npm run release`.

---

## 4. Ordem, dependências e paralelismo

```
Fase 0 ─► Fase 1 ─► Fase 2 ─► Fase 3 ─┬─► Fase 4 (páginas existentes, incremental)
                                      ├─► Fase 5 (telas nativas)          ← paralelo à 4
                                      └─► Fase 6 ─► Fase 7 (Produtos) ─► Fase 8 (Pedidos) ─► Fase 9
Fase 10 ao final de cada fase + release
```

- Produtos/Pedidos (7–8) dependem só das Fases 0–3 e 6, então podem começar antes de terminar a migração das páginas antigas.
- Sugestão de releases: **3.0.0** = Fases 0–5 (novo visual) · **3.1.0** = Fases 6–7 · **3.2.0** = Fase 8 · depois Fase 9.

## 5. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Migração para v4 quebra estilos já em produção | Linha de base visual (Fase 0), CSS compilado antigo como referência, validação por página. |
| 6 mil classes `zinc` | Alias de tokens (D2) + codemod por página + lint ao final. |
| Extensões de terceiros (React/Vue) dependentes de `zinc`/tokens shadcn | Manter aliases durante 1 versão maior e documentar as variáveis públicas. |
| Plugins que adicionam colunas/metaboxes em produtos/pedidos | Toggles por tela, link para a tela nativa, hooks de render, editor completo nativo na v1 (D9). |
| HPOS vs. legado | Usar APIs `wc_get_order`/`wc/v3`, nunca `WP_Query` em `shop_order`; testar os três modos. |
| Performance com lojas grandes | Paginação no servidor, endpoints de agregados com cache, nada de `limit => -1`. |
| Licença do TailAdmin Pro | Só tokens/receitas do free (MIT) com aviso; Pro apenas como inspiração de layout. |
| Sem testes automatizados | Checklist de QA por fase + testes mínimos na Fase 10. |

## 6. Pontos a confirmar antes de começar

1. Aprovar a **migração para Tailwind v4** (D1).
2. **Cor de destaque padrão** `#465fff` do TailAdmin, ou manter `#008aff`?
3. **Remover o redimensionamento da sidebar** ou mantê-lo como opção?
4. Escopo da v1 de WooCommerce conforme D9 (editor completo de produto e criação de pedido ficam para a Fase 9)?
5. Versionamento: 3.0.0 para o novo visual?
