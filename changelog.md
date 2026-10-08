Versão 4.1.0 (07/10/2026)
* Correção de bugs
* Otimizações
* A barra do WordPress deixou de ser movida para dentro da interface: os itens são lidos do `WP_Admin_Bar` e desenhados por componente nosso, com o id e as classes que o CSS de outros plugins procura. **Quebra de compatibilidade:** um plugin que procura `#wp-admin-bar-…` por JavaScript, depois da página carregada, não encontra mais; o que ele registrou por `admin_bar_menu` continua aparecendo
* O menu lateral deixou de ser lido do DOM: vem dos globais `$menu` e `$submenu`, impresso na página como JSON, com a rota `GET flexify-dashboard/v1/admin-menu` para quem precisar fora do admin
* Os avisos do WordPress deixaram de ser movidos para o painel de notificações: são capturados no servidor e desenhados com o alerta do design system. **Quebra de compatibilidade:** um plugin que liga um botão dentro do próprio aviso por script de carregamento não encontra mais o aviso na página; links e formulários dentro do aviso continuam funcionando
* O modal de mídia do WordPress (`wp.media`) foi substituído por uma biblioteca nossa, que lê a mesma rota da tela de mídia — nos sete lugares que o abriam
* Abaixo de 640px toda tabela do plugin vira lista de cartões, o que arrumou doze telas de uma vez
* Uma escala de tamanho de fonte só, em todo o wp-admin: um tamanho por tag (h1 a h6, p, small) e os tokens do design system nos componentes. 232 classes trocadas, e um teste que falha se a escala crua do Tailwind voltar
* Quatro valores de arredondamento, no lugar de nove
* Todo seletor passou a ser componente do kit: o dropdown e o slider em Radix, e o seletor de cor e o diálogo de arquivo como elementos nativos dentro do kit, que é onde eles podem morar. Um teste falha se um controle cru voltar para uma tela
* Correção: na lista de plugins, o nome era espremido até sumir em telas estreitas, em vez de a linha quebrar; o mesmo acontecia com o título das páginas
* Correção: a lista de posts deixou de abrir um documento HTML para achar o JSON dentro dele
* Correção: `AGENTS.md` passou a descrever as regras do projeto, com `CLAUDE.md` apontando para ele
* Atualização das traduções pt_BR

Versão 4.0.0 (07/10/2026)
* Correção de bugs
* Otimizações
* Frontend reescrito em React com TypeScript: todas as telas do plugin, da casca do admin ao login
* Removido o Vue do plugin — e com ele vue-router, pinia, reka-ui, veaury, vue-shadow-dom, vue-draggable-next, @tiptap/vue-3, vue3-apexcharts, @vuepic/vue-datepicker, vaul-vue e @vueuse/core
* **Quebra de compatibilidade:** um cartão do painel registrado por outro plugin e escrito em Vue não renderiza mais; cartões em HTML e em React continuam funcionando, e o painel avisa na tela quando encontra um cartão Vue
* O chunk compartilhado por todas as telas caiu de 585 kB para 477 kB
* Painel reescrito: grade de 12 colunas, reordenação arrastando, redimensionamento preso às colunas e escolha de quais cartões aparecem, tudo guardado por categoria
* Telas de posts, comentários, mídia e usuários reescritas, com as duas visualizações da tela de posts e o editor de imagem
* Telas de plugins, configurações, registro de atividades, explorador do banco, editor de papéis, construtor de menus e avisos reescritas
* Tela de login e barra do frontend reescritas
* Correção: ao excluir usuários, o plugin agora pergunta para quem vai o conteúdo deles — antes ia sempre para o usuário de ID 1, fosse ele quem fosse
* Correção: os comentários mostram em que post foram deixados; a consulta que deveria buscar isso nunca era verdadeira e o título nunca aparecia
* Correção: todos os campos de formulário passaram a ter rótulo associado — para um leitor de tela eles não tinham nome
* Correção: as mensagens de erro da tela de login passaram a ser traduzíveis
* Correção: o construtor de menus devolve ao menu os itens que o site ganhou depois de o menu ter sido criado
* Correção: o período do painel não volta mais um dia a cada recarga em fusos a oeste de Greenwich
* Removido código morto: o editor moderno de posts, a tela de tipos de post e o motor de Custom Fields nunca foram instanciados pelo plugin e nunca tiveram interface — as classes que os serviam pediam bundles que o build nunca declarou e suas rotas REST nunca chegavam a ser registradas. As funções públicas `flexify_dashboard_get_field()` e afins continuam disponíveis para temas
* Atualização das traduções pt_BR

Versão 3.0.0 (17/09/2026)
* Correção de bugs
* Otimizações
* Novo design system inspirado no TailAdmin (tokens de cor, tipografia Outfit, sombras, raios e receitas de componentes), mantendo #008aff como cor de destaque padrão
* Migração do build de estilos para Tailwind CSS v4 com camadas de cascata isoladas
* Novo kit de componentes Vue (botões, campos, tabelas de dados, modais, painéis laterais, abas, paginação, badges, alertas, etc)
* Novo layout do painel: barra lateral de 290 px com modo recolhido e expansão ao passar o mouse, barra superior com busca, modo escuro e menu do usuário
* Redimensionamento da barra lateral mantido como opção
* Telas nativas do WordPress e do WooCommerce estilizadas com o novo visual
* Páginas existentes migradas para as novas paletas
* Recurso adicionado: Página moderna de produtos do WooCommerce (contadores, filtros, variações, edição rápida e ações em massa)
* Recurso adicionado: Página moderna de pedidos do WooCommerce com suporte a HPOS e armazenamento legado (pré-visualização, notas, reembolsos, edição de endereços, ações do pedido e exportação CSV)
* Recurso adicionado: Criação manual de pedidos e edição de itens de pedidos pendentes
* Recurso adicionado: Editor moderno de produtos com atributos e gerador de variações (opcional)
* Recurso adicionado: Gerenciamento de categorias, tags, atributos globais e cupons
* Recurso adicionado: Filtros de pedidos por pagamento, canal, origem e cliente, com aviso de novos pedidos
* Recurso adicionado: Filtros de produtos por tag e faixa de preço e escolha de colunas visíveis
* Melhorias de acessibilidade nos componentes (rótulos acessíveis e anel de foco)
* Recurso adicionado: Registro de alterações de status e reembolsos de pedidos no Activity Log (incluídos no nível “importante”)
* Recurso adicionado: Declaração de compatibilidade com HPOS do WooCommerce
* Atualização das traduções pt_BR

Versão 2.0.0 (06/04/2026)
* Correção de bugs
* Otimizações
* Remoção do WooCommerce como dependência
* Mudança de arquitetura para MACI (Modular Autoload Class Initialization)
* Novo sistema modular (App, Rest, Pages, Analytics, Utility, etc)
* Novo sistema de build frontend com aplicação compilada (SPA administrativa)
* Recurso adicionado: Sistema avançado de Custom Fields (posts, usuários, termos, mídia, options)
* Recurso adicionado: Módulo de Analytics com suporte a Google Analytics
* Recurso adicionado: Integração com Google Analytics via Service Account
* Recurso adicionado: Explorer de banco de dados (Database Viewer)
* Recurso adicionado: Activity Log (registro de atividades do sistema)
* Recurso adicionado: Editor de roles e permissões de usuários
* Recurso adicionado: Gerenciamento avançado de mídia (tags, replace, bulk actions)
* Recurso adicionado: Endpoints REST completos para dashboard (server health, plugins, usuários, posts, etc)
* Recurso adicionado: Widget do Rank Math no dashboard
* Recurso adicionado: Sistema de métricas de performance de plugins
* Recurso adicionado: Menu Builder (gerenciador de menus administrativos)
* Recurso adicionado: Sistema de autenticação e rotas REST para login/logout
* Recurso adicionado: Camada de segurança com sanitização avançada (HTMLPurifier e SVG Sanitizer)
* Recurso adicionado: Sistema de atualização via servidor MeuMouse (update-checker.json)
* Recurso adicionado: Compatibilidade estruturada com WooCommerce (dados e widgets via REST)

Versão 1.3.0 (20/04/2024)
* Correção de bugs
* Otimizações
* Recurso adicionado: Ativar animação de carregamento de páginas
* Recurso adicionado: Ativar widget de últimos pedidos recebidos
* Recurso adicionado: Alteração de paleta de cores

Versão 1.2.6 (06/04/2024)
* Correção de bugs

Versão 1.2.5 (05/04/2024)
* Correção de bugs
* Otimizações
* Compatibilidade com Clube M
* Recurso adicionado: Logo da página de login administrativo
* Recurso adicionado: Ativar página de login administrativo

Versão 1.2.1 (02/03/2024)
* Alteração de servidor de verificação de licenças

Versão 1.2.0 (27/02/2024)
* Correção de bugs
* Otimizações
* Recurso adicionado: Integração com Google reCAPTCHA

Versão 1.0.0 inicial (07/02/2024)