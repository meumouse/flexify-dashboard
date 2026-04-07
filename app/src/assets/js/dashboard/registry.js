const translate = (value) => {
  if (typeof window !== 'undefined' && typeof window.__ === 'function') {
    return window.__(value, 'flexify-dashboard');
  }

  return value;
};

const BUILT_IN_CATEGORIES = [
  {
    id: 'overview',
    label: translate('Overview'),
    order: 10,
  },
  {
    id: 'analytics',
    label: translate('Analytics'),
    order: 20,
  },
  {
    id: 'ecommerce',
    label: translate('e-Commerce'),
    order: 30,
  },
];

const CATEGORY_ALIASES = {
  site: 'overview',
  overview: 'overview',
  analytics: 'analytics',
  'e-commerce': 'ecommerce',
  ecommerce: 'ecommerce',
};

const DEFAULT_CATEGORY_ORDER = 100;
const DEFAULT_ITEM_PRIORITY = 100;

const warn = (message, payload) => {
  console.warn(`[flexifyDashboard.dashboard] ${message}`, payload);
};

const toNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizeCategoryId = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return CATEGORY_ALIASES[trimmed] || trimmed;
};

const cloneCategory = (category) => ({
  ...category,
});

const cloneItemDefinition = (item) => ({
  ...item,
  requiresCapabilities: Array.isArray(item.requiresCapabilities)
    ? [...item.requiresCapabilities]
    : item.requiresCapabilities,
  requiresPlugins: Array.isArray(item.requiresPlugins)
    ? [...item.requiresPlugins]
    : item.requiresPlugins,
  children: Array.isArray(item.children)
    ? item.children.map(cloneItemDefinition)
    : item.children,
});

const cloneRuntimeItem = (item) => ({
  ...item,
  metadata: {
    ...item.metadata,
    requiresCapabilities: Array.isArray(item.metadata?.requiresCapabilities)
      ? [...item.metadata.requiresCapabilities]
      : item.metadata?.requiresCapabilities,
    requiresPlugins: Array.isArray(item.metadata?.requiresPlugins)
      ? [...item.metadata.requiresPlugins]
      : item.metadata?.requiresPlugins,
    requires_capabilities: Array.isArray(item.metadata?.requires_capabilities)
      ? [...item.metadata.requires_capabilities]
      : item.metadata?.requires_capabilities,
    requires_plugins: Array.isArray(item.metadata?.requires_plugins)
      ? [...item.metadata.requires_plugins]
      : item.metadata?.requires_plugins,
  },
  children: Array.isArray(item.children)
    ? item.children.map(cloneRuntimeItem)
    : item.children,
});

const normalizeCategoryDefinition = (definition, source = 'registerCategory') => {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    warn(`Ignored invalid category definition from ${source}.`, definition);
    return null;
  }

  const id = normalizeCategoryId(definition.id ?? definition.value);
  const label = definition.label;

  if (!id || typeof label !== 'string' || !label.trim()) {
    warn(`Ignored invalid category definition from ${source}.`, definition);
    return null;
  }

  const builtInCategory = BUILT_IN_CATEGORIES.find((category) => category.id === id);
  const isBuiltIn = Boolean(builtInCategory);

  return {
    id,
    label: label.trim(),
    order: isBuiltIn
      ? builtInCategory.order
      : toNumber(definition.order, DEFAULT_CATEGORY_ORDER),
    icon: typeof definition.icon === 'string' ? definition.icon : '',
    description:
      typeof definition.description === 'string' ? definition.description : '',
  };
};

const normalizeCardLikeDefinition = (
  definition,
  {
    expectedType = 'card',
    category: inheritedCategory = null,
    source = 'registerCard',
    allowCategoryFallback = true,
  } = {}
) => {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    warn(`Ignored invalid ${expectedType} definition from ${source}.`, definition);
    return null;
  }

  const isLegacyContainer = definition.isGroup === true;
  const requestedType = definition.type || (isLegacyContainer ? 'container' : expectedType);

  if (requestedType !== expectedType) {
    warn(`Ignored invalid ${expectedType} definition from ${source}.`, definition);
    return null;
  }

  const metadata = definition.metadata && typeof definition.metadata === 'object'
    ? definition.metadata
    : {};

  const rawId = definition.id ?? metadata.id;
  const rawTitle = definition.title ?? metadata.title;
  const rawCategory = definition.category ?? metadata.category ?? inheritedCategory;
  const rawFramework = definition.framework ?? metadata.framework ?? metadata.language;

  const id = typeof rawId === 'string' ? rawId.trim() : '';
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  const category = allowCategoryFallback ? normalizeCategoryId(rawCategory) : rawCategory;

  if (!id || !title || !category) {
    warn(`Ignored invalid ${expectedType} definition from ${source}.`, definition);
    return null;
  }

  if (expectedType === 'card') {
    if (!['vue', 'react', 'html'].includes(rawFramework)) {
      warn(`Ignored invalid card definition from ${source}.`, definition);
      return null;
    }

    if (typeof definition.component === 'undefined') {
      warn(`Ignored invalid card definition from ${source}.`, definition);
      return null;
    }
  }

  const normalized = {
    id,
    type: expectedType,
    category,
    title,
    width: toNumber(definition.width ?? metadata.width, expectedType === 'card' ? 4 : 12),
    mobileWidth: toNumber(
      definition.mobileWidth ?? metadata.mobileWidth,
      12
    ),
    className:
      typeof (definition.className ?? metadata.className) === 'string'
        ? (definition.className ?? metadata.className)
        : '',
    priority: toNumber(
      definition.priority ?? metadata.priority,
      DEFAULT_ITEM_PRIORITY
    ),
  };

  if (typeof (definition.description ?? metadata.description) === 'string') {
    normalized.description = definition.description ?? metadata.description;
  }

  if (expectedType === 'card') {
    normalized.framework = rawFramework;
    normalized.component = definition.component;

    const requiredCapabilities =
      definition.requiresCapabilities ??
      definition.requires_capabilities ??
      metadata.requiresCapabilities ??
      metadata.requires_capabilities;

    const requiredPlugins =
      definition.requiresPlugins ??
      definition.requires_plugins ??
      metadata.requiresPlugins ??
      metadata.requires_plugins;

    if (Array.isArray(requiredCapabilities)) {
      normalized.requiresCapabilities = [...requiredCapabilities];
    }

    if (Array.isArray(requiredPlugins)) {
      normalized.requiresPlugins = [...requiredPlugins];
    }
  }

  if (expectedType === 'container') {
    normalized.columns = toNumber(
      definition.columns ?? metadata.columns,
      2
    );

    const rawChildren = Array.isArray(definition.children) ? definition.children : [];
    const children = rawChildren
      .map((child) =>
        normalizeCardLikeDefinition(child, {
          expectedType: 'card',
          category,
          source: `${source}#children`,
        })
      )
      .filter(Boolean);

    if (!children.length) {
      warn(`Ignored invalid container definition from ${source}.`, definition);
      return null;
    }

    normalized.children = children;
  }

  return normalized;
};

const toRuntimeCard = (definition) => ({
  type: 'card',
  isGroup: false,
  component: definition.component,
  metadata: {
    id: definition.id,
    title: definition.title,
    description: definition.description || '',
    category: definition.category,
    width: definition.width,
    mobileWidth: definition.mobileWidth,
    className: definition.className || '',
    priority: definition.priority,
    framework: definition.framework,
    language: definition.framework,
    requiresCapabilities: definition.requiresCapabilities || [],
    requiresPlugins: definition.requiresPlugins || [],
    requires_capabilities: definition.requiresCapabilities || [],
    requires_plugins: definition.requiresPlugins || [],
  },
});

const toRuntimeContainer = (definition) => ({
  type: 'container',
  isGroup: true,
  metadata: {
    id: definition.id,
    title: definition.title,
    description: definition.description || '',
    category: definition.category,
    width: definition.width,
    mobileWidth: definition.mobileWidth,
    className: definition.className || '',
    priority: definition.priority,
    columns: definition.columns,
  },
  children: definition.children.map(toRuntimeCard),
});

class DashboardRegistry {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }

  reset() {
    this.categories = new Map();
    this.items = new Map();
    this.itemIds = new Set();

    BUILT_IN_CATEGORIES.forEach((category) => {
      this.categories.set(category.id, {
        ...category,
      });
    });
  }

  registerCategory(definition) {
    const normalized = normalizeCategoryDefinition(definition);

    if (!normalized) {
      return null;
    }

    const existing = this.categories.get(normalized.id);
    const builtInCategory = BUILT_IN_CATEGORIES.find(
      (category) => category.id === normalized.id
    );

    this.categories.set(normalized.id, {
      ...existing,
      ...normalized,
      order: builtInCategory ? builtInCategory.order : normalized.order,
    });

    this.emit();
    return normalized.id;
  }

  registerCard(definition, source = 'registerCard') {
    return this.registerItem(
      normalizeCardLikeDefinition(definition, {
        expectedType: 'card',
        source,
      })
    );
  }

  registerContainer(definition, source = 'registerContainer') {
    return this.registerItem(
      normalizeCardLikeDefinition(definition, {
        expectedType: 'container',
        source,
      })
    );
  }

  registerLegacyItem(definition, source = 'legacy') {
    const legacyType = definition?.isGroup ? 'container' : definition?.type || 'card';

    if (legacyType === 'container') {
      return this.registerContainer(definition, source);
    }

    return this.registerCard(definition, source);
  }

  registerItem(normalized) {
    if (!normalized) {
      return null;
    }

    if (!this.categories.has(normalized.category)) {
      warn(`Ignored item "${normalized.id}" because category "${normalized.category}" is not registered.`, normalized);
      return null;
    }

    const candidateIds = [
      normalized.id,
      ...(normalized.type === 'container'
        ? normalized.children.map((child) => child.id)
        : []),
    ];

    if (new Set(candidateIds).size !== candidateIds.length) {
      warn(`Ignored item "${normalized.id}" because it contains duplicate child ids.`, normalized);
      return null;
    }

    const duplicateId = candidateIds.find((id) => this.itemIds.has(id));
    if (duplicateId) {
      warn(`Ignored item "${normalized.id}" because id "${duplicateId}" is already registered.`, normalized);
      return null;
    }

    candidateIds.forEach((id) => this.itemIds.add(id));
    this.items.set(normalized.id, normalized);
    this.emit();
    return normalized.id;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit() {
    const snapshot = this.getRegistry();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[flexifyDashboard.dashboard] Subscriber failed.', error);
      }
    });
  }

  getRegistry() {
    const categories = [...this.categories.values()].sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.label.localeCompare(right.label);
    });

    const items = [...this.items.values()].sort((left, right) => {
      if (left.category !== right.category) {
        return left.category.localeCompare(right.category);
      }

      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.title.localeCompare(right.title);
    });

    const runtimeItems = items.map((item) =>
      item.type === 'container' ? toRuntimeContainer(item) : toRuntimeCard(item)
    );

    const runtimeCardsByCategory = runtimeItems.reduce((accumulator, item) => {
      const category = item.metadata.category;

      if (!accumulator[category]) {
        accumulator[category] = [];
      }

      accumulator[category].push(item);
      return accumulator;
    }, {});

    return {
      categories: categories.map(cloneCategory),
      items: items.map(cloneItemDefinition),
      cards: items
        .filter((item) => item.type === 'card')
        .map(cloneItemDefinition),
      containers: items
        .filter((item) => item.type === 'container')
        .map(cloneItemDefinition),
      runtimeItems: runtimeItems.map(cloneRuntimeItem),
      runtimeCardsByCategory: Object.fromEntries(
        Object.entries(runtimeCardsByCategory).map(([category, categoryItems]) => [
          category,
          categoryItems.map(cloneRuntimeItem),
        ])
      ),
    };
  }
}

const registry = new DashboardRegistry();

const createPublicApi = () => ({
  registerCategory: (definition) => registry.registerCategory(definition),
  registerCard: (definition) => registry.registerCard(definition),
  registerContainer: (definition) => registry.registerContainer(definition),
  getRegistry: () => registry.getRegistry(),
  subscribe: (listener) => registry.subscribe(listener),
});

const attachToWindow = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.flexifyDashboard = window.flexifyDashboard || {};
  window.flexifyDashboard.dashboard = createPublicApi();
};

attachToWindow();

export {
  BUILT_IN_CATEGORIES,
  CATEGORY_ALIASES,
  DEFAULT_CATEGORY_ORDER,
  DEFAULT_ITEM_PRIORITY,
  normalizeCategoryDefinition,
  normalizeCardLikeDefinition,
  registry as dashboardRegistry,
};

export default registry;
