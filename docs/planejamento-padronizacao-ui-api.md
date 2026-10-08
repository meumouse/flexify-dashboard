# Planejamento — Padronização de UI e arquitetura API First

> Documento de planejamento. Versão alvo: **4.1.0**.
> Referências: [WooCommerce REST API](https://developer.woocommerce.com/docs/apis/rest-api/) · [WordPress REST API](https://developer.wordpress.org/rest-api/reference/) · design system em [design-system.md](design-system.md).

## 1. O que foi medido

Levantamento em 07/10/2026, sobre `app/src/react`:

| Medida | Situação hoje |
|---|---|
| Raios de borda | 9 valores distintos: `rounded-lg` (61), `rounded-full` (60), `rounded-xl` (51), `rounded-2xl` (19), `rounded-md` (14), `rounded` (8), `rounded-t` (2), `rounded-sm` (2), `rounded-s` (1), `rounded-3xl` (1) |
| Tamanhos de fonte | 11 classes em duas escalas: a do design system (`text-theme-sm` 228, `text-theme-xs` 167, `text-title-sm` 2) e a crua do Tailwind (`text-sm` 65, `text-base` 63, `text-lg` 24, `text-xl` 22, `text-2xl` 16, `text-3xl` 10, `text-4xl` 7, `text-xs` 5) — **212 usos fora da escala do projeto** |
| Seletores | `form/Select.tsx` renderiza um `<select>` nativo, usado em 24 arquivos |
| Controles crus em tela | `<input type="checkbox">` em `SettingField.tsx` (2) e `LoginScreen.tsx` (1); `<input type="range">` em `ImageEditor.tsx`; `<input type="color">` em `settings/custom/index.tsx` |
| Responsividade (nº de breakpoints) | produtos 62 · pedidos 45 · mídia 12 · plugins 7 · painel 7 · usuários 6 · papéis 5 · posts 4 · menus 4 · registro 4 · configurações 3 · comentários 3 · login 3 · avisos 3 · **banco 1** · **barra do frontend 0** |
| Dados fora de REST | posts (raspa JSON de uma página escondida), menu lateral (lê `#adminmenu` do DOM), avisos (move `.notice` do DOM), barra do WP (move `#wpadminbar`) — **resolvido na fase 5** |

**O padrão:** as telas das fases 2–4 (produtos, pedidos) seguem o design system e são responsivas; as telas das fases 5–8 não. A causa é conhecida — foram validadas no harness, sem reabrir a referência nem testar em larguras diferentes.

## 2. Premissas

Declaradas porque mudam o resultado. Corrija-me onde estiver errado.

1. **"Seletor" = qualquer controle de escolha**, não só o dropdown: select, checkbox, radio, switch, slider, color, date. Todos devem ser componentes do kit.
2. **A padronização de fonte por tag vale no wp-admin inteiro** (decisão do projeto, contra a recomendação inicial de limitar ao container isolado). Escrevi aqui, errado, que a regra ficaria "de baixa especificidade, para plugin de terceiro continuar ganhando" — não é o que acontece: `Plugin::layer_wordpress_styles()` move todo `<link rel=stylesheet>` para a camada `wordpress-base`, abaixo de `base`, então a regra por tag ganha do núcleo e dos outros plugins. O custo real: telas de terceiros mudam de tamanho de fonte. Quem precisar do próprio tamanho tem `<style>` inline, que não entra em camada, e `!important`.
3. **"Ocultar a seção legada e refazer" vale para tudo, sem exceção**, inclusive a barra `#wpadminbar`: ela passa a ser lida por rota e desenhada por componente nosso. O custo é conhecido e aceito — plugins que dependem dos seletores `#wp-admin-bar-*` para injetar itens via JavaScript deixam de encontrá-los. Em troca, os itens passam a vir como dados e a barra deixa de ser a única parte da interface que não controlamos.
4. **Responsividade "máxima"** = três alvos verificados: 375px (celular), 768px (tablet), 1440px (desktop). Não é um breakpoint por tamanho de tela existente.

## 3. Decisões tomadas

Registradas com o que custam, porque daqui a seis meses ninguém lembra.

### 3.1 Lista de posts: REST estruturada × colunas de terceiros

Hoje a lista roda a `WP_List_Table` de verdade numa página escondida e devolve o HTML de cada célula. É por isso que colunas que outros plugins acrescentam (Yoast, WooCommerce) aparecem.

- **(A) Rota REST que continua renderizando as células** — API First de verdade (sem raspagem de HTML da página), colunas de terceiros continuam funcionando, mas o valor de cada célula continua sendo HTML opaco.
- **(B) Rota REST com dados estruturados** — mais limpa, ordenável e filtrável do lado do cliente, **mas perde toda coluna de terceiro**, porque elas só existem como `echo`.

**Decidido: (A).** Resolve o que o requisito pede — nada de raspar HTML da página, rota no namespace interno — sem quebrar integrações. O custo aceito é que o conteúdo da célula continua sendo HTML, então ordenar e filtrar por essas colunas segue sendo trabalho do servidor.

### 3.2 Dropdown nativo × Radix

O `<select>` nativo abre o seletor do sistema — que no celular é melhor que qualquer coisa que se construa. Trocar por Radix dá controle visual total e perde isso.

- **(A) Radix em tudo** — consistência visual completa.
- **(B) Radix no desktop, nativo no toque** — melhor UX, mais código.

**Decidido: (A).** O custo aceito é perder o seletor nativo do sistema no celular, que é melhor que qualquer dropdown construído. Se isso incomodar no uso real, (B) continua disponível sem refazer os call sites, porque a API do componente não muda.

### 3.3 Menu lateral: DOM × REST

O menu é construído pelos globais `$menu`/`$submenu` do PHP. Uma rota REST os expõe bem. O custo: hoje o menu é lido do HTML que já está na página, então aparece sem piscar; vindo de REST ele chega depois da primeira pintura.

**Decidido:** imprimir o menu como JSON no `<script>` da página — mesmo custo de hoje, sem raspar DOM — **e** expor a rota REST para quem precisar dela.

## 4. Fases

Cada fase tem critério verificável. Nenhuma começa antes de a anterior passar.

### Fase 1 — Governança do projeto (P) · concluída
Criar `AGENTS.md` com as diretrizes e padrões, e `CLAUDE.md` apontando para ele.

Conteúdo do `AGENTS.md`: arquitetura API First; React + Tailwind + Vite no frontend e PHP/REST no backend; proibição de controles HTML crus em código de tela; escala de raios; escala tipográfica por tag; alvos de responsividade; namespace REST interno; política de estruturas legadas; e as diretrizes do `karpathy-guidelines` (pensar antes de codar, simplicidade, mudanças cirúrgicas, critério verificável).

→ **Verificação:** os dois arquivos existem, e `CLAUDE.md` não duplica regra nenhuma — só referencia.

### Fase 2 — Escala tipográfica e de raios (M) · concluída
Definir a escala no CSS do design system e aplicar.

- Raios: reduzir de 9 para **4** — `sm` (badge/pill pequeno), `lg` (controles), `xl` (cards internos), `2xl` (cards) e `full` só para avatar/pill.
- Tipografia: um tamanho por tag dentro do container isolado (h1–h6, p, small), mais a escala de tokens para o resto. Eliminar os 212 usos da escala crua.

→ **Verificação:** um teste que varre `app/src/react` e falha se aparecer classe de raio ou de fonte fora da escala — o mesmo formato do teste de ícones que já existe.

**Resultado:** `app/src/react/ui/scales.test.ts`, escrito antes da troca para provar a conversão. 232 classes trocadas em 84 arquivos; 23 raios fora da escala e 209 tamanhos crus zerados. Três tokens entraram porque a escala não tinha o valor: `--text-theme-md` (16px) e `--text-theme-lg` (18px), que explicavam os 63 `text-base` e 24 `text-lg`, e `--text-theme-2xs` (10px), que substitui os quatro `text-[10px]`. O CSS nosso também passou a ler a escala em vez de `rem` — sobraram quatro valores crus, três deles na barra legada que a fase 5 apaga e um que é tamanho de glifo de ícone, não de texto.

Dois defeitos apareceram na verificação no navegador, nenhum dos dois visível em teste:

- O bloco do Tailwind é `@theme inline reference`, que embute o valor nas classes e **não publica** nenhum `--text-*`. A primeira versão do CSS por tag usava `var(--text-theme-sm)` e não resolvia nada — chegou a quebrar o corpo do app, que caiu de 14px para os 13px herdados do wp-admin. A escala passou a morar em `:root` como `--fd-text-*`, com o bloco do Tailwind apontando para lá, igual à paleta.
- O preflight do Tailwind achata todo heading em `font-size: inherit`, numa camada acima de `base`. Com a regra só em `base`, a escada valia nas telas nativas e morria dentro do nosso app — todo heading a 14px. O arquivo agora é importado também em `layer(fd-isolation-scope)`, depois do preflight. Conferido no navegador: a escada bate dos dois lados (24/20/16/14/12) e classe de componente continua ganhando do seletor de tag.

### Fase 3 — Kit de seletores em React (M) · concluída
Substituir todo controle cru por componente do kit.

- `Select` → Radix (`@radix-ui/react-select`), mantendo a API atual para não tocar nos 24 call sites.
- `Slider` novo (Radix) → `ImageEditor`.
- `ColorPicker` novo → `settings/custom`.
- Checkbox cru → `Checkbox` do kit em `SettingField` (2) e `LoginScreen` (1).

→ **Verificação:** teste que falha se `<select>`, `<input type="checkbox|radio|range|color">` aparecer fora de `app/src/react/form`. Suite verde. As 3 telas conferidas em 375/768/1440.

**Resultado:** `app/src/react/form/controls.test.ts`, provado com uma violação inserida de propósito antes de valer. O levantamento inicial tinha ficado curto: além dos cinco controles listados, havia um `<select>` nativo dentro do próprio `Pagination` e **quatro cópias** do mesmo `<input type="file">` escondido — mídia, biblioteca, plugins e importação de usuários, cada uma com o próprio `ref` e o mesmo reset de `value`. Viraram `useFilePicker`, uma cópia só.

Duas decisões mudaram em relação ao que estava escrito aqui:

- **A API do `Select` mudou**, ao contrário do que esta fase previa. Manter `onChange(event)` com Radix exigiria fabricar um `{ target: { value } }` falso; `onChange(value)` é honesto e o TypeScript apontou os 53 pontos de chamada, que foram trocados mecanicamente. Nenhum custo real — o plano previa evitar o trabalho, não evitar a mentira.
- **`ColorPicker` embrulha o controle nativo** em vez de recriá-lo. O seletor do sistema traz o conta-gotas, as cores recentes e a paleta que a pessoa já usa; recriar isso seria perder. A regra pede que o nativo more no kit, e é onde ele está.

Um defeito apareceu no caminho: `recipes.js` vive em `app/src/shared` e escapava do teste de escala da fase 2 — classes cruas sobrevivendo num arquivo que alimenta todo componente. O varredor passou a ler `app/src/shared` e `.js` também.

### Fase 4 — Responsividade das telas das fases 5–8 (G) · concluída
Na ordem do pior para o melhor: barra do frontend (0), banco (1), comentários/login/avisos/configurações (3), registro/menus/posts (4), papéis (5), usuários (6), painel/plugins (7).

Para cada uma: tabela vira lista em 375px, filtros empilham, ações viram menu, modais ocupam a tela toda no celular.

→ **Verificação:** cada tela aberta em 375/768/1440 sem overflow horizontal e sem elemento cortado. Capturas lado a lado no PR.

**Resultado:** as 16 telas varridas nas três larguras, nenhuma com rolagem horizontal nem container cortando o próprio conteúdo.

O trabalho não foi tela a tela como esta fase previa. A maior parte do problema era uma peça só: o `DataTable` mostrava a mesma tabela de oito colunas em 375px. Ele passou a desenhar cada linha como cartão abaixo de 640px, e com isso **doze telas** ficaram prontas de uma vez. A coluna escolhe seu lugar no cartão por `columns[].card`, e coluna sem rótulo já vai para as ações — então nenhuma tela precisou declarar nada.

A contagem de breakpoints, que foi como o problema se mediu na seção 1, provou ser um proxy ruim. A barra do frontend tem zero e está certa: é um logo, um espaçador e dois botões, não há o que rearranjar. O que encontrou defeito de verdade foi varrer o DOM procurando container cuja largura é menor que o conteúdo, ignorando o que corta de propósito (`truncate`, `line-clamp`, `overflow-x-auto`, `sr-only`).

Três defeitos reais, todos a mesma raiz:

- **`flex-1` tem base 0.** Na lista de plugins o nome era espremido a 19px em vez de a linha quebrar, porque o bloco de ações não encolhe e o outro encolhe até zero. Mesma coisa no `PageHeader`, onde o título caía para 52px. Os dois passaram a `w-full sm:w-auto`.
- **`min-w-64` na célula de produto** serve à tabela e estourava o cartão. Virou `sm:min-w-64`.
- **Duas colunas de meta a 375px** deixam 91px por valor, o que corta um e-mail no meio. A grade do cartão só abre em duas colunas a partir de 425px.

Uma escolha de implementação vale registro: a lista de cartões e a tabela são **uma árvore ou a outra**, escolhida em tempo de render por `useMediaQuery`, não as duas com uma escondida por CSS. Desenhar as duas põe cada linha duas vezes na página, que é o que o celular mais fraco paga; e foi o que a suíte denunciou na primeira tentativa, com cada texto aparecendo em dobro.

### Fase 5 — API First: eliminar leitura de DOM (G) · concluída
Rotas novas em `MeuMouse\Flexify_Dashboard\Rest`, namespace `flexify-dashboard/v1`:

- `GET /posts-table` — substitui a raspagem da página escondida (conforme decisão 3.1).
- `GET /admin-menu` — expõe `$menu`/`$submenu` (conforme decisão 3.3).
- `GET /admin-notices` — avisos como dados, no lugar de mover `.notice` do DOM.
- `GET /admin-bar` — percorre o `WP_Admin_Bar` e devolve os nós (id, título, href, pai, meta), para a barra ser desenhada por componente nosso em vez de movida do DOM.

Cada uma com permissão, sanitização e paginação nos cabeçalhos, como as rotas que já existem.

→ **Verificação:** `grep` por `DOMParser`, `querySelector('#adminmenu` e `querySelector('#wpadminbar` em `app/src/react` não retorna nada. `WpToolbar` deixa de existir, substituído por um componente que recebe dados. Teste de integração cobrindo as quatro rotas.

**Resultado:** três classes novas — `AdminMenu`, `WpNotices` e `AdminBar` — cada uma com a sua rota em `flexify-dashboard/v1` e, mais importante, **imprimindo o dado na própria página** como JSON. Imprimir mantém o que o DOM dava de graça: a casca desenha na primeira pintura, sem request. A rota responde o mesmo para quem não está numa página do admin, construindo o menu ou a barra por conta própria, já que fora do admin os globais estão vazios.

O `grep` da verificação retorna duas coisas, nenhuma delas leitura de DOM: `safeHtml` usa `DOMParser` para **limpar** HTML vindo da API antes de renderizar, e a barra do frontend usa `#wpadminbar` como **ponto de montagem** de um shadow root. A regra em `AGENTS.md` foi escrita de novo para dizer isso, porque como estava proibia as duas.

**A decisão 3.1 estava errada e não dava para implementar.** A opção (A) era "uma rota REST que continua renderizando as células". Não existe: numa requisição REST `is_admin()` é falso, e o WooCommerce — como quase todo plugin — carrega a classe que adiciona as colunas dele atrás de `if ( $this->is_request( 'admin' ) )`. A rota devolveria uma tabela sem nenhuma coluna de terceiro, que é exatamente o custo que fez a opção (B) ser recusada. O que era defeito de verdade era o cliente **abrir um documento HTML para achar o JSON lá dentro**; o endpoint ficou onde estava e passou a responder `wp_send_json`, e o cliente faz `JSON.parse`.

**Os ícones deixaram de ser copiados.** O menu lia o `content` do `:before` de cada ícone e reemitia tudo como folha de estilo. Agora um dashicon mantém a classe — a folha do próprio admin desenha o glifo —, um ícone que é URL vira `img`, e um menu cujo plugin pinta o ícone pelo CSS dele continua recebendo o id e as classes que esse CSS procura. Mesma ideia na barra.

**O que se perdeu, dito em voz alta:**

- Um plugin que procura `#wp-admin-bar-…` **por JavaScript**, depois da página carregada, não acha mais. O que ele registrou por `admin_bar_menu`, que é quase tudo, está lá.
- Um plugin que liga um botão dentro do **próprio aviso** por script de carregamento não acha o aviso, porque ele não está mais na página naquele momento. Links e formulários dentro do aviso continuam funcionando; o botão de dispensar passou a ser nosso.
- 130 linhas de CSS que existiam só para re-vestir a barra movida foram embora com ela.

### Fase 6 — Estruturas legadas dentro das nossas páginas (M) · concluída
Localizar seções que ainda saem como HTML do WordPress dentro de telas nossas, ocultar e refazer com componentes; onde faltar rota, criar no namespace interno.

→ **Verificação:** inventário no PR com o que foi encontrado, o que foi refeito e qual rota foi criada para cada caso.

**O que foi encontrado e refeito**

| Estrutura | Onde | O que foi feito |
|---|---|---|
| **Modal de mídia do WordPress** (`wp.media`) | 7 pontos: editor de produto (imagem, galeria, arquivo), variações (imagem, arquivo), fonte personalizada, campo de imagem das configurações, editor de texto rico | `useMediaPicker()`, do mesmo feitio de `useConfirm()`. Lê `wp/v2/media`, a mesma rota da tela de mídia — não foi preciso criar nenhuma. `wpMedia.ts` foi apagado, e com ele o último uso de `window.wp`. |
| **Nome do menu injetado como HTML** | barra lateral (3), paleta de comandos (1) | Desde a fase 5 o nome vem do servidor já sem tags e com as entidades decodificadas, então é texto. Passou a ser renderizado como texto — um título com `<` deixa de virar markup. |

**O que ficou como HTML injetado, e por quê** — oito pontos, todos declarados:

- **Célula da lista de posts** e **`price_html` do WooCommerce**: HTML que a própria API devolve pronto; é a decisão 3.1 e o formato de preço da loja.
- **Nota de pedido**: passa por `safeHtml`, que mantém só formatação simples e links.
- **Aviso em edição, aviso publicado, aviso do WordPress**: conteúdo autoral, escrito no nosso editor ou impresso pelo plugin que o criou (fase 5).
- **`CardRender`**: cartão de terceiro no painel, que é a API documentada em [dashboard-card-api.md](dashboard-card-api.md).

Nada mais no `app/src/react` toca `window.wp`, e o único `<iframe>` é a pré-visualização do post no site, que é conteúdo, não tela do admin.

### Fase 7 — QA e 4.1.0 (M) · parcial
Varredura das telas em 375/768/1440, claro e escuro, no **site real** — não no harness. Changelog e versão.

→ **Verificação:** a matriz preenchida com o que foi aberto de verdade, e o que não foi dito explicitamente.

**O que foi verificado:** as 17 telas, em 375 / 768 / 1440, claro e escuro, **no harness**. Nenhuma com rolagem horizontal e nenhum container cortando o próprio conteúdo, ignorando o que corta de propósito. Três defeitos saíram dessa varredura:

- O cabeçalho de página não quebrava linha em tela estreita, porque 11 telas embrulhavam os botões num segundo `flex` que o `PageHeader` já fazia. O embrulho saiu das 11.
- A paginação estourava a partir de sete páginas, por não quebrar linha.
- O título caía a 52px ao lado de ações que não encolhem — mesma raiz do defeito da lista de plugins.

**O que não foi verificado, e por quê:** nada disso rodou no site real. O MySQL do Local estava parado durante o trabalho, e o host é `flexify-dashboard.local`, onde não entro com senha. Isso importa mais que de costume nesta versão, porque **todo o PHP novo da fase 5 nunca executou** — só passou por `php -l`. O que precisa de um olhar na primeira vez que o site subir:

1. `AdminMenu::print_menu` — o menu aparece na barra lateral, com os ícones dos plugins instalados e as bolhas de contagem.
2. `AdminBar::take_over_rendering` — a barra aparece com os itens do WooCommerce e dos outros plugins, e o `#wpadminbar` nativo não é impresso duas vezes.
3. `WpNotices::capture_notices` — os avisos aparecem no painel de notificações e **não** sobram na página.
4. `PostsTables::render_page` — a lista de posts carrega, com as colunas que outros plugins acrescentam.
5. `useMediaPicker` — a biblioteca abre e envia arquivo.

A matriz do site real continua por preencher.

## 5. Ordem e por quê

Fases 1–3 antes da 4 porque a responsividade vai tocar quase todo arquivo de tela: fazer isso **depois** de fixar escala e seletores evita passar duas vezes no mesmo código. A 5 é independente e pode correr em paralelo com a 4 se houver mais de uma pessoa.

## 6. O que este plano não cobre

- As três telas cujo bundle nunca foi declarado (`PostEditor.js`, `CustomPostTypes.js`, `CustomFieldsMetaBox.js`) não entram aqui porque **já foram removidas** — eram código morto, nunca instanciado. Ver a seção 12 de `planejamento-frontend-react.md`.
- Nada aqui depende de rodar a matriz de versões do WordPress/WooCommerce, que continua pendente da fase 10 da migração anterior.

## 7. Onde isto chegou

| Medida | Antes | Agora |
|---|---|---|
| Raios de borda | 9 valores | 4, mais `full` — com teste |
| Tamanhos de fonte | 2 escalas, 212 usos da crua | 1 escala, 0 usos da crua — com teste |
| Controles HTML crus em tela | 6 declarados, 11 na prática | 0 — com teste |
| Telas com tabela ilegível em 375px | 12 | 0 |
| Dados lidos do DOM | posts, menu, avisos, barra | nenhum |
| Modal de terceiro dentro da interface | `wp.media`, em 7 lugares | nenhum |

Três testes seguram o que foi arrumado: `scales.test.ts`, `controls.test.ts` e `icons.test.ts`. Os três leem o código como texto e dizem o que usar no lugar quando falham.
