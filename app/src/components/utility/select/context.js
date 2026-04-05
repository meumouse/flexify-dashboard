import { inject, provide } from 'vue';

export const SELECT_CONTEXT_KEY = Symbol('flexify-dashboard-select');

export const provideSelectContext = (context) => provide(SELECT_CONTEXT_KEY, context);

export const useSelectContext = () => inject(SELECT_CONTEXT_KEY, null);
