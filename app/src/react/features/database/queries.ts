import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';

/**
 * The database, read-only except for dropping a table.
 *
 * The server only runs SELECT and caps the row limit; this side does not try to enforce that
 * again, it just says so before a query is sent.
 */

export type DatabaseTable = { name: string; is_wp_table: boolean; row_count: number; size_mb: number };

export type TableColumn = { Field: string; Type: string; Null: string; Key: string; Default: string | null; Extra: string };

export type TableData = {
	data: Record<string, unknown>[];
	pagination: { page: number; per_page: number; total: number; total_pages: number };
};

const BASE = 'flexify-dashboard/v1/database';

/** The query the server will accept: a SELECT, and nothing else. */
export const isReadOnly = (sql: string): boolean => /^\s*select\b/i.test(sql);

export const useTables = () => {
	const rest = useRest();

	return useQuery({
		queryKey: ['db-tables'],
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ tables?: DatabaseTable[] } | DatabaseTable[]>(`${BASE}/tables`, {}, signal);

			return Array.isArray(result) ? result : (result.tables ?? []);
		},
	});
};

export const useTableStructure = (table: string | null) => {
	const rest = useRest();

	return useQuery({
		queryKey: ['db-structure', table],
		enabled: Boolean(table),
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ columns?: TableColumn[] } | TableColumn[]>(`${BASE}/tables/${table}/structure`, {}, signal);

			return Array.isArray(result) ? result : (result.columns ?? []);
		},
	});
};

export const useTableData = (table: string | null, page: number, perPage: number) => {
	const rest = useRest();

	return useQuery<TableData>({
		queryKey: ['db-data', table, page, perPage],
		enabled: Boolean(table),
		placeholderData: (previous) => previous,
		queryFn: ({ signal }) => rest.get<TableData>(`${BASE}/tables/${table}/data`, { page, per_page: perPage }, signal),
	});
};

export const useRunQuery = () => {
	const rest = useRest();
	const { notify } = useNotify();

	return useMutation<{ data: Record<string, unknown>[]; rows_affected: number }, Error, string>({
		mutationFn: (query) => rest.post<{ data: Record<string, unknown>[]; rows_affected: number }>(`${BASE}/query`, { query }),
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});
};

/**
 * Dropping a table asks for the password again.
 *
 * Nothing about it can be undone, and a signed-in tab left open is not proof that the person
 * at the keyboard meant to do this.
 */
export const useDropTable = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, { table: string; password: string }>({
		mutationFn: async ({ table, password }) => {
			await rest.post(`${BASE}/verify-password`, { password });

			return rest.remove(`${BASE}/tables/${table}`);
		},
		onSuccess: () => {
			notify({ tone: 'success', title: __('Table deleted') });
			queryClient.invalidateQueries({ queryKey: ['db-tables'] });
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});
};

export const formatSize = (mb: number): string => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(mb < 1 ? 2 : 1)} MB`);
