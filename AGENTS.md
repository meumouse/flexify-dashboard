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

**É proibido ler dados do DOM.** Nada de `DOMParser`, nada de `querySelector` em markup do WordPress para extrair informação, nada de raspar página escondida. Se o dado não tem rota, a rota é criada.

> Exceção única e declarada: `#wpadminbar` continua sendo **movida** para dentro da barra do shell, não recriada, porque outros plugins dependem desses seletores. Mover markup para reposicionar não é ler dado.

Referências: [WordPress REST API](https://developer.wordpress.org/rest-api/reference/) · [WooCommerce REST API](https://developer.woocommerce.com/docs/apis/rest-api/)

---

## 2. Componentes

**Todo controle de interface é componente React do kit.** Código de tela não escreve controle HTML cru.

Proibido em `app/src/react/features`, `shell` e `data`:

```
<select>   <input type="checkbox">   <input type="radio">
<input type="range">   <input type="color">   <input type="file">
```

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

**Rótulo:** `Input`, `Select` e `Textarea` têm `label` próprio, que associa o rótulo ao campo. `Field` é só para o que **não** é campo (um seletor customizado, um editor) — e aí o controle interno precisa de `aria-label`.

**Estruturas legadas do WordPress** dentro das nossas páginas: a seção é ocultada e refeita com componentes. Se faltar rota para alimentar o componente, ela é criada (seção 1).

---

## 3. Visual

### Raios

Quatro valores. Mais que isso é ruído.

| Classe | Onde |
|---|---|
| `rounded-sm` | badges e pills pequenos |
| `rounded-lg` | controles: botões, campos, itens de menu |
| `rounded-xl` | blocos dentro de um card |
| `rounded-2xl` | o card |
| `rounded-full` | só avatar e indicador circular |

Não use `rounded`, `rounded-md`, `rounded-3xl` nem variações de lado (`rounded-t`, `rounded-s`).

### Tipografia

**Um tamanho por tag**, definido em `@layer base` com seletor de elemento puro — de baixa especificidade de propósito, para que CSS de terceiros ainda consiga sobrepor quando precisar. Vale no wp-admin inteiro.

Dentro de componentes, use a escala de tokens do design system (`text-theme-xs`, `text-theme-sm`, `text-title-sm`…). **Não** use a escala crua do Tailwind (`text-sm`, `text-base`, `text-2xl`…) — ela existe no Tailwind mas não é a escala deste projeto.

---

## 4. Responsividade

Toda tela trabalhada é verificada em **três larguras**: 375px (celular), 768px (tablet), 1440px (desktop).

O que se espera em cada uma:

- **375px:** sem rolagem horizontal. Tabela vira lista. Filtros empilham. Ações viram menu. Modal ocupa a tela.
- **768px:** duas colunas onde fazia sentido ter duas.
- **1440px:** o layout cheio.

"Funciona no meu monitor" não é verificação. Abrir nas três é.

---

## 5. Como trabalhar

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

## 6. Antes de commitar

```bash
cd app && npm run typecheck && npm test && npx vite build
```

PHP alterado: `php -l` em cada arquivo.

String nova visível ao usuário: regenerar o POT e traduzir (`languages/`, veja [docs/desenvolvimento.md](docs/desenvolvimento.md)).

**Mensagem de commit sem linha de coautoria.**

---

## 7. Testes que seguram padrão

Alguns padrões aqui são verificados por teste, porque comentário não segura nada:

- `app/src/react/ui/icons.test.ts` — falha se um nome de ícone não tiver arquivo em `assets/icons`.

A fazer, conforme o [plano de padronização](docs/planejamento-padronizacao-ui-api.md): teste de escala de raios, de escala tipográfica, e de controle HTML cru fora do kit.

---

## 8. Documentação

| Assunto | Arquivo |
|---|---|
| Design system e tokens | [docs/design-system.md](docs/design-system.md) |
| Componentes do kit | [docs/componentes.md](docs/componentes.md) |
| Arquitetura de CSS | [docs/arquitetura-css.md](docs/arquitetura-css.md) |
| Ambiente, build, traduções | [docs/desenvolvimento.md](docs/desenvolvimento.md) |
| API de cartões do painel | [docs/dashboard-card-api.md](docs/dashboard-card-api.md) |
| WooCommerce | [docs/woocommerce.md](docs/woocommerce.md) |
| Plano de padronização (em curso) | [docs/planejamento-padronizacao-ui-api.md](docs/planejamento-padronizacao-ui-api.md) |
