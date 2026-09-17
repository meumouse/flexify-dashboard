# Kit de componentes

Componentes Vue com as receitas do design system (TailAdmin). Ficam em `app/src/components/kit` e são importados de um único ponto:

```js
import { FdButton, FdCard, FdDataTable } from '@/components/kit';
```

Uma vitrine com todos os componentes fica em **Flexify Dashboard → Design System** (`admin.php?page=flexify-dashboard-design-system`), disponível quando `WP_DEBUG` está ativo ou pelo filtro `flexify-dashboard/design-system/enabled`.

## Referência rápida

| Componente | Principais props | Observações |
|---|---|---|
| `FdButton` | `variant` (primary, outline, secondary, danger, danger-outline, warning, success, ghost, link), `size` (xs, sm, md, lg), `icon`, `iconRight`, `iconOnly`, `loading`, `block`, `href` | Renderiza `<a>` quando `href` é informado. |
| `FdInput` | `v-model`, `label`, `hint`, `error`, `success`, `icon`, `prefix`, `suffix`, `size`, `clearable` | Atributos extras vão para o `<input>`. |
| `FdTextarea` | `v-model`, `label`, `hint`, `error`, `rows` | |
| `FdSelect` | `v-model`, `options` (`{ value, label }` ou grupos `{ label, options }`), `placeholder`, `label`, `size` | `<select>` nativo estilizado. Para busca/multiseleção use `components/utility/select`. |
| `FdSearchInput` | `v-model` (valor com debounce), `debounce`, `placeholder` | |
| `FdCheckbox` | `v-model` (boolean ou array + `value`), `label`, `description`, `indeterminate`, `size` (sm, md) | |
| `FdRadio` | `v-model`, `value`, `label`, `name` | |
| `FdSwitch` | `v-model`, `label`, `description`, `size` | |
| `FdField` | `label`, `hint`, `error`, `success`, `required` | Wrapper para controles personalizados. |
| `FdBadge` | `color` (primary, success, error, warning, info, orange, purple, light, dark), `variant` (light, solid), `size`, `icon`, `dot`, `pulse` | |
| `FdAlert` | `variant` (success, error, warning, info), `title`, `message`, `dismissible` | Slot `actions`. |
| `FdAvatar` | `src`, `name` (iniciais), `size`, `status` | |
| `FdCard` | `title`, `description`, `padding` (none, sm, md), `divided` | Slots `header`, `actions`, `footer`. |
| `FdPageHeader` | `title`, `description`, `breadcrumbs` | Slot `actions`. |
| `FdMetricCard` | `label`, `value`, `icon`, `tone`, `trend`, `loading` | |
| `FdStatStrip` | `items` (`{ key, label, value, hint, tone, clickable, active }`), `loading` | Evento `select`. |
| `FdTabs` | `v-model`, `items` (`{ value, label, count, icon }`), `variant` (underline, segmented) | Navegação por setas. |
| `FdDataTable` | `columns`, `rows`, `rowKey`, `loading`, `selectable` + `v-model:selected`, `v-model:sort`, `expandable` + `v-model:expanded`, `clickableRows` | Slots `cell-{key}`, `header-{key}`, `expanded`, `bulk-actions`, `empty`. |
| `FdPagination` | `v-model:page`, `v-model:per-page`, `total`, `perPageOptions` | Evento `change`. |
| `FdDropdown` | `items` (`{ label, icon, onSelect, danger, href }`, `{ separator }`, `{ heading }`), `align`, `side` | Slot `trigger` (use um botão). |
| `FdModal` | `v-model:open`, `title`, `description`, `size` (sm, md, lg, xl, full), `persistent` | Slots `header`, `footer`. |
| `FdSheet` | `v-model:open`, `title`, `description`, `side`, `size` | Painel lateral para edição rápida. |
| `FdConfirmDialog` | — | `await ref.value.show({ title, message, confirmLabel, variant })` retorna `true/false`. |
| `FdTooltip` | `text`, `side` | Slot `content`. |
| `FdDropzone` | `accept`, `multiple`, `pickerOnly` | Eventos `files` e `click`. |
| `FdEmptyState` | `icon`, `title`, `description`, `compact` | |
| `FdSkeleton`, `FdSpinner` | — | Controlados por classes. |

## Regras

- **Sobreposições** (modal, dropdown, tooltip, sheet) são renderizadas em `#fd-kit-portal`, um contêiner com `.flexify-dashboard-isolation` para receber os utilitários do Tailwind fora da raiz do app.
- **Classes compartilhadas** ficam em `recipes.js`. Os componentes legados de `components/utility` (app-button, text-input, toggle, checkboxes, modal, confirm, context-menu, notifications, tabs, select) usam as mesmas receitas e mantêm a API antiga.
- Use `cn()` de `@/lib/utils.js` para combinar classes — ele conhece os tokens do design system (`text-theme-sm`, `shadow-theme-xs`).
- Strings visíveis usam `__('Texto', 'flexify-dashboard')`.
