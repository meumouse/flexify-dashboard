<script setup>
import { computed, ref } from 'vue';
import {
  FdAlert,
  FdAvatar,
  FdBadge,
  FdButton,
  FdCard,
  FdCheckbox,
  FdConfirmDialog,
  FdDataTable,
  FdDropdown,
  FdDropzone,
  FdEmptyState,
  FdInput,
  FdMetricCard,
  FdModal,
  FdPageHeader,
  FdPagination,
  FdRadio,
  FdSearchInput,
  FdSelect,
  FdSheet,
  FdStatStrip,
  FdSwitch,
  FdTabs,
  FdTextarea,
  FdTooltip,
} from '@/components/kit';
import Notifications from '@/components/utility/notifications/index.vue';
import { useDarkMode } from '@/composables/useDarkMode.js';
import { notify } from '@/assets/js/functions/notify.js';

const { isDark } = useDarkMode();

const textValue = ref('');
const priceValue = ref('49.90');
const selectValue = ref('');
const textareaValue = ref('');
const checked = ref(true);
const multi = ref(['a']);
const radioValue = ref('simple');
const switchValue = ref(true);
const tab = ref('all');
const segmented = ref('week');
const search = ref('');
const modalOpen = ref(false);
const sheetOpen = ref(false);
const confirmDialog = ref(null);
const page = ref(1);
const perPage = ref(10);
const selected = ref([]);
const sort = ref({ key: 'name', direction: 'asc' });
const expanded = ref([]);
const loadingTable = ref(false);

const colors = ['primary', 'success', 'error', 'warning', 'info', 'orange', 'purple', 'light', 'dark'];

const rows = computed(() => {
  const list = [
    { id: 1, name: 'Camiseta básica', sku: 'TSH-001', price: 'R$ 59,90', stock: 32, status: 'publish', variations: 3 },
    { id: 2, name: 'Tênis esportivo', sku: 'SNK-221', price: 'R$ 349,00', stock: 0, status: 'publish', variations: 0 },
    { id: 3, name: 'Mochila urbana', sku: 'BAG-010', price: 'R$ 199,90', stock: 4, status: 'draft', variations: 2 },
    { id: 4, name: 'Boné aba curva', sku: 'CAP-003', price: 'R$ 79,90', stock: 120, status: 'pending', variations: 0 },
  ];

  const direction = sort.value.direction === 'asc' ? 1 : -1;

  return [...list].sort((a, b) => String(a[sort.value.key]).localeCompare(String(b[sort.value.key]), undefined, { numeric: true }) * direction);
});

const columns = [
  { key: 'name', label: 'Produto', sortable: true },
  { key: 'price', label: 'Preço', sortable: true },
  { key: 'stock', label: 'Estoque', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'end', width: '60px' },
];

const statusBadge = {
  publish: { color: 'success', label: 'Publicado' },
  draft: { color: 'light', label: 'Rascunho' },
  pending: { color: 'warning', label: 'Pendente' },
};

const rowActions = [
  { label: 'Editar', icon: 'edit', onSelect: () => notify({ title: 'Editar', type: 'info' }) },
  { label: 'Duplicar', icon: 'content_copy' },
  { separator: true },
  { label: 'Mover para lixeira', icon: 'delete', danger: true },
];

const askConfirmation = async () => {
  const confirmed = await confirmDialog.value.show({
    title: 'Excluir produto?',
    message: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    variant: 'danger',
  });

  notify({ title: confirmed ? 'Confirmado' : 'Cancelado', type: confirmed ? 'success' : 'info' });
};

const reloadTable = () => {
  loadingTable.value = true;
  setTimeout(() => (loadingTable.value = false), 1200);
};
</script>

<template>
  <div class="flexify-dashboard-isolation">
    <component is="style">:root{font-size:14px}#wpcontent{padding:0}</component>
    <div class="font-sans" :class="isDark ? 'dark' : ''">
      <div class="min-h-screen bg-gray-50 p-4 pb-20 dark:bg-gray-900 md:p-6">
        <div class="mx-auto max-w-[1536px] space-y-6">
          <FdPageHeader
            title="Design System"
            description="Componentes do kit com as receitas do TailAdmin."
            :breadcrumbs="[{ label: 'Flexify Dashboard', href: '#' }, { label: 'Design System' }]"
          >
            <template #actions>
              <FdButton variant="outline" icon="download">Exportar</FdButton>
              <FdButton icon="add">Adicionar produto</FdButton>
            </template>
          </FdPageHeader>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
            <FdMetricCard label="Pedidos" value="3.782" icon="shopping_bag" :trend="11.01" />
            <FdMetricCard label="Receita" value="R$ 57.450" icon="payments" tone="brand" :trend="-9.05" />
            <FdMetricCard label="Produtos" value="359" icon="inventory" tone="success" />
            <FdMetricCard label="Carregando" loading icon="receipt_long" tone="warning" />
          </div>

          <FdStatStrip
            :items="[
              { key: 'pending', label: 'Aguardando pagamento', value: 12, tone: 'warning', clickable: true },
              { key: 'processing', label: 'Processando', value: 38, tone: 'brand', clickable: true },
              { key: 'hold', label: 'Em espera', value: 4, clickable: true },
              { key: 'revenue', label: 'Receita (30 dias)', value: 'R$ 18.230', hint: '+8%', tone: 'success' },
            ]"
          />

          <FdCard title="Botões" description="Variantes e tamanhos.">
            <div class="flex flex-wrap items-center gap-3">
              <FdButton>Primary</FdButton>
              <FdButton variant="outline">Outline</FdButton>
              <FdButton variant="secondary">Secondary</FdButton>
              <FdButton variant="danger">Danger</FdButton>
              <FdButton variant="danger-outline">Danger outline</FdButton>
              <FdButton variant="warning">Warning</FdButton>
              <FdButton variant="success">Success</FdButton>
              <FdButton variant="ghost">Ghost</FdButton>
              <FdButton variant="link">Link</FdButton>
              <FdButton loading>Salvando</FdButton>
              <FdButton disabled>Desabilitado</FdButton>
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <FdButton size="xs">XS</FdButton>
              <FdButton size="sm">SM</FdButton>
              <FdButton size="md">MD</FdButton>
              <FdButton size="lg">LG</FdButton>
              <FdTooltip text="Mais opções">
                <FdButton variant="outline" icon="more_vert" icon-only aria-label="Mais opções" />
              </FdTooltip>
            </div>
          </FdCard>

          <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <FdCard title="Formulários">
              <div class="grid gap-5 sm:grid-cols-2">
                <FdInput v-model="textValue" label="Nome do produto" placeholder="Ex.: Camiseta" required />
                <FdInput v-model="priceValue" label="Preço" prefix="R$" inputmode="decimal" />
                <FdInput label="SKU" error="SKU já utilizado" model-value="TSH-001" />
                <FdInput label="Peso" suffix="kg" hint="Usado no cálculo de frete" />
                <FdSelect
                  v-model="selectValue"
                  label="Categoria"
                  placeholder="Selecione"
                  :options="[
                    { value: 'shirts', label: 'Camisetas' },
                    { value: 'shoes', label: 'Calçados' },
                    { label: 'Acessórios', options: [{ value: 'bags', label: 'Bolsas' }] },
                  ]"
                />
                <FdSearchInput v-model="search" placeholder="Buscar produtos" />
                <FdTextarea v-model="textareaValue" class="sm:col-span-2" label="Descrição" placeholder="Descreva o produto" />
              </div>
            </FdCard>

            <FdCard title="Controles de seleção">
              <div class="grid gap-6 sm:grid-cols-2">
                <div class="space-y-3">
                  <FdCheckbox v-model="checked" label="Gerenciar estoque" description="Controla a quantidade disponível" />
                  <FdCheckbox v-model="multi" value="a" label="Opção A" />
                  <FdCheckbox v-model="multi" value="b" label="Opção B" />
                  <FdCheckbox indeterminate label="Indeterminado" />
                  <FdCheckbox disabled label="Desabilitado" />
                </div>
                <div class="space-y-3">
                  <FdRadio v-model="radioValue" value="simple" name="type" label="Produto simples" />
                  <FdRadio v-model="radioValue" value="variable" name="type" label="Produto variável" />
                  <FdSwitch v-model="switchValue" label="Produto em destaque" />
                  <FdSwitch :model-value="false" size="sm" label="Switch pequeno" />
                </div>
              </div>
            </FdCard>
          </div>

          <FdCard title="Badges e alertas">
            <div class="flex flex-wrap gap-2">
              <FdBadge v-for="color in colors" :key="color" :color="color">{{ color }}</FdBadge>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <FdBadge v-for="color in colors" :key="`solid-${color}`" :color="color" variant="solid">{{ color }}</FdBadge>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <FdBadge color="success" dot pulse>Online</FdBadge>
              <FdBadge color="warning" dot>Estoque baixo</FdBadge>
              <FdBadge color="error" icon="close" size="md">Sem estoque</FdBadge>
            </div>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <FdAlert variant="success" title="Pedido atualizado" message="O status foi alterado para Concluído." />
              <FdAlert variant="error" title="Falha no reembolso" message="O gateway recusou a solicitação." dismissible />
              <FdAlert variant="warning" title="Estoque baixo" message="5 produtos estão abaixo do limite." />
              <FdAlert variant="info" title="HPOS ativo" message="Os pedidos usam as tabelas de alta performance." />
            </div>
          </FdCard>

          <FdCard title="Abas, avatar e sobreposições">
            <div class="space-y-5">
              <FdTabs
                v-model="tab"
                :items="[
                  { value: 'all', label: 'Todos', count: 128 },
                  { value: 'publish', label: 'Publicados', count: 96 },
                  { value: 'draft', label: 'Rascunhos', count: 12 },
                  { value: 'trash', label: 'Lixeira', count: 3 },
                ]"
              />
              <FdTabs
                v-model="segmented"
                variant="segmented"
                :items="[
                  { value: 'day', label: 'Hoje' },
                  { value: 'week', label: 'Semana' },
                  { value: 'month', label: 'Mês' },
                ]"
              />
              <div class="flex items-center gap-3">
                <FdAvatar name="Maria Silva" size="sm" />
                <FdAvatar name="João Souza" status="online" />
                <FdAvatar src="https://www.gravatar.com/avatar/?d=mp&s=96" name="Visitante" size="lg" status="busy" />
              </div>
              <div class="flex flex-wrap gap-3">
                <FdButton variant="outline" @click="modalOpen = true">Abrir modal</FdButton>
                <FdButton variant="outline" @click="sheetOpen = true">Abrir painel lateral</FdButton>
                <FdButton variant="danger-outline" @click="askConfirmation">Confirmar exclusão</FdButton>
                <FdDropdown :items="rowActions">
                  <template #trigger>
                    <FdButton variant="outline" icon-right="expand_more">Dropdown</FdButton>
                  </template>
                </FdDropdown>
                <FdButton variant="outline" @click="notify({ title: 'Produto salvo', message: 'Alterações aplicadas', type: 'success' })">Notificação</FdButton>
              </div>
            </div>
          </FdCard>

          <FdCard title="Tabela de dados" description="Seleção, ordenação, linhas expansíveis e paginação." padding="none">
            <template #actions>
              <FdButton variant="outline" icon="refresh" @click="reloadTable">Recarregar</FdButton>
            </template>
            <div class="mt-4">
              <FdDataTable
                v-model:selected="selected"
                v-model:sort="sort"
                v-model:expanded="expanded"
                :columns="columns"
                :rows="rows"
                :loading="loadingTable"
                selectable
                :expandable="(row) => row.variations > 0"
              >
                <template #bulk-actions>
                  <FdButton size="xs" variant="outline">Alterar status</FdButton>
                  <FdButton size="xs" variant="danger-outline">Excluir</FdButton>
                </template>
                <template #cell-name="{ row }">
                  <div class="flex items-center gap-3">
                    <div class="h-12 w-12 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
                    <div>
                      <p class="font-medium text-gray-800 dark:text-white/90">{{ row.name }}</p>
                      <span class="text-theme-xs text-gray-500 dark:text-gray-400">SKU {{ row.sku }}</span>
                    </div>
                  </div>
                </template>
                <template #cell-stock="{ value }">
                  <FdBadge :color="value === 0 ? 'error' : value < 5 ? 'warning' : 'success'">{{ value === 0 ? 'Sem estoque' : `${value} em estoque` }}</FdBadge>
                </template>
                <template #cell-status="{ value }">
                  <FdBadge :color="statusBadge[value].color">{{ statusBadge[value].label }}</FdBadge>
                </template>
                <template #cell-actions>
                  <FdDropdown :items="rowActions">
                    <template #trigger>
                      <FdButton variant="ghost" size="xs" icon="more_vert" icon-only aria-label="Ações" />
                    </template>
                  </FdDropdown>
                </template>
                <template #expanded="{ row }">
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ row.variations }} variações de {{ row.name }}</p>
                </template>
              </FdDataTable>
            </div>
            <template #footer>
              <FdPagination v-model:page="page" v-model:per-page="perPage" :total="236" />
            </template>
          </FdCard>

          <div class="grid gap-6 lg:grid-cols-2">
            <FdCard title="Upload">
              <FdDropzone description="PNG, JPG ou WEBP até 5MB" accept="image/*" multiple @files="(files) => notify({ title: `${files.length} arquivo(s)`, type: 'info' })" />
            </FdCard>
            <FdCard title="Estado vazio">
              <FdEmptyState icon="shopping_bag" title="Nenhum pedido encontrado" description="Ajuste os filtros ou crie um novo pedido." compact>
                <FdButton variant="outline" size="xs">Limpar filtros</FdButton>
              </FdEmptyState>
            </FdCard>
          </div>
        </div>
      </div>

      <FdModal v-model:open="modalOpen" title="Editar endereço" description="Endereço de entrega do pedido #1024">
        <div class="grid gap-5 sm:grid-cols-2">
          <FdInput label="CEP" placeholder="00000-000" />
          <FdInput label="Cidade" />
          <FdInput class="sm:col-span-2" label="Endereço" />
        </div>
        <template #footer>
          <FdButton variant="outline" @click="modalOpen = false">Cancelar</FdButton>
          <FdButton @click="modalOpen = false">Salvar</FdButton>
        </template>
      </FdModal>

      <FdSheet v-model:open="sheetOpen" title="Edição rápida" description="Camiseta básica">
        <div class="space-y-5">
          <FdInput label="Nome" model-value="Camiseta básica" />
          <FdInput label="Preço" prefix="R$" model-value="59,90" />
          <FdSwitch label="Gerenciar estoque" :model-value="true" />
        </div>
        <template #footer>
          <FdButton variant="outline" @click="sheetOpen = false">Cancelar</FdButton>
          <FdButton @click="sheetOpen = false">Salvar</FdButton>
        </template>
      </FdSheet>

      <FdConfirmDialog ref="confirmDialog" />
      <Notifications />
    </div>
  </div>
</template>
