# Kit de componentes

Componentes React com as receitas do design system (TailAdmin). Ficam em `app/src/react/ui` e `app/src/react/form`, e são importados de um ponto só:

```tsx
import { Button, Card, DataTable } from '@/react/ui';
```

Uma vitrine com todos eles fica em **Flexify Dashboard → Design System** (`admin.php?page=flexify-dashboard-design-system`), disponível quando `WP_DEBUG` está ativo ou pelo filtro `flexify-dashboard/design-system/enabled`.

> Código de tela usa estes componentes, nunca controle HTML cru. A regra e a lista do que é proibido estão em [AGENTS.md](../AGENTS.md).

## Referência rápida

| Componente | Principais props | Observações |
|---|---|---|
| `Button` | `variant` (primary, outline, secondary, danger, danger-outline, warning, success, ghost, link), `size` (xs, sm, md, lg), `icon`, `iconRight`, `iconOnly`, `loading`, `block`, `href` | Renderiza `<a>` quando `href` é informado. Com `iconOnly`, passe `aria-label`. |
| `Input` | `value`, `onChange`, `label`, `hint`, `error`, `success`, `icon`, `prefix`, `suffix`, `size`, `clearable`, `onClear` | O resto das props vai para o `<input>`. Use `label` — é ele que associa o rótulo ao campo. |
| `Textarea` | `value`, `onChange`, `label`, `hint`, `error`, `rows` | |
| `Select` | `value`, `onChange` (recebe o valor, não o evento), `options` (`{ value, label }` ou grupos `{ label, options }`), `placeholder`, `label`, `size` | Radix, não `<select>` nativo. Num teste, use `openSelect`/`chooseOption` de `app/tests/select.ts` — `userEvent.selectOptions` não alcança. |
| `SearchInput` | `value`, `onChange` (reporta depois da pausa), `debounce`, `placeholder`, `size` | Passe `aria-label`. |
| `Checkbox` | `checked`, `onCheckedChange`, `label`, `description`, `indeterminate`, `size` (sm, md) | |
| `Radio` | `checked`, `onSelect`, `label`, `description`, `name`, `value` | |
| `Switch` | `checked`, `onCheckedChange`, `label`, `description`, `size`, `labelPosition` | |
| `Slider` | `value`, `onChange`, `min`, `max`, `step`, `label`, `valueLabel`, `hint` | Radix. `valueLabel` aparece no fim da linha do rótulo. |
| `ColorPicker` | `value`, `onChange`, `label`, `hint`, `error` | Abre o seletor do sistema, com o eyedropper e as cores recentes. |
| `DatePicker` | `value` e `onChange` (`YYYY-MM-DD`, vazio para nenhum), `label`, `hint`, `error`, `required`, `placeholder`, `size`, `min`, `max` | Calendário nosso no lugar de `<Input type="date">`. Setas, PageUp/PageDown (Shift muda o ano), Home/End. "Limpar" some com `required`. |
| `DateRangePicker` | `value` e `onChange` (`{ from, to }`), `presets`, `label`, `required`, `size`, `max`, `align` | Primeiro clique é uma ponta, o segundo a outra; `onChange` só dispara com as duas. `recentPresets()` traz 7/30/90 dias, este mês e o mês passado. |
| `Dropzone` | `onFile`, `accept`, `title`, `hint` | Arrastar ou clicar. Arquivo solto fora do `accept` é recusado com aviso — o diálogo filtra sozinho, o arrastar não. |
| `useFilePicker` | `{ accept, multiple, onPick }` → `{ open, picker }` | Hook. Chame `open()` no clique do botão e renderize `{picker}` em qualquer lugar da árvore. |
| `Field` | `label`, `htmlFor`, `hint`, `labelSuffix`, `error`, `success`, `required` | Só para o que **não** é campo do kit. O controle interno precisa de `aria-label`. |
| `EntityPicker` | `endpoint`, `toItem`, `value`, `onChange`, `multiple`, `placeholder`, `params`, `chosen`, `trigger` | Em `@/react/data`. Busca no servidor. |
| `Badge` | `color` (primary, success, error, warning, info, orange, purple, light, dark), `variant` (light, solid), `size`, `icon`, `dot`, `pulse` | |
| `Alert` | `variant` (success, error, warning, info), `title`, `message`, `dismissible`, `actions` | |
| `Avatar` | `src`, `alt`, `name` (iniciais), `size`, `status`, `rounded` | |
| `Card` | `title`, `description`, `padding` (none, sm, md), `divided`, `actions`, `header`, `footer` | |
| `PageHeader` | `title`, `description`, `breadcrumbs`, `actions` | |
| `MetricCard` | `label`, `value`, `icon`, `tone`, `trend`, `trendLabel`, `loading` | Ícone em quadrado, rótulo, número, badge de variação. |
| `StatStrip` | `items` (`{ key, label, value, hint, tone, clickable, active }`), `loading`, `onSelect` | |
| `Tabs` | `value`, `items` (`{ value, label, count, icon, disabled }`), `onChange`, `variant` (underline, segmented), `ariaLabel` | Navegação por setas. |
| `DataTable` | `columns`, `rows`, `rowKey`, `loading`, `emptyIcon`/`emptyTitle`/`emptyDescription`/`emptyAction`, `selectable` + `selected`/`onSelectedChange`, `sort`/`onSortChange`, `expandable` + `expanded`/`onExpandedChange`, `clickableRows`/`onRowClick`, `bulkActions` | `columns[].cell` desenha a célula; `renderExpanded` desenha a linha aberta. **Abaixo de 640px a tabela vira lista de cartões**: `columns[].card` escolhe o lugar de cada coluna no cartão (`title`, `meta`, `actions`, `hidden`). Coluna sem `label` já vai para as ações, então na maioria das telas não é preciso declarar nada. |
| `ProgressBar` | `value`, `max`, `tone` (brand, success, warning, error), `size` (sm, md), `showValue`, `label` | `role="progressbar"`. Passe `label` quando não houver rótulo visível ao lado. |
| `TableCard` | `tabs`, `search`, `filters`, `activeFilters` (`{ key, label, onRemove }`), `onClearFilters`, `tools`, `busy`, `notice`, `footer` | Em `@/react/data`. A moldura de toda lista: abas, barra (busca, botão "Filtros", ferramentas), chips dos filtros ativos, aviso, linhas e rodapé. O botão "Filtros" só aparece com `filters`; abre um popover e, abaixo de 640px, um painel lateral. Os filtros valem na hora, sem botão de aplicar. Num teste, abra o painel com `openFilters` de `app/tests/filters.ts`. |
| `Pagination` | `page`, `perPage`, `total`, `onPageChange`, `onPerPageChange`, `perPageOptions`, `showPerPage` | |
| `DropdownMenu` | `items` (`{ label, icon, onSelect, danger, href }`, `{ separator }`, `{ heading }`), `trigger`, `align`, `side`, `width` | `trigger` deve ser um botão. |
| `Popover` | `trigger`, `align`, `side`, `className`, `open`, `onOpenChange` | Para conteúdo que não é menu. Controlado quando o painel precisa se fechar sozinho depois de uma escolha. |
| `Modal` | `open`, `onOpenChange`, `title`, `description`, `size` (sm, md, lg, xl), `persistent`, `hideClose`, `tone`, `footer` | Com `tone` (success, error, warning, info) vira modal de alerta: ícone em círculo, título e texto centralizados, botões no centro. O `useConfirm` usa. |
| `Sheet` | `open`, `onOpenChange`, `title`, `description`, `side`, `size`, `persistent`, `bare`, `header`, `footer` | Painel lateral. |
| `Tooltip` | `text`, `side`, `delay` | Envolve o elemento. |
| `RichText` | `value`, `onChange`, `placeholder`, `minHeight` | Tiptap. |
| `EmptyState` | `icon`, `title`, `description`, `compact` | |
| `Skeleton`, `Spinner` | `className` | |
| `PageSkeleton` | — | O formato de uma tela antes de ela chegar: use como `fallback` do `Suspense` das rotas. |
| `Icon` | `name`, `className`, `title` | `name` é o arquivo em `assets/icons` sem a extensão — um nome sem arquivo desenha um quadrado vazio, e há teste para isso. |
| `CardRender` | `card`, `props` | Desenha cartão de terceiro (HTML ou React). |

## Confirmação e avisos

Não são componentes, são hooks de contexto:

```tsx
const confirm = useConfirm();            // @/react/app/ConfirmProvider
const { notify } = useNotify();          // @/react/app/ToastProvider
const pickMedia = useMediaPicker();      // @/react/app/MediaPickerProvider

if (await confirm({ title, message, confirmLabel, variant: 'danger' })) { … }
notify({ tone: 'success', title: __('Pronto') });
notify({ title: __('Movido para a lixeira'), action: { label: __('Desfazer'), onClick: restore } });

const [image] = await pickMedia({ title: __('Escolher imagem'), type: 'image' });
```

`notify` aceita uma `action`: um botão no aviso, que o fecha ao ser usado. Ofereça só quando a ação tem um contrário exato — mover para a lixeira tem; excluir de vez, não.

`useConfirm` desenha o modal de alerta: ícone de erro com `variant: 'danger'`, de informação nos outros casos.

`useMediaPicker` abre a biblioteca de mídia **nossa**, lendo o mesmo `wp/v2/media` que a tela de mídia usa. Substituiu `wp.media`, o modal do WordPress. Opções: `title`, `button`, `multiple`, `type` (`image`, `video`, `audio`, `document`, `font`, ou `''` para tudo). Devolve `{ id, src, url, title, alt }[]`, vazio se a pessoa fechar.

## Regras

- **Sobreposições** (modal, dropdown, tooltip, popover, sheet) são renderizadas em `#fd-kit-portal`, um contêiner dentro de `.flexify-dashboard-isolation`, para receberem os utilitários do Tailwind fora da raiz do app.
- **Classes compartilhadas** ficam em `app/src/react/ui/recipes.ts`, que reexporta `app/src/shared/recipes.js`.
- Use `cn()` de `@/react/lib/cn` para combinar classes — ele conhece os tokens do design system (`text-theme-sm`, `shadow-theme-xs`).
- Strings visíveis usam `__('Texto')` de `@/react/lib/i18n` (o domínio já é o do plugin).
