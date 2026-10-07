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
| Dados fora de REST | posts (raspa JSON de uma página escondida), menu lateral (lê `#adminmenu` do DOM), avisos (move `.notice` do DOM), barra do WP (move `#wpadminbar`) |

**O padrão:** as telas das fases 2–4 (produtos, pedidos) seguem o design system e são responsivas; as telas das fases 5–8 não. A causa é conhecida — foram validadas no harness, sem reabrir a referência nem testar em larguras diferentes.

## 2. Premissas

Declaradas porque mudam o resultado. Corrija-me onde estiver errado.

1. **"Seletor" = qualquer controle de escolha**, não só o dropdown: select, checkbox, radio, switch, slider, color, date. Todos devem ser componentes do kit.
2. **A padronização de fonte por tag vale dentro do `.flexify-dashboard-isolation`**, não no `<body>` do wp-admin inteiro — senão reestiliza telas de terceiros que não controlamos.
3. **"Ocultar a seção legada e refazer"** vale para markup do WordPress dentro das nossas páginas. A barra `#wpadminbar` é exceção: outros plugins dependem dos seletores dela, então ela continua sendo movida, não recriada.
4. **Responsividade "máxima"** = três alvos verificados: 375px (celular), 768px (tablet), 1440px (desktop). Não é um breakpoint por tamanho de tela existente.

## 3. Tradeoffs que precisam de decisão sua

Estes não dá para decidir sozinho porque custam coisas diferentes.

### 3.1 Lista de posts: REST estruturada × colunas de terceiros

Hoje a lista roda a `WP_List_Table` de verdade numa página escondida e devolve o HTML de cada célula. É por isso que colunas que outros plugins acrescentam (Yoast, WooCommerce) aparecem.

- **(A) Rota REST que continua renderizando as células** — API First de verdade (sem raspagem de HTML da página), colunas de terceiros continuam funcionando, mas o valor de cada célula continua sendo HTML opaco.
- **(B) Rota REST com dados estruturados** — mais limpa, ordenável e filtrável do lado do cliente, **mas perde toda coluna de terceiro**, porque elas só existem como `echo`.

Minha recomendação: **(A)**. Ela resolve o que o requisito pede (nada de raspar HTML, rota no namespace interno) sem quebrar integrações.

### 3.2 Dropdown nativo × Radix

O `<select>` nativo abre o seletor do sistema — que no celular é melhor que qualquer coisa que se construa. Trocar por Radix dá controle visual total e perde isso.

- **(A) Radix em tudo** — consistência visual completa.
- **(B) Radix no desktop, nativo no toque** — melhor UX, mais código.

Minha recomendação: **(A)**, pela exigência explícita de "todos os seletores são componentes React", mas registrando que (B) é melhor para celular.

### 3.3 Menu lateral: DOM × REST

O menu é construído pelos globais `$menu`/`$submenu` do PHP. Uma rota REST os expõe bem. O custo: hoje o menu é lido do HTML que já está na página, então aparece sem piscar; vindo de REST ele chega depois da primeira pintura.

Mitigação: imprimir o menu como JSON no `<script>` da página (mesmo custo de hoje, sem raspagem de DOM) **e** expor a rota REST para quem precisar dela. Recomendo isso.

## 4. Fases

Cada fase tem critério verificável. Nenhuma começa antes de a anterior passar.

### Fase 1 — Governança do projeto (P)
Criar `AGENTS.md` com as diretrizes e padrões, e `CLAUDE.md` apontando para ele.

Conteúdo do `AGENTS.md`: arquitetura API First; React + Tailwind + Vite no frontend e PHP/REST no backend; proibição de controles HTML crus em código de tela; escala de raios; escala tipográfica por tag; alvos de responsividade; namespace REST interno; política de estruturas legadas; e as diretrizes do `karpathy-guidelines` (pensar antes de codar, simplicidade, mudanças cirúrgicas, critério verificável).

→ **Verificação:** os dois arquivos existem, e `CLAUDE.md` não duplica regra nenhuma — só referencia.

### Fase 2 — Escala tipográfica e de raios (M)
Definir a escala no CSS do design system e aplicar.

- Raios: reduzir de 9 para **4** — `sm` (badge/pill pequeno), `lg` (controles), `xl` (cards internos), `2xl` (cards) e `full` só para avatar/pill.
- Tipografia: um tamanho por tag dentro do container isolado (h1–h6, p, small), mais a escala de tokens para o resto. Eliminar os 212 usos da escala crua.

→ **Verificação:** um teste que varre `app/src/react` e falha se aparecer classe de raio ou de fonte fora da escala — o mesmo formato do teste de ícones que já existe.

### Fase 3 — Kit de seletores em React (M)
Substituir todo controle cru por componente do kit.

- `Select` → Radix (`@radix-ui/react-select`), mantendo a API atual para não tocar nos 24 call sites.
- `Slider` novo (Radix) → `ImageEditor`.
- `ColorPicker` novo → `settings/custom`.
- Checkbox cru → `Checkbox` do kit em `SettingField` (2) e `LoginScreen` (1).

→ **Verificação:** teste que falha se `<select>`, `<input type="checkbox|radio|range|color">` aparecer fora de `app/src/react/form`. Suite verde. As 3 telas conferidas em 375/768/1440.

### Fase 4 — Responsividade das telas das fases 5–8 (G)
Na ordem do pior para o melhor: barra do frontend (0), banco (1), comentários/login/avisos/configurações (3), registro/menus/posts (4), papéis (5), usuários (6), painel/plugins (7).

Para cada uma: tabela vira lista em 375px, filtros empilham, ações viram menu, modais ocupam a tela toda no celular.

→ **Verificação:** cada tela aberta em 375/768/1440 sem overflow horizontal e sem elemento cortado. Capturas lado a lado no PR.

### Fase 5 — API First: eliminar leitura de DOM (G)
Rotas novas em `MeuMouse\Flexify_Dashboard\Rest`, namespace `flexify-dashboard/v1`:

- `GET /posts-table` — substitui a raspagem da página escondida (conforme decisão 3.1).
- `GET /admin-menu` — expõe `$menu`/`$submenu` (conforme decisão 3.3).
- `GET /admin-notices` — avisos como dados, no lugar de mover `.notice` do DOM.

Cada uma com permissão, sanitização e paginação nos cabeçalhos, como as rotas que já existem.

→ **Verificação:** `grep` por `DOMParser` e `querySelector('#adminmenu` em `app/src/react` não retorna nada (exceto `WpToolbar`, que é exceção declarada). Teste de integração cobrindo as três rotas.

### Fase 6 — Estruturas legadas dentro das nossas páginas (M)
Localizar seções que ainda saem como HTML do WordPress dentro de telas nossas, ocultar e refazer com componentes; onde faltar rota, criar no namespace interno.

→ **Verificação:** inventário no PR com o que foi encontrado, o que foi refeito e qual rota foi criada para cada caso.

### Fase 7 — QA e 4.1.0 (M)
Varredura das telas em 375/768/1440, claro e escuro, no **site real** — não no harness. Changelog e versão.

→ **Verificação:** a matriz preenchida com o que foi aberto de verdade, e o que não foi dito explicitamente.

## 5. Ordem e por quê

Fases 1–3 antes da 4 porque a responsividade vai tocar quase todo arquivo de tela: fazer isso **depois** de fixar escala e seletores evita passar duas vezes no mesmo código. A 5 é independente e pode correr em paralelo com a 4 se houver mais de uma pessoa.

## 6. O que este plano não cobre

- A barra `#wpadminbar` continua sendo movida do DOM (premissa 3).
- As três telas cujo bundle nunca foi declarado (`PostEditor.js`, `CustomPostTypes.js`, `CustomFieldsMetaBox.js`) não entram aqui porque **já foram removidas** — eram código morto, nunca instanciado. Ver a seção 12 de `planejamento-frontend-react.md`.
- Nada aqui depende de rodar a matriz de versões do WordPress/WooCommerce, que continua pendente da fase 10 da migração anterior.
