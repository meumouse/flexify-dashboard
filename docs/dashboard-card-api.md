# Dashboard Card API

Plugins externos podem registrar cards do dashboard via `window.flexifyDashboard.dashboard`.

## Regras de carregamento

- Enfileire seu bundle apenas na tela `dashboard`.
- Declare dependência de `flexify-dashboard-app-js`.
- A API nova não depende do evento legado `flexify-dashboard/dashboard/ready`.

## API pública

```js
const dashboard = window.flexifyDashboard?.dashboard;

dashboard.registerCategory({
  id: 'custom-category',
  label: 'Custom Category',
  order: 100,
});

dashboard.registerCard({
  id: 'custom-overview-card',
  type: 'card',
  category: 'overview',
  title: 'Custom Overview Card',
  framework: 'html',
  component: '<div>Card content</div>',
  width: 4,
  mobileWidth: 12,
});

dashboard.registerContainer({
  id: 'custom-ecommerce-container',
  type: 'container',
  category: 'ecommerce',
  title: 'Custom Commerce Group',
  width: 12,
  mobileWidth: 12,
  columns: 2,
  children: [
    {
      id: 'custom-ecommerce-child',
      title: 'Child Card',
      framework: 'html',
      component: '<div>Child content</div>',
      width: 6,
      mobileWidth: 12,
    },
  ],
});
```

## Categorias canônicas

- `overview`
- `analytics`
- `ecommerce`

Aliases legados aceitos:

- `site` => `overview`
- `e-commerce` => `ecommerce`

## Compatibilidade legada

Os filtros JS antigos continuam suportados:

- `flexify-dashboard/dashboard/categories/register`
- `flexify-dashboard/dashboard/cards/register`

O dashboard também mantém compatibilidade com:

- `metadata.language` => `framework`
- `isGroup: true` => `type: 'container'`
