# Flexify Dashboard

Aprimore sua experiencia administrativa no WordPress com uma interface elegante e de alto desempenho. O Flexify Dashboard oferece um tema administrativo moderno e intuitivo que combina beleza e funcionalidade.

### Instalação

#### Instalação via painel administrativo

Voce pode instalar o plugin pelo painel do WordPress:

* Acesse o painel de administração do site
* Siga para `Plugins > Adicionar novo`
* Envie o arquivo ZIP do plugin
* Clique em `Instalar agora`
* Depois clique em `Ativar plugin`

#### Instalação via FTP

Voce tambem pode instalar manualmente:

* Descompacte o arquivo ZIP em seu computador
* Conecte-se ao servidor via FTP
* Navegue ate `wp-content/plugins/`
* Envie a pasta `flexify-dashboard`
* Ative o plugin no painel do WordPress em `Plugins`

### Compatibilidade

Compativel com WordPress 6.0+ e PHP 7.4+.

### Build de distribuição

Para rodar a versão compilada do plugin, use o pacote gerado em `release/flexify-dashboard.zip`.

#### Gerar o arquivo ZIP de distribuição

Na raiz do plugin, execute:

```bash
npm run release
```

Esse comando:

* Recompila os arquivos do frontend em `app/dist`
* Monta um pacote de distribuicao somente com os arquivos necessarios do plugin
* Gera o arquivo `release/flexify-dashboard.zip`

Se o frontend já estiver compilado e você quiser apenas recriar o pacote final, execute:

```bash
npm run build:zip
```

Importante:

* O arquivo ZIP de distribuição exclui arquivos de desenvolvimento como `node_modules`, `app/src`, `docs`, `examples` e scripts auxiliares
* Para a versão compilada funcionar corretamente, instale o plugin a partir desse pacote final ou da pasta extraida dele