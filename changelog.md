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