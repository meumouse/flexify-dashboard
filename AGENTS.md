# AGENTS.md — diretrizes e padrões do Flexify Dashboard

Este arquivo é a fonte única das regras do projeto. Vale para pessoas e para agentes.
Quando uma regra aqui conflitar com o que o código faz hoje, **a regra ganha** e o código está em dívida.

---

## 1. Arquitetura

**API First.** O frontend nunca lê a tela; lê a API.

- **Frontend:** React + TypeScript, Tailwind CSS v4, Vite. Fica em `app/src/react`.
- **Backend:** PHP expondo rotas REST. Fica em `admin/src/Rest`, namespace `MeuMouse\Flexify_Dashboard\Rest`.
- **Namespace REST:** `flexify-dashboard/v1`. Rotas do núcleo (`wp/v2/…`) e do WooCommerce (`wc/v3/…`) são usadas direto quando dão conta.
- **Quando o WordPress não fornece a rota que a tela precisa, ela é construída** em `admin/src/Rest`, com `permission_callback`, sanitização dos argumentos e paginação nos cabeçalhos `X-WP-Total` / `X-WP-TotalPages`.

**É proibido ler dados do DOM.** Nada de `DOMParser`, nada de `querySelector` em markup do WordPress para extrair informação, nada de raspar página escondida, nada de mover markup do WordPress para dentro da nossa interface. Se o dado não tem rota, a rota é criada.

Isso vale para tudo, sem exceção — inclusive a barra `#wpadminbar`, que é lida do `WP_Admin_Bar` e desenhada por componente nosso como qualquer outra coisa.

**O que não é leitura de DOM**, para não confundir: usar um elemento como ponto de montagem, mover `#wpcontent` para dentro da casca (é o que a casca faz), ou limpar HTML que veio da API antes de renderizar. O que se proíbe é tirar *informação* de markup.

**De onde o dado vem.** Quando a tela já está no admin e o dado é daquela tela, o PHP **imprime JSON na página** num `<script type="application/json">` — menu, avisos e barra fazem assim. Custa o mesmo que o markup custava e desenha na primeira pintura, sem request. A rota REST existe em paralelo, para quem precisa do mesmo dado fora de uma página do admin. Ler esse `<script>` nosso não é ler o DOM do WordPress: é o mesmo que `wp_localize_script`, com outra forma.

**O que não cabe em rota.** Um dado que só existe dentro de uma requisição do admin não vira rota REST, porque `is_admin()` é falso ali e metade dos plugins não registra nada. É o caso da lista de posts: as colunas vêm de `WP_List_Table`, e o WooCommerce carrega a classe que adiciona as dele atrás de `if ( $this->is_request( 'admin' ) )`. Nesses casos o endpoint fica onde está e devolve **JSON e nada em volta** — o que se corrige é o cliente parar de abrir um documento para achar o dado.

Referências: [WordPress REST API](https://developer.wordpress.org/rest-api/reference/) · [WooCommerce REST API](https://developer.woocommerce.com/docs/apis/rest-api/)

---

## 2. Componentes

**Todo controle de interface é componente React do kit.** Código de tela não escreve controle HTML cru.

Proibido em `app/src/react/features`, `shell` e `data`:

```
<select>   <input type="checkbox">   <input type="radio">
<input type="range">   <input type="color">   <input type="file">
```

Classe que estiliza controle nativo (`accent-brand-500`) também não, pela mesma razão: ela só existe porque alguém usou o controle cru.

O lugar de um controle nativo é dentro do kit, em `app/src/react/form`, embrulhado num componente. É lá que `<input>` e `<button>` nativos podem aparecer.

| Precisa de | Use |
|---|---|
| Escolher um de vários | `Select` |
| Escolher vários | `EntityPicker` ou `Checkbox` |
| Ligar/desligar | `Switch` |
| Valor numa faixa | `Slider` |
| Cor | `ColorPicker` |
| Texto, número, data, senha | `Input` |
| Texto longo | `Textarea` |
| Texto formatado | `RichText` |
| Arquivo do disco | `useFilePicker` |

**Rótulo:** `Input`, `Select` e `Textarea` têm `label` próprio, que associa o rótulo ao campo. `Field` é só para o que **não** é campo (um seletor customizado, um editor) — e aí o controle interno precisa de `aria-label`.

**Estruturas legadas do WordPress** dentro das nossas páginas: a seção é ocultada e refeita com componentes. Se faltar rota para alimentar o componente, ela é criada (seção 1).

---

## 3. Como o código é escrito

**Código-fonte em inglês.** Nome de variável, função, classe, arquivo, e **todo comentário**. Vale para TypeScript, PHP e CSS. A documentação em `docs/` e este arquivo ficam em português; o código, não.

**Comentário diz por quê, não o quê.** O código já diz o que faz. O comentário existe para o que não está escrito: a razão da escolha, o caso que obrigou aquela linha, a consequência de mudar.

```ts
// Bad: repeats the code.
// Loop over the posts and add them up.

// Good: says what the code cannot.
// The REST API has no batch route, so a bulk action is one request per post. They run in
// sequence: a hundred parallel writes is what takes a shared host down.
```

**Nada de menção a coprodução** — nem no código, nem em comentário, nem em mensagem de commit.

**Legível por gente.** Nome que se lê, função que cabe na cabeça, aninhamento raso. Se precisa de um comentário para explicar *o que* o trecho faz, o trecho está errado, não falta comentário.

---

## 4. SOLID e modularidade

Cada peça tem uma razão para existir e um motivo para mudar.

- **Responsabilidade única.** Um componente desenha; um hook busca dado; um módulo puro calcula. Quando os três estão no mesmo arquivo, a parte que dá para testar fica refém da que não dá. É por isso que a aritmética mora separada — `imageEdits.ts`, `menuEdits.ts`, `variationCombos.ts` — e tem teste próprio.
- **Aberto para extensão.** Variação nova entra por prop ou por registro, não por `if` novo no meio do componente.
- **Substituição.** Componente do kit aceita as props do elemento que ele embrulha, para poder ser usado onde o elemento seria.
- **Interface enxuta.** Props que ninguém usa não existem. Hook não devolve o que a tela não pede.
- **Inversão de dependência.** Tela fala com `useRest()`, não com `fetch`. Tela fala com `useConfirm()`, não com `window.confirm`.

**Reaproveite antes de escrever.** Antes de criar componente, hook ou método: procure. O kit tem 30 componentes, `@/react/data` tem os genéricos de dados, `@/shared` tem o que não é de framework nenhum. Terceira repetição de um trecho é sinal de que ele vira peça — a segunda, não necessariamente.

**Onde cada coisa mora**

| Camada | Lugar | O que pode |
|---|---|---|
| Kit de UI | `app/src/react/ui`, `app/src/react/form` | HTML nativo, nenhuma regra de negócio, nenhuma chamada de rede |
| Genéricos de dados | `app/src/react/data` | Componentes que falam com a API de forma genérica |
| Telas | `app/src/react/features/<tela>` | Compõe kit e hooks; não desenha controle cru |
| Casca | `app/src/react/shell` | Barra, menu, busca, avisos |
| Sem framework | `app/src/shared` | Cálculo puro, reaproveitado por qualquer lado |
| Rotas REST | `admin/src/Rest` | Permissão, sanitização, resposta |

---

## 5. Visual

### Raios

Quatro valores. Mais que isso é ruído.

| Classe | Onde |
|---|---|
| `rounded-sm` | badges e pills pequenos |
| `rounded-lg` | controles: botões, campos, itens de menu |
| `rounded-xl` | blocos dentro de um card |
| `rounded-2xl` | o card |
| `rounded-full` | só avatar e indicador circular |

Fora da escala não se usa: nada de `rounded`, `rounded-md`, `rounded-3xl` ou valor arbitrário.

Variar o lado **de um valor da escala** é permitido quando a forma pede — `rounded-t-2xl` no topo de um card com imagem, `rounded-s-2xl` num painel encostado na borda. O que é fixo é a escala, não o lado.

### Tipografia

**Um tamanho por tag**, em `app/src/assets/css/typography.css`. Vale no wp-admin inteiro:

| Tag | Tamanho | Classe | Variável |
|---|---|---|---|
| `h1` | 24px | `text-title-xs` | `--fd-title-xs` |
| `h2` | 20px | `text-theme-xl` | `--fd-text-xl` |
| `h3` | 16px | `text-theme-md` | `--fd-text-md` |
| `h4` | 14px | `text-theme-sm` | `--fd-text-sm` |
| `h5`, `h6` | 12px | `text-theme-xs` | `--fd-text-xs` |
| `p` | 14px | `text-theme-sm` | `--fd-text-sm` |
| `small` | 12px | `text-theme-xs` | `--fd-text-xs` |

A escada está ancorada no kit: `PageHeader` usa `h2` a 20px e `Card` usa `h3` a 16px, então componente e tag caem no mesmo valor.

O arquivo é importado **duas vezes**, porque uma camada só não cobre os dois lados do admin: `layer(base)` em `globals.css` para as telas nativas, e `layer(fd-isolation-scope)` em `_base.css`, **depois do preflight**, para as nossas. O preflight do Tailwind achata todo heading em `font-size: inherit` numa camada acima de `base`; sem a segunda importação a escada morre justamente onde a interface vive.

**Isso sobrepõe CSS de terceiros, de propósito.** `Plugin::layer_wordpress_styles()` joga todo `<link rel=stylesheet>` da página na camada `wordpress-base`, que fica **abaixo** de `base` — então a regra por tag ganha do núcleo do WordPress e dos outros plugins. Quem precisa do próprio tamanho ainda consegue, por `<style>` inline (que não é colocado em camada) ou `!important`. Não escreva "baixa especificidade" aqui: a camada manda mais que a especificidade.

Dentro de componentes, use a escala de classes do design system (`text-theme-2xs`, `text-theme-xs`, `text-theme-sm`, `text-theme-md`, `text-theme-lg`, `text-theme-xl`, `text-title-*`). **Não** use a escala crua do Tailwind (`text-sm`, `text-base`, `text-2xl`…) — ela existe no Tailwind mas não é a escala deste projeto.

**Em CSS nosso, use a variável `--fd-*`, nunca `--text-*`.** O bloco do Tailwind é `@theme inline reference`: ele embute o valor nas classes e **não publica** `--text-theme-sm` em lugar nenhum, então `font-size: var(--text-theme-sm)` não resolve nada. A escala de verdade mora em `:root`, em `globals.css`, como `--fd-text-sm` e `--fd-text-sm-leading` — mesmo arranjo da paleta (`--fd-base-*`). `rem` solto também não.

---

## 6. Responsividade

Toda tela trabalhada é verificada em **três larguras**: 375px (celular), 768px (tablet), 1440px (desktop).

O que se espera em cada uma:

- **375px:** sem rolagem horizontal. Tabela vira lista — o `DataTable` já faz isso sozinho, com `columns[].card` para escolher o que vai no cartão. Filtros empilham. Ações viram menu. Modal ocupa a tela.

Duas armadilhas que já custaram caro aqui:

- **`flex-1` tem base 0**, então um irmão que não encolhe nunca força a quebra de linha: o outro lado é espremido até sumir em vez de descer. Em tela estreita, use `w-full sm:w-auto` em vez de confiar no `flex-wrap`.
- **Largura mínima de coluna** (`min-w-64`) serve à tabela e atrapalha o cartão. Prefixe com o breakpoint: `sm:min-w-64`.
- **768px:** duas colunas onde fazia sentido ter duas.
- **1440px:** o layout cheio.

"Funciona no meu monitor" não é verificação. Abrir nas três é.

---

## 7. Como trabalhar

Destilado de [karpathy-guidelines](https://x.com/karpathy/status/2015883857489522876) (MIT).

### Pense antes de codar
- Declare suas premissas. Se não souber, pergunte.
- Se houver mais de uma leitura do pedido, apresente — não escolha calado.
- Se existe um caminho mais simples, diga. Discorde quando for o caso.

### Simplicidade primeiro
- Nada além do que foi pedido. Sem abstração para uso único, sem "flexibilidade" não solicitada, sem tratar erro impossível.
- Se escreveu 200 linhas e dava em 50, reescreva.

### Mudanças cirúrgicas
- Toque só no que precisa. Não "melhore" código vizinho, comentário ou formatação de passagem.
- Siga o estilo que está lá, mesmo discordando dele.
- Achou código morto não relacionado? **Avise, não apague.**
- Limpe o que a *sua* mudança deixou órfão — import, variável, função.
- O teste: toda linha alterada tem que remeter ao pedido.

### Critério verificável
Transforme a tarefa num alvo que se possa conferir:

- "Adicionar validação" → "escrever teste para entrada inválida e fazer passar"
- "Corrigir o bug" → "escrever teste que reproduz e fazer passar"

Para tarefa de vários passos, diga o plano antes: passo → como verifica.

---

## 8. Antes de commitar

```bash
cd app && npm run typecheck && npm test && npx vite build
```

PHP alterado: `php -l` em cada arquivo.

String nova visível ao usuário: regenerar o POT e traduzir (`languages/`, veja [docs/desenvolvimento.md](docs/desenvolvimento.md)).

**Mensagem de commit sem linha de coautoria.**

---

## 9. Testes que seguram padrão

Alguns padrões aqui são verificados por teste, porque comentário não segura nada:

- `app/src/react/ui/icons.test.ts` — falha se um nome de ícone não tiver arquivo em `assets/icons`.
- `app/src/react/ui/scales.test.ts` — falha se aparecer raio fora da escala ou tamanho de fonte da escala crua do Tailwind. A mensagem diz qual classe usar no lugar.
- `app/src/react/form/controls.test.ts` — falha se um controle HTML cru aparecer fora de `app/src/react/form`. A mensagem diz qual componente usar no lugar.

Os três leem o código como texto, com `app/tests/source-tree.ts`, que varre `app/src/react` e também `app/src/shared` — é de lá que vêm as classes compartilhadas, então é lá que elas se escondem.

Ao escrever um teste desses, **prove que ele pega alguma coisa**: insira a violação, veja falhar, tire. Um teste que varre a árvore errada passa sem olhar nada.

---

## 10. Documentação

| Assunto | Arquivo |
|---|---|
| Design system e tokens | [docs/design-system.md](docs/design-system.md) |
| Componentes do kit | [docs/componentes.md](docs/componentes.md) |
| Arquitetura de CSS | [docs/arquitetura-css.md](docs/arquitetura-css.md) |
| Ambiente, build, traduções | [docs/desenvolvimento.md](docs/desenvolvimento.md) |
| API de cartões do painel | [docs/dashboard-card-api.md](docs/dashboard-card-api.md) |
| WooCommerce | [docs/woocommerce.md](docs/woocommerce.md) |
| Plano de padronização (em curso) | [docs/planejamento-padronizacao-ui-api.md](docs/planejamento-padronizacao-ui-api.md) |
