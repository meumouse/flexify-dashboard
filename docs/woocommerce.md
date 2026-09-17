# Gestão WooCommerce

O Flexify Dashboard substitui as telas de produtos e pedidos do WooCommerce por páginas Vue construídas com o kit do design system. As telas nativas continuam acessíveis a qualquer momento: todo link "tela clássica" / "editor clássico" adiciona `fd_classic=1` à URL, e esse parâmetro sempre desativa a substituição.

## Configurações

Em **Flexify Dashboard → Configurações → WooCommerce**:

| Opção | Padrão | O que faz |
|---|---|---|
| `use_modern_products_page` | ativada | Substitui `edit.php?post_type=product` pela lista moderna, categorias, atributos e cupons. |
| `use_modern_orders_page` | ativada | Substitui a lista e a edição de pedidos (HPOS e armazenamento legado) e a criação manual de pedidos. |
| `use_modern_product_editor` | desativada | Redireciona `post.php` / `post-new.php` de produtos para o editor Vue. Fica desligado por padrão porque muitas extensões adicionam metaboxes ao editor nativo. |

## Telas

### Produtos (`Products.js`, montado em `#fd-products-page`)

| Rota | Tela |
|---|---|
| `#/` | Lista com contadores, abas de status, filtros na URL (categoria, tipo, estoque, destaque, tag e faixa de preço), colunas visíveis, variações expansíveis, edição rápida e ações em massa (status, estoque, preço, categorias, destaque, lixeira). |
| `#/new`, `#/product/:id` | Editor de produto: geral, preços (com agendamento), estoque, entrega, arquivos para download, atributos, variações, produtos vinculados (upsell, cross-sell e agrupados), avançado, imagens (biblioteca de mídia do WordPress), categorias e tags. Avisa sobre alterações não salvas. |
| `#/categories` | Categorias hierárquicas. |
| `#/tags` | Tags de produtos com exclusão em massa. |
| `#/attributes` | Atributos globais e seus valores. |
| `#/coupons` | Lista e editor de cupons. |

### Pedidos (`Orders.js`, montado em `#fd-orders-page`)

| Rota | Tela |
|---|---|
| `#/` | Lista com contadores por status, receita líquida do período (7/30/90 dias), filtros (período, método de pagamento, canal, origem e cliente), aviso de novos pedidos, pré-visualização rápida, ações em massa e exportação CSV. |
| `#/order/:id` | Detalhes: itens, totais, reembolsos, linha do tempo de notas, cliente, endereços editáveis, pagamento, origem, ações do pedido, navegação para o pedido mais recente/antigo. |
| `#/new` | Criação manual: busca de produtos e variações, cliente (ou visitante), entrega, taxas, cupons, endereços, status e pagamento. |
| `#/order/:id/edit` | Edição de itens, entrega, taxas e cupons de pedidos pendentes ou aguardando. O WooCommerce recalcula os totais ao salvar. |

Com HPOS, `admin.php?page=wc-orders&action=edit&id=X` redireciona para `#/order/X` e `action=new` para `#/new`. No armazenamento legado, `post.php?post=X&action=edit` e `post-new.php?post_type=shop_order` fazem o mesmo.

## Dados e endpoints

As páginas usam a API `wc/v3` para CRUD e endpoints próprios em `flexify-dashboard/v1/woocommerce`:

| Endpoint | Uso |
|---|---|
| `GET products/summary` | Contagens por status e estoque (cache em transient). |
| `POST products/bulk` | Ações em massa de produtos. |
| `POST products/{id}/duplicate` | Duplica um produto como rascunho. |
| `GET orders/summary` | Contagens por status e receita do período (WooCommerce Analytics, com fallback). |
| `POST orders/bulk` | Status, lixeira, restauração e exclusão em massa. |
| `GET orders/{id}/context` | Dados que a `wc/v3` não expõe: estatísticas do cliente, URL da transação, suporte a reembolso do gateway, origem, ações do pedido, imagens/meta dos itens e quantidades reembolsadas. |
| `POST orders/{id}/action` | Executa ações do pedido (reenviar e-mails, regenerar permissões, ações de extensões). |

As configurações da loja (moeda, unidades, status, gateways, métodos de entrega, classes de imposto, permissões e URLs) chegam ao Vue pelo atributo `woocommerce-data` do script `#fd-woocommerce-script` e ficam em `appStore.state.woocommerce`. Use `useWooCommerce()` para acessá-las e para chamar as APIs (`wc()` e `fd()`).

## Testes

- **Unitários (JS):** as funções puras de preço (`app/src/composables/wooPrice.js`) e de combinação de variações (`app/src/pages/products/src/editor/variationCombos.js`) têm testes em `app/tests` (`npm test` dentro de `app/`).
- **Integração (WooCommerce real):** `tests/integration/woocommerce-rest.php` exercita produtos, variações, ações em massa, criação e edição de pedidos, filtros, contexto, notas, reembolsos, cupons, atributos e tags pela API; `tests/integration/woocommerce-redirects.php` cobre os redirecionamentos das telas nativas. Rode com `wp eval-file <arquivo>` num site de desenvolvimento com o WooCommerce ativo. Os testes rodam dentro de uma transação revertida no final (tabelas InnoDB) e bloqueiam o envio de e-mails.

## Pontos de extensão

### PHP

| Filtro | Descrição |
|---|---|
| `flexify-dashboard/woocommerce/page-enabled` | `( bool $enabled, string $page )` — liga/desliga a página `products` ou `orders`. |
| `flexify-dashboard/woocommerce/product-editor-enabled` | `( bool $enabled )` — liga/desliga o editor Vue de produtos. |
| `flexify-dashboard/woocommerce/order-statuses` | Lista de status (`value`, `label`, `color`) usada nos badges. Use para definir cores de status personalizados. |
| `flexify-dashboard/woocommerce/js-data` | Dados da loja enviados ao Vue. |
| `flexify-dashboard/woocommerce/order-context` | `( array $context, WC_Order $order )` — dados extras exibidos no detalhe do pedido. |
| `flexify-dashboard/woocommerce/order-custom-fields` | `( array $fields, WC_Order $order )` — campos personalizados (meta sem `_`) exibidos somente leitura no detalhe do pedido. |

Os filtros extras da lista de pedidos são enviados à `wc/v3/orders` como `fd_payment_method`, `fd_created_via` e `fd_origin` e aplicados pelo filtro `woocommerce_rest_shop_order_object_query` (colunas do HPOS ou meta no armazenamento legado).
| `woocommerce_order_actions` | As ações registradas por extensões aparecem no menu **Ações** do pedido. |

Alterações de status e reembolsos de pedidos são registrados no Activity Log quando ele está ativo.

### JavaScript

Cartões adicionais na lateral do detalhe do pedido podem ser registrados com o sistema de hooks:

```js
window.flexifyDashboard.addFilter('flexify-dashboard/orders/detail/sidebar', (cards, { order }) => [
  ...cards,
  {
    title: 'Nota fiscal',
    // Mesmo formato do ComponentRender: componente Vue, React (metadata.framework: 'react') ou HTML.
    component: MyInvoiceCard,
    metadata: { id: 'my-plugin-invoice' },
  },
]);
```

O componente recebe as props `order` (resposta da `wc/v3`) e `context` (endpoint `orders/{id}/context`).
