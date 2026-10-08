import { useQuery } from '@tanstack/react-query';
import { useIsDark } from '@/react/app/ThemeProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useRest, useWpData } from '@/react/app/WpDataProvider';
import { Icon } from '@/react/ui/Icon';
import { __, sprintf } from '@/react/lib/i18n';

/**
 * Phase 0 checklist: proves the React foundation is wired to WordPress.
 *
 * Replaced by the component showcase in phase 1.
 */

type WpUser = { id: number; name: string; roles?: string[] };

const Row = ({ label, value, ok }: { label: string; value: string; ok?: boolean }) => (
	<div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800">
		<span className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</span>
		<span className="flex min-w-0 items-center gap-2 text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
			{ok === undefined ? null : <Icon name={ok ? 'check_circle' : 'error'} className={ok ? 'text-success-500' : 'text-error-500'} />}
			<span className="truncate">{value}</span>
		</span>
	</div>
);

export const FoundationCheck = () => {
	const wp = useWpData();
	const rest = useRest();
	const isDark = useIsDark();
	const { notify } = useNotify();

	const me = useQuery({
		queryKey: ['wp', 'users', 'me'],
		queryFn: ({ signal }) => rest.get<WpUser>('wp/v2/users/me', { _fields: 'id,name,roles' }, signal),
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">{__('React foundation')}</h1>
				<p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
					{__('Phase 0 of the React migration: data, REST, translations, dark mode and notifications.')}
				</p>
			</div>

			<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
				<h2 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Page data')}</h2>
				<Row label={__('Signed in as')} value={wp.userName || '—'} ok={!!wp.userId} />
				<Row label={__('REST root')} value={wp.restBase || '—'} ok={!!wp.restBase} />
				<Row label={__('Security token')} value={wp.restNonce ? __('present') : __('missing')} ok={!!wp.restNonce} />
				<Row label={__('Plugin folder')} value={wp.pluginBase || '—'} ok={!!wp.pluginBase} />
				<Row label={__('Dark mode')} value={isDark ? __('on') : __('off')} />
				<Row
					label={__('Translations')}
					value={typeof window !== 'undefined' && (window as never as { wp?: { i18n?: unknown } }).wp?.i18n ? __('wp.i18n loaded') : __('fallback to English')}
				/>
			</div>

			<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
				<h2 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('REST request')}</h2>
				{me.isPending ? <p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Loading…')}</p> : null}
				{me.isError ? <p className="text-theme-sm text-error-500">{(me.error as Error).message}</p> : null}
				{me.data ? (
					<Row
						label={__('GET wp/v2/users/me')}
						value={sprintf(__('%1$s (#%2$s)'), me.data.name, String(me.data.id))}
						ok
					/>
				) : null}
			</div>

			<div className="flex flex-wrap gap-3">
				{(['success', 'error', 'warning', 'info'] as const).map((tone) => (
					<button
						key={tone}
						type="button"
						className="inline-flex h-10 items-center rounded-lg border border-gray-300 px-4 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-hidden focus-visible:shadow-focus-ring dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
						onClick={() => notify({ tone, title: sprintf(__('Test notification: %s'), tone) })}
					>
						{sprintf(__('Notify %s'), tone)}
					</button>
				))}
			</div>
		</div>
	);
};
