# Planejamento — Frontend React (TailAdmin) com prioridade WooCommerce

> Referência visual e de componentes: [TailAdmin React (MIT)](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard) · [demo](https://demo.tailadmin.com/).
> Versão alvo: **4.0.0**.

**Decisões já confirmadas (07/10/2026)**

| # | Decisão | Escolha |
|---|---|---|
| D1 | Alcance | Migrar **todo** o frontend para React, em fases, começando pelo WooCommerce, até remover o Vue |
| D2 | Linguagem | **TypeScript** |
| D3 | Componentes | **Portar o kit atual** (receitas de classe) + **Radix UI** para primitivos acessíveis |
| D4 | Dados | **TanStack Query** sobre a REST do WordPress/WooCommerce |

---

## 1. Diagnóstico do frontend atual

| Área | Arquivos | Linhas | Observação |
|---|---:|---:|---|
| `components/kit` | 32 | 2.092 | Kit TailAdmin atual (Fd*), base da migração |
| `components/app` | 68 | 10.025 | Shell: menu, toolbar, busca, notificações, render de extensões |
| `components/utility` | 58 | 9.928 | Componentes legados (select, mídia, editor, tabelas, drawer…) |
| `pages/dashboard` | 71 | 7.877 | Widgets e cartões do painel |
| `pages/settings` | 18 | 5.787 | Configurações |
| `pages/users` | 16 | 4.580 | |
| `pages/products` | 16 | 4.082 | **WooCommerce** |
| `pages/media` | 6 | 3.896 | |
| `pages/posts` | 21 | 3.762 | |
| `pages/plugins` | 17 | 2.960 | |
| `pages/orders` | 10 | 2.608 | **WooCommerce** |
| `pages/menu-creator` · `database` · `comments` · `role-editor` · `activity-log` · `admin-notices` · `login` | 40 | 10.551 | |
| `composables` · `store` · `setup` · `assets/js` | 41 | 3.961 | Lógica compartilhada |
| **Total** | **460** | **75.860** | |

**O que já é reaproveitável sem reescrever** (não depende de Vue):

- `components/kit/recipes.js` — todas as receitas de classe do design system.
- `lib/utils.js` — `cn()` com `tailwind-merge` configurado para os tokens do tema.
- `composables/wooPrice.js` e `pages/products/src/editor/variationCombos.js` — funções puras já cobertas por testes.
- `assets/js/functions/HooksSystem.js` — sistema de hooks/filtros exposto em `window.flexifyDashboard`.
- Todo o CSS: `assets/css/tailwind.css`, `globals.css`, camadas de isolamento e `theme.css`.
- Todo o backend PHP: endpoints REST, páginas, tokens de tema, traduções.

**Dependências já instaladas que servem ao React:** `react`, `react-dom` (vieram com o veaury), `clsx`, `tailwind-merge`, `zod`, `dayjs`, `lodash-es`, `axios`, `apexcharts`, `uuid`.

---

## 2. Decisões de arquitetura

| # | Tema | Decisão |
|---|---|---|
| A1 | Build | Vite com `@vitejs/plugin-react`, mantendo o formato multi-entrada atual (um bundle por tela do wp-admin) e o `manifest.json` lido pelo PHP |
| A2 | Coexistência | Durante a migração, Vue e React convivem por **entrada**: cada página é 100% de um framework. Nada de montar React dentro de Vue (fim do `veaury` como dependência de produção) |
| A3 | TypeScript | `tsconfig` só para `src/react/**`; o código Vue continua em JS até ser migrado. `vite-plugin-checker` opcional para checagem no dev |
| A4 | Roteamento | `react-router-dom` com `createHashRouter` por aplicação, mantendo as rotas atuais (`#/order/123`, `#/product/45`) e os redirecionamentos do PHP |
| A5 | Dados do servidor | TanStack Query com um `queryClient` por aplicação; chaves por recurso (`['orders', filtros]`); invalidação após mutações; `keepPreviousData` nas listas paginadas |
| A6 | Estado de interface | Context + `useReducer` para o que é global (tema, sidebar, dados do WP). Sem Redux/Zustand até existir necessidade real |
| A7 | Primitivos acessíveis | Radix UI (`@radix-ui/react-*`): equivalente React do `reka-ui` que já usamos. Portal para `#fd-kit-portal`, dentro do container isolado |
| A8 | Estilos | Reaproveitar os tokens e camadas atuais. Os componentes React importam as mesmas receitas; nada de CSS novo por componente |
| A9 | i18n | `window.wp.i18n` (`__`, `sprintf`) via um módulo `src/react/lib/i18n.ts`; o extrator de POT já lê `.ts`/`.tsx` |
| A10 | Dados do WP | Um `WpDataProvider` lê os atributos dos `<script>` (`#fd-script`, `#fd-woocommerce-script`) uma vez e expõe por contexto, substituindo `setGlobalProperties` |
| A11 | Extensões de terceiros | `ComponentRender` em React aceita componentes React nativos e, por compatibilidade, componentes Vue via `veaury` **apenas** enquanto houver extensões Vue registradas |
| A12 | Testes | Vitest + Testing Library para componentes e hooks; os testes puros atuais (`node --test`) continuam valendo |

---

## 3. Estrutura de pastas proposta

```
app/src/react/
  main/                    # uma entrada por tela do wp-admin
    products.tsx  orders.tsx  dashboard.tsx  settings.tsx  …
  app/                     # casca compartilhada
    AppProviders.tsx       # Query + WpData + Theme + Sidebar + Toaster + ErrorBoundary
    PageShell.tsx          # container isolado, scroll, notificações, portal do kit
    router.tsx
  layout/                  # TailAdmin: AppLayout, AppHeader, AppSidebar, Backdrop…
  ui/                      # kit base (ex-Fd*)
    button/ badge/ alert/ card/ modal/ drawer/ dropdown/ tooltip/ table/ tabs/ …
  form/                    # inputs, select, checkbox, radio, switch, datepicker, dropzone…
  charts/                  # wrappers do ApexCharts
  data/                    # DataTable e acessórios (filtros, colunas, ações em massa)
  features/
    woocommerce/
      products/ orders/ coupons/ attributes/ tags/ categories/ shared/
    dashboard/ posts/ users/ media/ comments/ plugins/ settings/ …
  hooks/                   # useModal, useClickOutside, useDebounce, useColumnPrefs…
  lib/                     # rest.ts, i18n.ts, format.ts, hooks-system.ts, cn.ts
  types/                   # woocommerce.ts, wordpress.ts, plugin.ts
```

---

## 4. Inventário de componentes

Legenda da coluna **Origem**: `kit` = porte do componente Vue atual · `TailAdmin` = existe no repositório de referência · `novo` = não existe em nenhum dos dois.

### 4.1 Primitivos de UI (`ui/`)

| Componente | Origem | Notas |
|---|---|---|
| `Button` | kit + TailAdmin | variantes primary, outline, secondary, danger, danger-outline, warning, success, ghost, link; tamanhos xs–lg; `loading`, `iconOnly`, `as="a"` |
| `IconButton` | kit | atalho de `Button` com rótulo acessível obrigatório |
| `Badge` | kit + TailAdmin | cores do mapa de status, variantes light/solid, ponto e pulso |
| `Alert` | kit + TailAdmin | success/error/warning/info, título, mensagem, ações, dispensável |
| `Card` / `ComponentCard` | kit + TailAdmin | título, descrição, ações, rodapé, `padding="none"` |
| `MetricCard` | kit + TailAdmin | valor, ícone, tendência, carregando |
| `StatStrip` | kit | faixa de contadores clicáveis (2 colunas no celular) |
| `Avatar` | kit + TailAdmin | iniciais, imagem, tamanhos, status |
| `Skeleton` | kit | linhas, blocos e tabela |
| `Spinner` | kit | |
| `EmptyState` | kit | ícone, título, descrição, ações |
| `Breadcrumb` / `PageHeader` | kit + TailAdmin | título, descrição, migalhas, ações |
| `Tabs` | kit | underline e segmentado, com contadores |
| `Pagination` | kit | página, itens por página, total |
| `Tooltip` | kit (Radix) | |
| `Divider`, `ScrollArea`, `ProgressBar` | novo | usados em listas longas e barras de uso |
| `Icon` | kit | mesma estratégia de máscara CSS sobre os SVGs em `assets/icons` |

### 4.2 Formulários (`form/`)

| Componente | Origem | Notas |
|---|---|---|
| `Field` | kit | rótulo, dica, erro, sucesso, obrigatório |
| `Input` | kit + TailAdmin | prefixo/sufixo, ícone, limpar, tamanhos, estados |
| `Textarea` | kit + TailAdmin | |
| `Select` (nativo) | kit + TailAdmin | opções e grupos |
| `SearchSelect` / `MultiSelect` | utility + TailAdmin | busca, múltipla seleção, criação de item (Radix Popover + Command) |
| `Checkbox`, `Radio`, `Switch` | kit + TailAdmin | com nome acessível e descrição |
| `SearchInput` | kit | com atraso de digitação |
| `TagInput` | utility | tags de produto e e-mails de cupom |
| `DatePicker` / `DateRangePicker` | utility + TailAdmin | substitui `@vuepic/vue-datepicker` (react-day-picker) |
| `FileInput` / `Dropzone` | kit + TailAdmin | upload e importação |
| `ColorPicker`, `IconPicker` | utility | usados em configurações e menus |
| `Form` | novo | `react-hook-form` + `zod` (zod já está no projeto) |

### 4.3 Dados e tabelas (`data/`)

| Componente | Origem | Notas |
|---|---|---|
| `Table` (primitivos) | TailAdmin | `Table`, `TableHeader`, `TableRow`, `TableCell` |
| `DataTable` | kit | ordenação, seleção, linhas expansíveis, clique na linha, esqueleto, vazio, barra de ações em massa |
| `TableToolbar` | novo | busca + filtros + ações, com o arranjo responsivo já resolvido |
| `FilterBar` / `FilterChips` | novo | filtros extras recolhíveis e indicadores removíveis |
| `ColumnVisibility` | kit | preferência por navegador |
| `BulkActionsBar` | kit | |
| `RowActions` | kit | menu de ações por linha |
| `StatusTabs` | kit | abas por status com contagem |

### 4.4 Layout e navegação (`layout/`)

| Componente | Origem | Notas |
|---|---|---|
| `AppLayout`, `Backdrop` | TailAdmin | |
| `AppSidebar` | app + TailAdmin | 290 px, modo recolhido (90 px), expansão ao passar o mouse, favoritos, submenus, badges, opção de redimensionar |
| `SidebarItem`, `SidebarSection`, `SidebarWidget` | app + TailAdmin | |
| `AppHeader` | app + TailAdmin | alternar sidebar, busca, modo escuro, menu do usuário, notificações |
| `CommandPalette` | app | busca do painel (Ctrl/⌘K) |
| `NotificationDropdown`, `UserDropdown` | app + TailAdmin | |
| `MobileDrawer` | kit | `Sheet` lateral com o menu |
| `ThemeToggle` | app + TailAdmin | |
| `ComponentRender` | app | ponto de extensão; aceita React e, por compatibilidade, Vue |

### 4.5 Sobreposições e feedback (`ui/`)

| Componente | Origem | Notas |
|---|---|---|
| `Modal` | kit (Radix Dialog) | tamanhos, rodapé, persistente |
| `Sheet` / `Drawer` | kit (Radix Dialog) | lateral esquerda/direita, modo "bare" |
| `DropdownMenu` | kit (Radix) | itens, separadores, títulos, item perigoso, link |
| `Popover` | novo (Radix) | filtros e seletores |
| `ConfirmDialog` | kit | API imperativa (`await confirm({...})`) via contexto |
| `Toaster` / `useNotify` | utility | fila de notificações (sucesso, erro, aviso, info) |

### 4.6 Gráficos (`charts/`)

| Componente | Origem | Notas |
|---|---|---|
| `LineChart`, `BarChart`, `AreaChart`, `DonutChart`, `RadialChart` | dashboard + TailAdmin | `react-apexcharts` com o tema atual (`useChartTheme`) |
| `Sparkline` | dashboard | |
| `CountryMap` | TailAdmin | hoje usamos Mapbox; avaliar `react-jvectormap` do TailAdmin ou manter Mapbox |

### 4.7 Editores e mídia

| Componente | Origem | Notas |
|---|---|---|
| `RichText` | utility | Tiptap tem pacote React oficial (`@tiptap/react`) |
| `CodeEditor` | utility | hoje Ace; avaliar CodeMirror 6 (React) |
| `MediaPicker` | utility | biblioteca de mídia do WP (`wp.media`) — já encapsulada em `useWpMedia` |
| `ImageEditor`, `ImageSelect` | utility | recorte e seleção |
| `SortableList` | utility | substitui `vue-draggable-next` por `@dnd-kit` |

### 4.8 WooCommerce — Produtos (prioridade 1)

| Componente | Origem | Notas |
|---|---|---|
| `ProductsPage` | pages/products | rota `#/` |
| `ProductsStatStrip`, `ProductsStatusTabs` | kit | contadores e abas |
| `ProductsFilters` | products | categoria, tipo, estoque, destaque, tag, faixa de preço |
| `ProductsTable` | products | imagem, SKU, preço, estoque, status, destaque, ações |
| `ProductRowVariations` | products | linha expansível com variações |
| `ProductQuickEdit` | products | painel lateral |
| `ProductBulkPriceModal`, `ProductBulkCategoryModal` | products | |
| `ProductEditor` | products/editor | rotas `#/new` e `#/product/:id` |
| `ProductGeneralCard`, `PricingCard`, `InventoryCard`, `ShippingCard`, `DownloadsCard`, `AdvancedCard` | products/editor | |
| `ProductAttributes`, `ProductVariationsEditor` | products/editor | atributos globais e personalizados, gerador de variações |
| `ProductImagesCard`, `ProductCategoriesCard`, `ProductTagsCard`, `PublishCard` | products/editor | |
| `LinkedProductsCard` + `ProductPicker` | products/editor | upsell, venda cruzada e agrupados |
| `ExtensionFieldsAlert` | products/editor | aviso de campos de extensões |

### 4.9 WooCommerce — Pedidos (prioridade 1)

| Componente | Origem | Notas |
|---|---|---|
| `OrdersPage` | pages/orders | rota `#/` |
| `OrdersStatStrip` (com seletor de período), `OrdersStatusTabs` | orders | |
| `OrdersFilters` | orders | período, pagamento, canal, origem, cliente |
| `OrdersTable` | orders | nº, cliente, status, itens, total, pagamento, envio, data |
| `NewOrdersBanner` | orders | aviso de novos pedidos |
| `OrderPreviewSheet` | orders | prévia rápida |
| `OrderDetailsPage` | orders | rota `#/order/:id` |
| `OrderItemsTable`, `OrderTotals`, `OrderRefundsList` | orders | |
| `OrderNotesTimeline` | orders | notas privadas e para o cliente |
| `OrderCustomerCard`, `OrderAddressCard` + `AddressModal`, `OrderPaymentCard`, `OrderAttributionCard`, `OrderCustomFieldsCard` | orders | |
| `OrderActionsMenu`, `OrderStatusMenu`, `OrderSiblingsNav` | orders | |
| `RefundModal` | orders | por item, com reposição de estoque |
| `OrderEditor` | orders | rotas `#/new` e `#/order/:id/edit` |
| `OrderProductPicker`, `OrderCustomerPicker`, `OrderShippingLines`, `OrderFeeLines`, `OrderCouponsCard`, `OrderSummaryCard` | orders | |
| `AddressFields` | orders | países e estados do WooCommerce |

### 4.10 WooCommerce — Catálogo

| Componente | Origem |
|---|---|
| `CategoriesView` (árvore, criar/editar/excluir) | products |
| `TagsView` (lista, exclusão em massa) | products |
| `AttributesView` + `AttributeTermsSheet` | products |
| `CouponsView` + `CouponEditorSheet` (gerador de código, restrições, limites) | products |

### 4.11 Dashboard e-commerce (espelha o TailAdmin)

| Componente | Origem | Notas |
|---|---|---|
| `EcommerceMetrics` | TailAdmin | clientes e pedidos com variação |
| `MonthlySalesChart`, `StatisticsChart` | TailAdmin | |
| `MonthlyTarget` | TailAdmin | medidor radial |
| `RecentOrders` | TailAdmin + dashboard | |
| `DemographicCard` / `CountryMap` | TailAdmin | |
| Cartões atuais do painel (mídia, posts, comentários, agendados, saúde do servidor, plugins, analytics…) | dashboard | ~71 arquivos; migram na fase do painel, mantendo a API de cartões de terceiros |

### 4.12 Providers, hooks e utilitários

| Item | Papel |
|---|---|
| `AppProviders` | Query, WpData, Theme, Sidebar, Toaster, Confirm, ErrorBoundary |
| `WpDataProvider` / `useWpData` | dados dos `<script>` do WP (usuário, URLs, permissões, configurações) |
| `WooProvider` / `useWoo` | moeda, unidades, status, gateways, permissões, URLs |
| `useRest` / `restClient` | wrapper da REST com nonce, erros e notificações (substitui `lmnFetch`) |
| `useOrders`, `useOrder`, `useProducts`, `useProduct`, `useVariations`, `useCoupons`, `useAttributes`, `useTags`, `useCategories`, `useCustomers`, `useCountries` | hooks de consulta e mutação (TanStack Query) |
| `useNotify`, `useConfirm`, `useModal`, `useClickOutside`, `useDebounce`, `useMediaQuery`, `useColumnPrefs`, `useUrlFilters`, `useWpMedia`, `useChartTheme`, `useHooks` | utilitários de interface |
| `formatPrice`, `parsePrice`, `formatDate`, `relativeDate`, `safeHtml`, `variationCombos` | funções puras (já existem e têm testes) |
| `types/woocommerce.ts` | tipos de pedido, produto, variação, cupom, atributo e contexto |

**Contagem aproximada:** 48 componentes de base e formulário · 8 de dados/tabela · 12 de layout · 6 de sobreposição · 8 de gráficos · 9 de editores/mídia · 55 de WooCommerce · 20+ do painel · 12 providers/hooks.

---

## 5. Mapeamento TailAdmin → Flexify

| TailAdmin React | Nosso equivalente | Ação |
|---|---|---|
| `ui/button/Button.tsx` | `ui/button/Button.tsx` | portar do kit (mais variantes) |
| `ui/badge`, `ui/alert`, `ui/avatar`, `ui/modal`, `ui/dropdown`, `ui/table` | mesmos nomes | portar do kit, trocando o headless para Radix |
| `form/input/*`, `form/Select.tsx`, `form/MultiSelect.tsx`, `form/switch` | `form/*` | portar do kit + `components/utility/select` |
| `layout/AppSidebar`, `AppHeader`, `Backdrop`, `SidebarWidget` | `layout/*` | adaptar ao nosso menu (favoritos, submenus, badges, hover) |
| `ecommerce/*` (métricas, vendas, meta, pedidos recentes, mapa) | `features/dashboard/*` | base direta para o painel de e-commerce |
| `charts/*` | `charts/*` | wrappers com o tema atual |
| `common/PageBreadCrumb`, `ComponentCard`, `ThemeToggleButton`, `ScrollToTop` | `ui/*`, `layout/*` | adotar |
| `context/ThemeContext`, `SidebarContext` | `app/*` | adotar, ligando ao modo escuro já existente |
| `hooks/useModal`, `useClickOutside`, `useGoBack` | `hooks/*` | adotar |
| `pages/AuthPages`, `Calendar`, `UserProfiles`, `Tables`, `Forms`, `UiElements` | — | só como referência de layout; não entram no plugin |

---

## 6. Integração com o WordPress

1. **Entradas** — cada tela ganha uma entrada `src/react/main/<tela>.tsx`. O PHP continua resolvendo pelo `manifest.json`; muda só o nome do arquivo em `Scripts::get_base_script_path()` e nos `get_entry()` das páginas.
2. **Montagem** — mesmos `id`s de mount (`#fd-products-page`, `#fd-orders-page`, …), dentro do mesmo container isolado (`.flexify-dashboard-isolation`) e com o portal `#fd-kit-portal`.
3. **Dados** — os atributos dos `<script>` continuam iguais; só a leitura muda (`WpDataProvider`).
4. **Traduções** — `wp.i18n` já é carregado para o handle `flexify-dashboard-app-js`; o extrator de POT já lê `.ts`/`.tsx`. Nada muda no PHP.
5. **Estilos** — sem mudança: mesmos arquivos CSS, mesmas camadas, mesmos tokens.
6. **Rotas e redirecionamentos** — as rotas em hash permanecem, então os redirecionamentos do PHP (HPOS, legado, `fd_classic`) continuam válidos.
7. **Extensões** — `addFilter`/`applyFilters` seguem iguais; o `ComponentRender` React mantém a assinatura de hoje.

---

## 7. Fases

Cada fase termina com build, testes, verificação visual no harness e commit.

### Fase 0 — Fundação (M) · **concluída em 07/10/2026**
TypeScript, `@vitejs/plugin-react`, estrutura de pastas, `AppProviders` (Query + dados do WP + tema + notificações + ErrorBoundary), `PageShell`, `restClient`, `i18n`, `Icon`, harness React e Vitest + Testing Library (15 testes).
**Aceite:** a página **Design System** passou a ser a primeira tela React do plugin; monta no wp-admin com tema, traduções, REST e notificações funcionando.

Detalhes úteis para as próximas fases:

- `Scripts::get_base_script_path()` agora aceita caminhos relativos a `src` (ex.: `react/main/orders.tsx`); nomes sem barra continuam apontando para `apps/js`.
- Entradas React ficam em `src/react/main/<tela>.tsx` e montam com `mountApp( id, <PageShell>…</PageShell>, '#fd-…-script' )`.
- `@vitejs/plugin-react` está na linha 4 porque o Vite do projeto é a versão 5; a versão 6 do plugin exige Vite 8. Atualizar o Vite é um item à parte.
- Comandos: `npm run build`, `npm run typecheck`, `npm run test:react` (Vitest) e `npm test` (testes puros + Vitest).

### Fase 1 — Kit de UI (G) · **concluída em 07/10/2026**
Seções 4.1 a 4.3 e 4.5: primitivos, formulários, tabela de dados e sobreposições, com a página de Design System reescrita em React como vitrine e teste visual.
**Aceite:** paridade visual com o kit atual; navegação por teclado e nomes acessíveis preservados.

Detalhes úteis para as próximas fases:

- Tudo sai de `@/react/ui` (barril único): primitivos, formulários e `DataTable`.
- As classes continuam vindo do kit atual através de `src/react/ui/recipes.ts`, que reexporta `components/kit/recipes.js` com os tipos (`ButtonVariant`, `ControlSize`, `FieldState`, `BadgeColor`, `AlertVariant`).
- Sobreposições usam Radix e são renderizadas no portal `#fd-kit-portal` do `PageShell` via `usePortalTarget()`, para herdar o tema dentro do contêiner de isolamento.
- Confirmações destrutivas usam `useConfirm()` (`ConfirmProvider`), que devolve `Promise<boolean>` — não há mais `window.confirm`.
- A página de Design System (`src/react/features/design-system/`) é a vitrine do kit; os arquivos Vue equivalentes foram removidos.
- Testes: `src/react/ui/kit.test.tsx` cobre teclado, nomes acessíveis, portal, debounce e a `DataTable` (seleção, ordenação, expansão). O `afterEach` global restaura os temporizadores reais, senão um teste que falha com `vi.useFakeTimers()` travaria todos os seguintes.
- Traduções: `languages/convert-cli.js` foi substituído por `generate-json-cli.js` (ESM, usa o `gettext-parser` já instalado e não depende mais do `i18next-conv`); gere com `npm run compile` dentro de `languages/`.

### Fase 2 — WooCommerce: Produtos (G) · **concluída em 07/10/2026**
Lista, filtros, variações expansíveis, edição rápida, ações em massa, categorias, tags, atributos e cupons.
**Aceite:** paridade com a tela Vue atual; os testes de integração da API continuam passando.

Detalhes úteis para as próximas fases:

- `WooProvider` / `useWoo()` expõem os dados da loja, a moeda, `price()`, `toDecimal()`, `can()` e os dois clientes REST (`wc()` para `wc/v3` e `fd()` para os endpoints do plugin). O payload vem do `#fd-woocommerce-script`, igual ao da tela Vue.
- Os hooks de dados ficam em `src/react/woo/queries.ts`; as chaves seguem `['woo', <recurso>, …]`, então uma mutação invalida o recurso inteiro com `['woo', 'products']`.
- `useQueryFilters()` mantém os filtros na barra de endereços (hash router) e omite os valores iguais ao padrão.
- A tela React só é usada quando o editor moderno de produtos está desligado — o editor ainda é Vue. A fase 4 porta o editor e remove essa bifurcação; o filtro `flexify-dashboard/woocommerce/react-products` força uma das duas.
- `ModernScreen` passou a resolver a folha de estilos pelo manifesto (`Scripts::get_stylesheet_path()`). O nome fixo apontava para `assets/styles/products.css`, que o build não gera — as telas de produtos e pedidos carregavam um 404.
- `Scripts` agora ignora registros de CSS ao procurar a entrada: quando duas entradas importam folhas com o mesmo conteúdo, o Vite grava um registro extra apontando para o `.css` e ele vinha antes da entrada real.

### Fase 3 — WooCommerce: Pedidos (G) · **concluída em 07/10/2026**
Lista, contadores, filtros, prévia, detalhes, notas, reembolso, endereços, ações e navegação entre pedidos.
**Aceite:** fluxo completo (ver → mudar status → nota → reembolso) sem sair da tela.

Detalhes úteis para as próximas fases:

- Os helpers de pedido são puros (`features/orders/orderFormat.ts`); o que precisa dos dados da loja vem de `useOrderHelpers()` (preço na moeda do pedido, URL do editor clássico e as ações de status).
- Os cartões de extensão continuam funcionando: `ExtensionCardRender` repete o contrato do `ComponentRender` do Vue e aceita HTML, React e componentes Vue (via `applyVueInReact` do veaury).
- A tela React é opcional enquanto o editor de itens de pedido não for portado: o filtro `flexify-dashboard/woocommerce/react-orders` liga a tela; o padrão continua sendo a tela Vue, porque os redirecionamentos de "Adicionar pedido" e "Editar itens" apontam para rotas que só existem nela.
- **Kit:** `Modal` e `Sheet` perderam as animações de saída. O Radix mantém o nó fechado montado até a animação de saída avisar que terminou e, quando isso não acontece, o overlay invisível fica por cima da página engolindo todos os cliques.

### Fase 4 — WooCommerce: Editores (G) · **concluída em 07/10/2026**
Editor de produto (incluindo atributos, variações, downloads e vinculados) e editor de pedido (criação manual e edição de itens).
**Aceite:** salvar produto e pedido pelo React gera o mesmo payload validado nos testes de integração.

Detalhes úteis para as próximas fases:

- Com os editores portados, as duas telas do WooCommerce passam a usar React por padrão. Os filtros `flexify-dashboard/woocommerce/react-products` e `.../react-orders` continuam existindo como volta atrás para a tela Vue.
- `RichText` (`ui/RichText.tsx`) usa `@tiptap/react` com as mesmas extensões do editor Vue, então o HTML salvo é o mesmo. As imagens vêm da biblioteca de mídia do WordPress por `lib/wpMedia.ts`.
- `Popover` entrou no kit para painéis que não cabem num menu (as paletas de cor da barra do editor).
- `useUnsavedChanges()` avisa antes de fechar a aba; a navegação dentro do app é confirmada pelas próprias telas. O bloqueio do botão "voltar" do navegador exigiria trocar o `HashRouter` por um data router — ficou de fora.
- Falta portar da seção 4.7: `CodeEditor` (Ace), `ImageEditor`, `ImageSelect` e `SortableList`. Nenhum é usado pelas telas do WooCommerce; entram com as páginas de conteúdo.

### Fase 5 — Shell e painel (G) · **concluída**
Sidebar, toolbar, busca, notificações, menu do usuário, modo escuro e o painel com os widgets de e-commerce do TailAdmin.
**Aceite:** o shell React carrega em todas as telas do wp-admin; páginas ainda em Vue continuam funcionando dentro dele.

**Parte 1 — casca (concluída em 07/10/2026):** sidebar, toolbar, modo escuro e menu do usuário.

- O menu continua sendo lido do DOM do WordPress (`shell/menu/parse.ts`), porque o WordPress imprime o menu como marcação, não como dados. Os ícones vivem em pseudo-elementos `:before` da folha nativa, então o shell regrava essas regras para as classes novas (`shell/menu/iconStyles.ts`).
- `useAdminMenu()` junta o menu nativo com o menu personalizado publicado para o usuário, com cache por usuário em local storage; `reconcileMenu()` descarta o que o site não tem mais e acrescenta o que ganhou.
- `useColorScheme()` compartilha a chave `uipc_theme` e o evento `flexify-dashboard-theme-update` com o shell Vue, então os dois concordam sobre o tema enquanto coexistirem.
- Os estilos de layout da casca saíram do `<style>` do componente Vue para `apps/css/theme/admin-shell.css`, que as duas cascas importam — eles descrevem a mesma estrutura e precisavam estar em um lugar só.
- A casca React fica atrás do filtro `flexify-dashboard/react-shell` (desligado por padrão) até a busca e o painel de notificações irem junto.

**Parte 2 — busca (concluída em 07/10/2026):** paleta de comandos com Ctrl/⌘K.

- `useGlobalSearch()` procura no conteúdo (uma requisição por tipo de post que o site expõe) e no menu do admin ao mesmo tempo; o menu é casado em memória porque já foi lido para a sidebar.
- A sintaxe de comandos é a mesma da busca Vue (`>post`, `@user`, `#category`, `!action`, `?help`), e o histórico, os itens abertos recentemente e os mais usados compartilham as chaves de local storage com ela.
- Uma lista achatada única guia o teclado: o que está destacado é o que o Enter abre, independentemente do grupo em que aparece.
- Ficaram de fora o tutorial de primeira utilização e o diálogo de correção de layout (`layout-fix-dialog.vue`, 1.182 linhas), que são utilitários à parte.

**Parte 3 — notificações e barra do WordPress (concluída em 07/10/2026):**

- Os avisos nativos são escondidos onde estão, contados e **movidos** para o painel quando ele abre — mover preserva a marcação e os comportamentos que plugins prendem a ela. O hook guarda quais já moveu, porque os refs são anexados antes dos efeitos e o painel pode receber os avisos antes de eles serem escondidos.
- Os avisos publicados pelo plugin vêm da REST, filtrados por papel/usuário e por quem já dispensou.
- `WpToolbar` move a `#wpadminbar` para dentro da barra do shell, também sem recriá-la, para os seletores do núcleo continuarem valendo para outros plugins.
- A contagem usa `textContent` em vez de `innerText`: a resposta é a mesma para um aviso e não depende de layout, o que deixa o comportamento testável.

**Parte 4 — painel de e-commerce (concluída em 07/10/2026):** visão geral da loja com receita, pedidos, clientes e ticket médio, gráfico de receita, produtos mais vendidos e pedidos recentes, tudo pelo endpoint `woocommerce-dashboard` que já existia.

- O ApexCharts entra por import dinâmico: é a dependência mais pesada da tela e só o gráfico precisa dela. O gráfico é remontado quando o tema muda, que é o que faz o Apex adotar as cores novas.
- O painel React fica atrás do filtro `flexify-dashboard/react-dashboard` (desligado por padrão), porque **o painel Vue ainda é dono do registro de cartões** — os 18 grupos de cartões e a API de cartões de terceiros continuam lá.

**Parte 5 — grade de cartões (concluída em 07/10/2026):** o painel React passou a usar o registro de cartões (`assets/js/dashboard/registry.js`, JavaScript puro, aproveitado como está), com grade de 12 colunas, reordenação arrastando, redimensionamento preso às colunas, escolha de quais cartões aparecem e seletor de período — tudo guardado por categoria em local storage, como no painel Vue.

- Os quatro cartões da loja são React. **Um cartão Vue não renderiza no painel React:** ele usa globais (`__`, `sprintf`) que o app Vue dele fornecia, e o veaury cria o app em que monta sem deixar configurá-lo — `beforeVueAppMount` só vale para o `ReactMissVue` externo. Então cada cartão precisa ser portado; os 16 restantes continuam no painel Vue.
- Bug corrigido: `new Date('2026-10-07')` é meia-noite em UTC, que a oeste de Greenwich é o dia anterior. O período voltava um dia a cada recarga, porque era lido assim e reescrito na barra de endereços.

**Parte 6 — cartões restantes (concluída em 07/10/2026):** os 16 grupos que faltavam foram portados — conteúdo (posts recentes, agendados, comentários), site (mídia, saúde do servidor, usuários), analytics (visitantes, rejeição, páginas, países, origens, dispositivos, usuários ativos, visualizações), mapa de visitantes e Rank Math.

- `cards/shared.tsx` guarda o que todo cartão precisa: o período recebido, `useCardQuery`/`useCardList` (mesma chave para o mesmo pedido, então dois cartões que perguntam a mesma coisa recebem uma resposta só) e os três estados — carregando, erro e vazio.
- Os oito cartões de analytics falam com `analytics/stats` por um `useStats(statType, dateRange)` só; o do Mapbox carrega a biblioteca por import dinâmico e, sem chave configurada, mostra o caminho para as configurações em vez de um mapa vazio.
- Com os cartões todos em React, o filtro `flexify-dashboard/react-dashboard` passou a vir **ligado**. O painel Vue continua disponível desligando-o.
- Um cartão Vue de terceiros ainda renderiza pelo `CardRender`, desde que não dependa de globais que o app Vue do plugin fornecia.

### Fase 6 — Conteúdo (GG) · **em andamento**
Posts, mídia, comentários e usuários.

**Parte 1 — posts (concluída em 07/10/2026):** a tela de posts em React, com as duas visualizações, edição na linha e ações em lote.

- A lista **não vem da REST**: o plugin roda a `WP_List_Table` que o WordPress renderizaria em uma página escondida atrás do `admin.php` e imprime o resultado como JSON. É o único jeito de receber as colunas, as visões e as ações de linha que os plugins do site acrescentam, então a resposta chega como documento e o JSON é lido de dentro dele (`usePostsData.ts`).
- O que cada visão filtra é calculado no navegador (`viewParams`), e não lido da resposta: assim a primeira requisição já sabe o que `?view=pending` pede, em vez de depender de uma lista que seria descartada.
- As preferências de coluna guardam **chaves**, aplicadas sobre o que o servidor mandou — uma coluna que um plugin acrescentou depois aparece visível, no fim, e uma que sumiu é descartada. As chaves de local storage são as do Vue, então as duas telas concordam enquanto coexistirem.
- Não existe rota de lote na REST do WordPress, então cada ação em lote é uma requisição por post, **em sequência**: cem gravações paralelas é o que derruba uma hospedagem compartilhada.
- Colunas que a tela não conhece são impressas como o WordPress e os plugins as renderizaram; só título, status, autor e taxonomias têm tratamento próprio.
- `EntityPicker` entrou no kit (`react/data/`): escolher categorias, tags ou autores é a mesma coisa três vezes, e a busca acontece no servidor porque um blog com oitocentas categorias nunca mostraria a procurada filtrando no navegador.
- A tela React fica atrás do filtro `flexify-dashboard/react-posts`, **ligado** por padrão.

**Parte 2 — comentários (concluída em 07/10/2026):** a tela de comentários em React, com a lista, a moderação em lote e a edição de um comentário.

- Cada comentário traz o post junto (`_embed=up`): a tela Vue pedia o tipo de post e o post de cada um, o que seriam sessenta requisições por página de trinta — e, como o endpoint do WordPress não devolve `post_type` no comentário, a condição nunca era verdadeira e o título do post nunca aparecia.
- Não existe endpoint que conte comentários por status, então cada status é pedido com `per_page=1` e o total vem no cabeçalho: quatro requisições minúsculas em vez de quatro páginas inteiras.
- O corpo editado é o `raw` — o que foi escrito —, não o `rendered`, que é o que o site fez dele.
- A tela React fica atrás do filtro `flexify-dashboard/react-comments`, **ligado** por padrão.

### Fase 7 — Sistema (GG)
Plugins, configurações, activity log, database explorer, editor de papéis, construtor de menus, avisos e analytics.

### Fase 8 — Login e frontend (M)
Tela de login personalizada e scripts do frontend.

### Fase 9 — Remoção do Vue (M)
Tirar `vue`, `vue-router`, `pinia`, `reka-ui`, `veaury`, `vue-shadow-dom`, `vue-draggable-next`, `@tiptap/vue-3`, `vue3-apexcharts`, `@vuepic/vue-datepicker`; limpar entradas, código morto e documentação.
**Aceite:** nenhum arquivo `.vue` no plugin e bundles menores que os atuais.

### Fase 10 — QA e lançamento 4.0.0 (M)
Matriz de testes (WP e WooCommerce atuais e anteriores, HPOS ligado/desligado, PHP 7.4+, navegadores, RTL, papéis), acessibilidade, desempenho, traduções, changelog e release.

---

## 8. Dependências a instalar

Produção: `@tanstack/react-query`, `react-router-dom`, `@radix-ui/react-*` (dialog, dropdown-menu, tooltip, popover, select, checkbox, switch, tabs, scroll-area), `react-apexcharts`, `@tiptap/react`, `@dnd-kit/core` + `@dnd-kit/sortable`, `react-hook-form`, `react-day-picker`.
Desenvolvimento: `typescript`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`.

> Instalar esses pacotes baixa arquivos da internet, então peço sua autorização antes de rodar o `npm install`.

---

## 9. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Dois frameworks no mesmo plugin durante a migração | Separação por entrada: cada tela é de um framework só; shell migra na Fase 5, quando o kit já estiver maduro |
| Peso dos bundles | Code splitting por rota, `manualChunks` para React e Query, e medição do tamanho a cada fase |
| Extensões de terceiros que registram componentes Vue | `ComponentRender` mantém suporte a Vue via `veaury` até a Fase 9; comunicar a mudança no changelog |
| Perda de acessibilidade ao trocar `reka-ui` por Radix | Radix é a origem do reka-ui; manter os testes de nome acessível e foco |
| Regressão visual | Harness com as mesmas telas em React e Vue lado a lado durante a transição |
| Reescrita longa das telas grandes (painel, configurações) | Fases 6 e 7 fatiadas por página, cada uma com entrega própria |
| Perda de traduções | Rodar o extrator a cada fase; strings em inglês no código, como hoje |

---

## 10. Testes e QA por fase

- **Unitários:** funções puras (já existentes) + hooks e componentes com Vitest e Testing Library.
- **Integração (PHP):** `tests/integration/woocommerce-rest.php` e `woocommerce-redirects.php` continuam cobrindo o backend, que não muda.
- **Visual:** harness com dados simulados, em claro/escuro, 375 px e RTL.
- **Acessibilidade:** foco visível, navegação por teclado, nomes acessíveis e `aria-*` nos componentes do kit.

---

## 11. Pontos a confirmar antes de começar

1. Autorização para instalar as dependências da Fase 0 (seção 8).
2. Versão alvo **4.0.0** e changelog separado da 3.0.0.
3. Manter a página **Design System** como vitrine oficial do kit React (hoje aparece só com `WP_DEBUG`).
4. Mapa (`CountryMap`): manter Mapbox ou adotar o mapa vetorial do TailAdmin.
5. Editor de código (Ace): manter ou migrar para CodeMirror 6 na Fase 7.
