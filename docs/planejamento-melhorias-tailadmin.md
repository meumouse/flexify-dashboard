# Planejamento — Melhorias visuais e de experiência a partir do TailAdmin

> Documento de planejamento. Versão alvo: **4.2.0** (a confirmar).
> Referência: [demo.tailadmin.com](https://demo.tailadmin.com/) (edição Pro, 87 páginas). Design system em [design-system.md](design-system.md), regras em [AGENTS.md](../AGENTS.md).

## 1. O que foi analisado

Levantamento em 08/10/2026. Foram abertas as 87 páginas do menu do demo. Elas se dividem assim:

| Grupo | Páginas | Interessa ao plugin? |
|---|---|---|
| Painéis | ecommerce, analytics, marketing, crm, stocks, saas, logistics, ai, sales, finance | **Sim.** Mostram a anatomia dos cartões e dos gráficos |
| E-commerce | products-list, add-product, billing, invoices, single-invoice, create-invoice, transactions, single-transaction | **Sim.** É o equivalente direto de produtos e pedidos |
| Páginas de app | calendar, profile, task-list, task-kanban, file-manager, api-keys, integrations, ai-settings, support-tickets, support-ticket-reply | **Sim**, como padrão de tela (perfil, configurações, mídia, integrações, kanban, calendário) |
| Formulários e tabelas | form-elements, form-layout, basic-tables, data-tables | **Sim.** Mostram estados, grupos e paginação |
| Elementos de UI | alerts, avatars, badge, breadcrumb, buttons, buttons-group, cards, carousel, dropdowns, images, links, list, modals, notifications, pagination, popovers, progress-bar, ribbons, spinners, tabs, tooltips, videos | **Em parte.** Conferir o kit contra eles |
| Gráficos e mapas | line, bar, pie, radar, radial, maps, vector-maps | **Sim**, para o painel |
| Layouts | layout-one … layout-six | **Sim.** São variações de casca |
| Autenticação e sistema | signin, signup, reset-password, two-step-verification, 404, 500, 503, maintenance, coming-soon, success | **Em parte.** Login e páginas de erro |
| Fora do contexto | geradores de IA, chat, inbox, pricing, faq, stocks, logistics | **Não** (seção 6) |

Do lado do plugin, o inventário foi feito **no código** (`app/src/react`). O site local estava fora do ar (502 no Local), então nenhuma tela do plugin foi vista rodando. Antes de começar qualquer fase, é preciso abrir a tela real e conferir o que está escrito aqui.

## 2. Padrões do TailAdmin que valem para nós

Essa é a parte que se repete em todas as telas. É ela que dá a sensação de "produto acabado", mais do que qualquer componente sozinho.

### 2.1 Anatomia de página

1. **Linha de título.** `h2` à esquerda e **breadcrumb à direita** ("Home › Products"), na mesma linha, fora do cartão.
2. **Cartão da lista.** O cabeçalho tem título, subtítulo de uma linha ("Track your store's progress…") e as ações à direita: secundária `Export` e primária `+ Add Product`.
3. **Barra de ferramentas.** Fica dentro do cartão, colada no cabeçalho, com uma divisória entre eles. Busca à esquerda e **botão `Filter` à direita**. O botão abre um popover com os selects e um `Apply`. Os filtros não ficam espalhados numa fileira.
4. **Tabela.** O cabeçalho é cinza-claro e as colunas ordenáveis têm seta dupla. O status aparece como badge claro. A última coluna é um `⋯` que abre um dropdown.
5. **Rodapé.** "Showing 1 to 10 of 50" à esquerda, paginação à direita, e às vezes "Show [10] entries".
6. **Recorte por status** (invoices, tickets, tasks). Uma faixa de KPIs fica acima. Abas com contador ficam no cabeçalho do cartão: "All 11 · To do 3 · In Progress 4".

### 2.2 Telas de detalhe (single-transaction, single-invoice, profile)

- **Faixa de cabeçalho em cartão próprio.** Mostra o ID, o badge de status e a data, com as ações à direita (`View Receipt`, `Refund`).
- **Grade 2/3 + 1/3.** O conteúdo principal fica à esquerda (itens e resumo alinhado à direita). A coluna lateral tem um cartão de cliente com pares rótulo/valor e um **Order History** em linha do tempo vertical, com ícone por evento e horário à direita.
- **Perfil.** Abre com um cartão-herói (avatar, nome, cargo, local e redes sociais). Abaixo vêm cartões de informação, cada um com botão `Edit` que abre **modal** de edição (os dados não ficam editáveis direto na página). No fim, os cartões **Security** e **Danger Zone**.
- **Fatura (single-invoice).** Tem um layout próprio para impressão: blocos De/Para, tabela de itens, resumo e botão `Print`.

### 2.3 Configurações (ai-settings)

- **Navegação secundária** em coluna, com **grupos de seção** em caixa-alta pequena (ACCOUNT, FEATURES).
- Cada configuração é **uma linha**: rótulo e descrição à esquerda, controle à direita (switch, botão ou campo). As linhas são agrupadas em cartões com título de seção.
- A ação perigosa fica isolada num cartão **Danger Zone**.
- O seletor de "workspace" fica no topo da navegação.

### 2.4 Painéis

- **Faixa de KPIs num cartão só** ("Overview", no saas). É um cartão com divisórias verticais, não quatro cartões soltos. Tem o período em botões segmentados (Weekly · Monthly · Yearly) e um botão `Filter`.
- **O KPI traz contexto.** Mostra a variação em badge (`+2.5%`) e o texto "vs last month". Alguns trazem **sparkline** (Churn Rate, User Growth).
- **Cartão de meta.** "Monthly Target" usa um gráfico radial semicircular, uma frase de leitura ("You earn $3287 today, it's higher than last month") e três números no rodapé (Target, Revenue, Today).
- **Tabela compacta dentro de cartão** (Top Channels, Top Pages): duas colunas, e às vezes uma barra de progresso proporcional.
- **Biblioteca de gráficos**, todos ApexCharts, que é o mesmo que usamos: barras empilhadas, horizontais e agrupadas; rosca com legenda; meia-rosca; radial de vários anéis; e mapa vetorial com heatmap.
- O `⋯` no canto de cada cartão abre "View More / Delete".

### 2.5 Mídia (file-manager)

- **Blocos por tipo** (Image, Videos, Audio, Docs), cada um com ícone em quadrado colorido, "% Used", número de arquivos e tamanho.
- **Cartão de armazenamento** em rosca, com o total no centro.
- **Arquivos recentes** em tabela compacta.

### 2.6 Formulários (form-elements, form-layout)

- **Estados com mensagem:** erro, sucesso e desabilitado, cada um com ícone dentro do campo e texto abaixo.
- **Grupo de entrada:** prefixo em select (DDI de telefone) e ícone de bandeira de cartão.
- **Seleção múltipla em chips.**
- **Data e hora** com seletor próprio (flatpickr), não o nativo do navegador.
- **Dropzone** de arrastar arquivos, com área tracejada e ícone.
- **Layout em seções.** Cartão "Personal Info" e cartão "Address" com campos em grade de 2 colunas.

### 2.7 Sobreposições e retorno

- **Modais.** Há quatro: padrão, centralizado com ícone de sucesso, com formulário e tela cheia. Também há **modais de alerta** (success, info, warning, danger), com ícone grande em círculo e um botão.
- **Toasts** com título e descrição, ícone por tom e fechar. Há também toast com ações (padrão "cookie": dois botões).
- **Barra de anúncio** no topo do conteúdo: "New update! Available…", com `Later` e `Update Now`.
- **Tooltips** em branco e escuro, com e sem seta, em quatro posições. **Popovers** com botão ou link.

### 2.8 Casca (layouts 1–6)

| Layout | O que muda | Valor para o plugin |
|---|---|---|
| 1 | Clássico: sidebar de 290px e header | É o que temos |
| 2 | Sidebar `bg-gray-50` com **títulos de grupo** (General, Projects, API Reference) | Agrupar o menu do WP, que é longo |
| 3 / 4 / 5 | **Seletor no topo** da sidebar e **busca dentro da sidebar** | Filtrar menu com 40+ itens |
| 6 | **Trilho de ícones** de 92px, com tooltip no item | Modo compacto permanente |

Em todos os layouts, o header tem busca com `⌘K`, alternância claro/escuro, sino com ponto de não lido e menu do usuário. O sino abre **itens com avatar, texto, projeto e "5 min ago"**, mais um "View All Notifications".

### 2.9 Autenticação e páginas de sistema

- **Login dividido.** O formulário fica à esquerda (com "Back to dashboard", botões sociais, divisor "Or", "Keep me logged in" e "Forgot password?"). À direita fica um painel de marca com fundo em grade e o logo.
- **Verificação em duas etapas:** seis caixas de um dígito e "Resend".
- **404 / 500 / 503 / Maintenance / Coming soon / Success:** ilustração central, uma frase e "Back to Home Page".

## 3. Comparativo com o plugin

**Legenda:** ✅ já existe · 🟡 parcial · ❌ falta.

### 3.1 Kit de UI

| Item do TailAdmin | Plugin | Observação |
|---|---|---|
| Button (variantes, ícone, loading) | ✅ | `ui/Button` tem mais variantes que o TailAdmin |
| Badge (claro/sólido, ícone) | ✅ | `ui/Badge` |
| Alert | ✅ | |
| Avatar com status | ✅ | |
| **Avatar group** | ❌ | |
| Tabs (sublinhado e segmentado) | ✅ | Radix |
| **Button group** | 🟡 | `Tabs` segmentado cobre o seletor de período. Falta o grupo de ações |
| Breadcrumb | 🟡 | Só existe dentro de `PageHeader` |
| Pagination | ✅ | |
| Dropdown, Popover, Tooltip | ✅ | Tooltip só no tom escuro |
| Modal (tamanhos) | 🟡 | Faltam a **tela cheia** e o **modal de alerta** com ícone |
| Sheet (gaveta) | ✅ | Não existe no TailAdmin |
| Toast | 🟡 | `useNotify` existe. Conferir se tem título + descrição e **ações** |
| **Barra de anúncio** | ❌ | |
| **Progress bar** | ❌ | A mídia desenha a própria |
| Spinner, Skeleton, EmptyState | ✅ | |
| Input com estados, prefixo e sufixo | ✅ | |
| **Seleção múltipla em chips** | 🟡 | `EntityPicker` resolve para entidades. Não há genérico |
| **Date / date range picker** | ❌ | As telas usam `<Input type="date">` nativo. Estava planejado e não foi feito |
| **Dropzone** | ❌ | Existe só dentro da mídia. Estava planejado e não foi feito |
| **Accordion** | ❌ | |
| **Entrada de código (OTP)** | ❌ | Só seria necessária se houver 2FA |

### 3.2 Telas

| Padrão do TailAdmin | Plugin | Observação |
|---|---|---|
| Linha de título + breadcrumb à direita | 🟡 | `PageHeader` tem breadcrumb. Conferir posição e uso em todas as telas |
| Cartão de lista (cabeçalho + toolbar + tabela + rodapé) | 🟡 | O `DataTable` não traz toolbar nem rodapé. Cada tela monta o seu, e é aí que as telas divergem |
| Filtro em popover com `Apply` | ❌ | Os filtros são uma fileira de `Select` |
| Abas de status com contador | ✅ | Produtos, pedidos |
| Faixa de KPIs | ✅ | `StatStrip` |
| Detalhe de pedido 2/3 + 1/3 com linha do tempo | 🟡 | `/order/:id` tem linha do tempo de notas. Alinhar a anatomia |
| Fatura imprimível | ❌ | |
| Perfil (herói + cartões + modal de edição + Danger Zone) | 🟡 | `/user/:id` tem painéis. Falta a estrutura |
| Configurações com navegação agrupada e linhas rótulo/controle | 🟡 | São 17 categorias **sem grupos** |
| Integrações em grade de cartões | ❌ | Hoje é uma categoria de configurações |
| Mídia com blocos por tipo e armazenamento | 🟡 | Há grade, lista e filtros. Não há visão geral |
| Kanban | ❌ | `@dnd-kit` estava planejado e não foi instalado |
| Calendário | ❌ | |
| Painel com KPIs, sparkline, meta radial, rosca e mapa vetorial | 🟡 | Tem 20 cartões, `MetricCard` e área/barra. Faltam sparkline, radial, rosca e mapa vetorial (hoje é Mapbox) |

### 3.3 Casca

| Item | Plugin | Observação |
|---|---|---|
| Sidebar 290/90 com hover | ✅ | |
| Títulos de grupo no menu | ❌ | |
| Busca dentro da sidebar | ❌ | A paleta `⌘K` cobre a busca global, mas não filtra o menu à vista |
| Trilho de ícones | ❌ | |
| Paleta de comandos | ✅ | O plugin vai além do TailAdmin, que tem só um campo de busca |
| Notificações com avatar e tempo | 🟡 | `NotificationsPanel` mostra avisos do WP. Conferir a anatomia do item |
| **Sidebar redimensionável** | ❌ | **Dívida:** a opção `sidebar_resizable` existe em `settings-config.js` e `Default_Options.php`, mas nada em `app/src/react` a usa |

### 3.4 Autenticação e sistema

| Item | Plugin |
|---|---|
| Login | ✅ (`LoginScreen.tsx`). Conferir se o layout dividido é uma opção |
| Redefinir senha | ✅ |
| Cadastro | ❌. Só importa se o site permite registro |
| 2FA | ❌ |
| 404 dentro do app (rota desconhecida no roteador React) | ❌ |
| Manutenção / em breve | ❌ |

## 4. Premissas e perguntas abertas

Premissas que mudam o resultado. Corrija onde estiver errado.

1. **O objetivo é anatomia e consistência, não copiar telas.** O TailAdmin é um catálogo. Uma tela dele só entra se houver dado do WordPress ou do WooCommerce para alimentá-la.
2. **Componente novo só entra se uma tela existente for usá-lo na mesma fase.** É o que pede o AGENTS.md, seção 7: nada de abstração para uso único. Por isso carrossel, fita e vídeo ficam de fora.
3. **A cor de destaque continua `#008aff`.** A decisão de 16/09/2026 está mantida.

Perguntas que precisam de resposta antes da fase indicada:

- **Fase 5:** trocar Mapbox pelo mapa vetorial do TailAdmin (jsvectormap)? A pergunta já estava aberta em `planejamento-frontend-react.md`. O mapa vetorial não precisa de token nem de rede e combina com o resto, mas perde o zoom de rua.
- **Fase 6:** o modo de layout da casca (agrupado / trilho / clássico) vira uma opção nas configurações, ou um só substitui o atual?
- **Fase 7:** modo manutenção e 2FA estão no escopo do plugin? São recursos novos de segurança e frontend, não melhorias visuais.
- **Fase 8:** kanban de pedidos e calendário editorial são recursos novos. Entram nesta versão?
- **`sidebar_resizable`:** implementar ou retirar a opção?

## 5. Fases

Cada fase tem um critério verificável. As fases estão ordenadas por **impacto na percepção ÷ custo**. As fases 1–3 mexem em telas que o usuário vê todo dia.

Vale para toda fase:
- Abrir a tela em 375 / 768 / 1440px, no claro e no escuro.
- Rodar `npm run typecheck && npm test && npx vite build`.

### Fase 1 — Peças do kit que as telas já pedem

Cada peça abaixo já tem pelo menos uma tela esperando por ela.

| Peça | Lugar | Quem usa já nesta versão |
|---|---|---|
| `DateRangePicker` (com predefinições: 7 / 30 / 90 dias, este mês) | `react/form` | Painel, atividade, filtros de pedidos. Substitui `<Input type="date">` |
| `ProgressBar` (tamanhos, rótulo dentro e fora) | `react/ui` | Fila de upload da mídia, uso de armazenamento, cartões do painel |
| `Dropzone` | `react/form`, sobre `useFilePicker` | Upload da mídia, imagens do produto, ZIP de plugin, importação CSV de usuários |
| `Breadcrumb` avulso | `react/ui` | Extraído de `PageHeader`, sem mudar a API dele |
| `Modal` tamanho `full` e variante de alerta (ícone em círculo + 1 ação) | `react/ui/Modal` | Editor de imagem (tela cheia), confirmações de sucesso |
| `Tooltip` tom claro | `react/ui/Tooltip` | Trilho de ícones (fase 6) |
| Toast com título, descrição e ações | `react/app/ToastProvider` | "Pedido criado — Ver pedido", "Desfazer" em ações em massa |

**Critério:**
- Cada peça aparece em `features/design-system/Showcase.tsx`.
- Cada peça é usada em pelo menos uma tela.
- `grep 'type="date"' app/src/react/features` volta vazio.
- `controls.test.ts` e `scales.test.ts` passam.

**Feito em 08/10/2026.** O que entrou e onde:

| Peça | Arquivo | Telas que passaram a usar |
|---|---|---|
| `DatePicker` | `form/DatePicker.tsx` | Validade do cupom, início e fim da promoção no editor de produto |
| `DateRangePicker` + `recentPresets()` | `form/DateRangePicker.tsx` | Painel (substituiu os dois campos e os três botões de período), atividade, filtro de datas dos posts |
| Calendário e aritmética de datas | `form/Calendar.tsx`, `form/dates.ts` (+ `dates.test.ts`) | Interno aos dois seletores. `isoDate`/`parseDay` saíram de `useWooDashboard.ts` para cá |
| `ProgressBar` | `ui/ProgressBar.tsx` | Envio da mídia, "Saúde do servidor", top páginas e dispositivos do analytics |
| `Dropzone` | `form/Dropzone.tsx` | Importação de usuários por CSV, que tinha um botão desenhado à mão sem arrastar |
| `Modal` com `tone` | `ui/Modal.tsx` | `useConfirm`, que passou a ter ícone de alerta |
| Toast com `action` | `app/ToastProvider.tsx` | Pedidos: "Desfazer" depois de mover para a lixeira |
| `Popover` controlado | `ui/Popover.tsx` | Os dois seletores de data |

O que mudou de lugar, pela premissa 2:
- **`Breadcrumb` avulso** foi para a fase 2. Hoje o único usuário seria o próprio `PageHeader`.
- **`Tooltip` claro** foi para a fase 6. Quem o usa é o trilho de ícones.
- **`Modal` em tela cheia** saiu do plano. O editor de imagem é uma rota, não um modal, e não sobrou nenhum outro usuário.
- **`Dropzone` na mídia e nos plugins** ficou de fora. A biblioteca já aceita arquivo solto na página inteira, o ZIP de plugin é um botão do cabeçalho e as imagens do produto vêm da biblioteca, não do disco.

O primeiro dia da semana vem do idioma do navegador (`Intl.Locale.weekInfo`), o mesmo de onde vêm os nomes dos meses. O Firefox ainda não tem esse dado e cai no domingo.

### Fase 2 — Anatomia única das telas de lista

O problema que essa fase resolve: hoje cada tela de lista monta o próprio cabeçalho, filtros e rodapé, e é aí que as telas divergem. São sete telas — produtos, pedidos, usuários, comentários, mídia em lista, plugins e atividade —, então a repetição já justifica uma peça.

1. Criar `TableCard` em `react/data`. Ele compõe, sem lógica de rede:
   - o cabeçalho (título, subtítulo, ações);
   - as abas de status (opcional);
   - a toolbar (busca + `FilterPopover`);
   - o `DataTable`;
   - o rodapé ("Mostrando 1–20 de 340" + `Pagination`).
2. Criar `FilterPopover`. É o botão `Filtrar` com contador de filtros ativos. Abre um popover com os campos e os botões `Aplicar` e `Limpar`. Abaixo de 640px vira `Sheet`. Os filtros ativos aparecem como chips removíveis abaixo da toolbar.
3. Padronizar o `⋯` da linha e o `Exportar` / `+ Adicionar` do cabeçalho.
4. Extrair `Breadcrumb` de `PageHeader` e levá-lo para a direita da linha do título, como no TailAdmin. Veio da fase 1.
5. Migrar as sete telas, uma por commit.

**Critério:**
- As sete telas usam `TableCard`.
- Nenhuma delas desenha mais uma fileira solta de `Select` de filtro.
- Em 375px, a toolbar cabe numa linha (busca + botão de filtro) e não há rolagem horizontal.

### Fase 3 — Telas de detalhe

1. **Pedido** (`/order/:id`), alinhado a single-transaction:
   - faixa de cabeçalho em cartão com ID, badge de status, data e ações (Reembolsar, Imprimir);
   - grade 2/3 + 1/3;
   - a linha do tempo de notas ganha ícone por tipo de evento (criado, pago, e-mail enviado, nota privada, nota ao cliente).
2. **Impressão do pedido**, alinhada a single-invoice: uma rota `/order/:id/print` com folha `@media print`. Não exige rota REST nova, porque usa os mesmos dados do pedido.
3. **Usuário** (`/user/:id`), alinhado a profile:
   - cartão-herói;
   - cartões de informação com `Editar` abrindo `Modal`;
   - cartão **Segurança** (senha, sessões ativas, se a rota existir);
   - cartão **Zona de perigo** (excluir, com `useConfirm`).
4. **Produto** (editor): seções em cartões com título, como em add-product (Descrição, Preço e estoque, Imagens), e campos em grade de 2 colunas a partir de 768px.

**Critério:**
- As três telas seguem a grade em 1440px e empilham em 375px.
- A impressão de um pedido real cabe em uma página A4 com até 10 itens.

### Fase 4 — Configurações

1. Agrupar as 17 categorias na navegação, com títulos de seção:
   - **Aparência:** tema, white label, menu, login.
   - **Conteúdo:** posts, mídia, comentários, usuários.
   - **Loja:** WooCommerce.
   - **Painel:** dashboard, analytics.
   - **Sistema:** plugins, integrações, segurança, banco de dados, avançado.

   O agrupamento entra como um campo `group` em `shared/settings/settings-config.js`. É um registro, não um `if`.
2. Linha de configuração no padrão rótulo + descrição à esquerda e controle à direita, em cartões por seção. Abaixo de 768px, o controle desce para baixo do rótulo.
3. **Barra de salvar fixa**, que aparece só quando há alteração ("Alterações não salvas · Descartar · Salvar"), e aviso ao sair com alteração pendente.
4. **Zona de perigo** em cartão próprio, para resetar as configurações e apagar dados.
5. **Integrações** como grade de cartões: logo, descrição, `Switch` de ativo e `Detalhes` abrindo `Sheet`.

**Critério:**
- Todas as categorias renderizam no novo layout.
- Alterar um campo mostra a barra. Salvar a esconde. Navegar com alteração pendente pede confirmação.

### Fase 5 — Painel

1. Variante "faixa" de KPIs: um cartão com divisórias, seletor de período segmentado e comparação "vs período anterior". Para isso a rota de estatísticas precisa devolver o período anterior. Conferir em `admin/src/Rest`.
2. `MetricCard` com **sparkline** opcional.
3. Cartão **Meta mensal** (WooCommerce), em radial semicircular. Precisa de uma configuração nova `monthly_revenue_target`. Sem meta definida, o cartão não aparece.
4. Gráficos que faltam:
   - rosca com legenda: dispositivos, status de pedidos;
   - barra horizontal: países, referências;
   - barras empilhadas: pedidos por status ao longo do tempo.
5. Tabelas compactas (top páginas, top produtos) com barra de progresso proporcional.
6. Mapa: depende da pergunta aberta (Mapbox × vetorial).

**Critério:**
- Todo cartão de gráfico usa o tema de gráfico compartilhado e reage a claro/escuro e à cor de destaque.
- Nenhum cartão mostra número sem rótulo de período.

### Fase 6 — Casca

1. **Títulos de grupo no menu.** O WP já tem separadores (`wp-menu-separator`). Eles viram cabeçalhos com nome editável no editor de menu.
2. **Filtro do menu** no topo da sidebar. Filtra os itens à vista, com destaque do trecho, e não substitui o `⌘K`.
3. **Modo trilho de ícones** (92px), como opção de layout. Depende da pergunta aberta. Traz junto o `Tooltip` em tom claro, que veio da fase 1.
4. **Item de notificação** com ícone ou avatar, título, origem, tempo relativo e ponto de não lido. Rodapé com "Ver todas".
5. **Barra de anúncio** reaproveitando os avisos do plugin (`notices`), para avisos com tom "anúncio".
6. Resolver `sidebar_resizable`: implementar ou retirar a opção e o trecho em `design-system.md`.

**Critério:**
- Com 40+ itens de menu (WooCommerce + 5 plugins), digitar no filtro reduz a lista sem recarregar a página.
- O trilho funciona só por teclado.

### Fase 7 — Login e páginas de sistema

1. Login: layout **dividido** (formulário + painel de marca com a imagem de `login_image`) como opção de `style_login`.
2. **404 dentro do app:** rota desconhecida no roteador React mostra a página de erro com "Voltar ao painel", em vez de tela vazia.
3. *Se aprovado:* 2FA (entrada OTP de 6 caixas) e modo manutenção / em breve.

**Critério:** login testado em 375px. Uma URL inválida do app cai na 404.

### Fase 8 — Recursos novos (se aprovados)

| Recurso | Base no TailAdmin | Dado | Dependência |
|---|---|---|---|
| Kanban de pedidos por status. Arrastar muda o status, com confirmação | task-kanban | `wc/v3/orders` | `@dnd-kit` |
| Calendário editorial (posts agendados e rascunhos com data). Arrastar reagenda | calendar | `wp/v2/posts?status=future,draft` | Biblioteca de calendário: avaliar FullCalendar (a do TailAdmin) × montar sobre `DateRangePicker` |
| Visão geral da mídia: blocos por tipo, uso de espaço, recentes | file-manager | Rota nova de estatística por `post_mime_type` | `ProgressBar`, rosca |

**Critério:** cada recurso tem rota, teste da aritmética pura (agrupar por status, mover entre colunas) e verificação nas três larguras.

### Fase 9 — Acabamento

- **Skeletons com a forma da tela** (como no layout-six), não um spinner central.
- **Estados vazios com ação:** "Nenhum pedido ainda · Criar pedido".
- **Transições** de 150–200ms em dropdown, popover e sheet, respeitando `prefers-reduced-motion`.
- **Revisão de foco e contraste** no modo escuro.
- **Atualizar `design-system.md`**, que ainda aponta caminhos Vue (`components/app/menu`, `useChartTheme.js`).

## 6. Fora do escopo

Esses itens não entram, e o motivo está escrito para não voltar a cada revisão:

- **Geradores de IA, chat, inbox, tickets, pricing, FAQ, billing, stocks, logistics:** não há dado do WP ou do WooCommerce que os alimente.
- **Carrossel, fita, vídeo em proporção, lista com rádio:** nenhuma tela do plugin precisa deles. Pela premissa 2, não entram no kit.
- **Cadastro (signup):** o WP já tem o fluxo. Só entra se o login customizado precisar cobri-lo.
- **Trocar a cor de destaque para `#465fff`:** decidido contra em 16/09/2026.
