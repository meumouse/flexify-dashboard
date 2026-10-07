# Desenvolvimento

Passos para trabalhar no plugin a partir de um clone.

## Dependências

```bash
composer install --working-dir=admin
npm install --prefix app
```

`admin/vendor/` **não é versionado** — o `composer.lock` fixa as versões, e o diretório é recriado
pelo comando acima. Ele precisa existir antes de gerar o ZIP de release, porque o script copia a
pasta `admin` inteira do diretório de trabalho.

O autoload usa `classmap-authoritative`: **toda classe nova exige `composer dump-autoload -o`**
dentro de `admin/`, senão ela não é encontrada.

## Build

```bash
npm run build --prefix app
```

## Testes

```bash
npm test --prefix app
```

Os testes de integração com o WooCommerce rodam num site de desenvolvimento com o WooCommerce
ativo, dentro de uma transação revertida no final:

```bash
wp eval-file wp-content/plugins/flexify-dashboard/tests/integration/woocommerce-rest.php
```

## Traduções

Dentro de `languages/`:

```bash
npm run pot
npm run compile
```

`pot` extrai as strings de `.php`, `.js`, `.ts` e `.tsx`; `compile` gera o `.mo` e os JSON
que o `wp_set_script_translations()` carrega.
