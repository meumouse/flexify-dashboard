import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateColorScheme } from '@/pages/settings/src/generateColorScheme.js';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useRest } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Badge, Button, Icon, Input, Textarea } from '@/react/ui';
import { useResetSettings, type Settings } from '@/react/features/settings/queries';
import type { SettingDefinition } from '@/pages/settings/src/settings-config.js';
import { FontSelector, GoogleAnalyticsConnection, GoogleRecaptchaConnection, RemoteSites } from '@/react/features/settings/custom/connections';

/**
 * The settings that are small screens of their own.
 *
 * Each is looked up by the name the shared schema gives it, so adding one to the schema is
 * all it takes for both screens to know about it.
 */

export type CustomRenderProps = {
	setting: SettingDefinition;
	settings: Settings;
	onChange: (patch: Settings) => void;
};

type LicenceStatus = {
	license_key?: string;
	status?: string;
	type?: string;
	expires?: string;
	is_dev?: boolean;
	features?: string[];
};

const LicenceKey = ({ settings, onChange }: CustomRenderProps) => {
	const rest = useRest();
	const { notify } = useNotify();
	const queryClient = useQueryClient();
	const [key, setKey] = useState('');

	const status = useQuery({
		queryKey: ['licence'],
		retry: false,
		queryFn: ({ signal }) => rest.get<LicenceStatus>('flexify-dashboard/v1/license/status', {}, signal),
	});

	const act = useMutation<LicenceStatus, Error, { route: 'activate' | 'deactivate'; license_key?: string }>({
		mutationFn: ({ route, license_key }) => rest.post<LicenceStatus>(`flexify-dashboard/v1/license/${route}`, license_key ? { license_key } : {}),
		onSuccess: (_result, { route }) => {
			notify({ tone: 'success', title: route === 'activate' ? __('Licence activated') : __('Licence deactivated') });
			queryClient.invalidateQueries({ queryKey: ['licence'] });
			setKey('');
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const active = status.data?.status === 'valid' || status.data?.status === 'active';
	const stored = String(settings.license_key ?? status.data?.license_key ?? '');

	if (status.data?.is_dev) {
		return <Alert variant="info" title={__('This looks like a development site, so no licence is needed here.')} />;
	}

	if (active) {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant="light" color="success">
						{__('Active')}
					</Badge>
					{/* Only the last few characters, because the rest is a secret. */}
					<span className="font-mono text-theme-sm text-gray-600 dark:text-gray-400">{stored ? `••••••••${stored.slice(-4)}` : ''}</span>
					{status.data?.type ? <span className="text-theme-xs text-gray-500">{status.data.type}</span> : null}
					{status.data?.expires ? <span className="text-theme-xs text-gray-500">{sprintf(__('Until %s'), status.data.expires)}</span> : null}
				</div>

				<Button variant="outline" size="sm" loading={act.isPending} onClick={() => act.mutate({ route: 'deactivate' })} className="self-start">
					{__('Deactivate')}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Input
				value={key}
				onChange={(event) => setKey(event.target.value)}
				placeholder={__('Your licence key')}
				aria-label={__('Licence key')}
				autoComplete="off"
				className="max-w-sm flex-1"
			/>
			<Button
				size="sm"
				loading={act.isPending}
				disabled={!key.trim()}
				onClick={() =>
					act.mutate(
						{ route: 'activate', license_key: key.trim() },
						{ onSuccess: () => onChange({ license_key: key.trim() }) }
					)
				}
			>
				{__('Activate')}
			</Button>
		</div>
	);
};

const ResetSettings = () => {
	const confirm = useConfirm();
	const reset = useResetSettings();

	const askThenReset = async () => {
		const confirmed = await confirm({
			title: __('Reset every setting?'),
			message: __('Everything on this screen goes back to how the plugin ships. There is no undo.'),
			confirmLabel: __('Reset everything'),
			variant: 'danger',
		});

		if (confirmed) {
			reset.mutate();
		}
	};

	return (
		<Button variant="danger" size="sm" icon="restart_alt" loading={reset.isPending} onClick={askThenReset}>
			{__('Reset every setting')}
		</Button>
	);
};

/** One colour, with the scale the plugin builds from it shown underneath. */
const ColorScale = ({ setting, settings, onChange }: CustomRenderProps) => {
	const props = (setting.componentProps ?? {}) as { colorKey?: string; scaleKey?: string; scaleLabel?: string };
	const colorKey = props.colorKey ?? setting.id;
	const scaleKey = props.scaleKey ?? `${setting.id}_scale`;
	const base = String(settings[colorKey] ?? '#008aff');
	const scale = (settings[scaleKey] ?? {}) as Record<string, string>;

	const build = (value: string) => onChange({ [colorKey]: value, [scaleKey]: generateColorScheme(value) });

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<input type="color" value={base} onChange={(event) => build(event.target.value)} aria-label={setting.label} className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-800" />
				<Input value={base} onChange={(event) => build(event.target.value)} aria-label={sprintf(__('%s as a hex value'), setting.label)} className="max-w-32 font-mono" />
				<Button variant="ghost" size="sm" icon="refresh" onClick={() => build(base)}>
					{__('Rebuild the scale')}
				</Button>
			</div>

			{Object.keys(scale).length ? (
				<div className="flex flex-wrap gap-1">
					{Object.entries(scale).map(([step, color]) => (
						<span key={step} className="flex flex-col items-center gap-1">
							<span className="h-8 w-8 rounded-md border border-gray-200 dark:border-gray-800" style={{ background: color }} title={`${step}: ${color}`} />
							<span className="text-[10px] text-gray-400">{step}</span>
						</span>
					))}
				</div>
			) : null}
		</div>
	);
};

const CodeEditorSetting = ({ setting, settings, onChange }: CustomRenderProps) => (
	<Textarea
		rows={12}
		value={String(settings[setting.id] ?? '')}
		onChange={(event) => onChange({ [setting.id]: event.target.value })}
		aria-label={setting.label}
		spellCheck={false}
		className="font-mono text-theme-xs"
	/>
);

/** One stylesheet address per line, which is how a person types a list of them. */
const ExternalStylesheets = ({ setting, settings, onChange }: CustomRenderProps) => {
	const value = settings[setting.id];
	const lines = Array.isArray(value) ? value.map(String) : String(value ?? '').split('\n').filter(Boolean);

	return (
		<Textarea
			rows={4}
			value={lines.join('\n')}
			onChange={(event) => onChange({ [setting.id]: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })}
			placeholder="https://example.com/style.css"
			aria-label={setting.label}
			spellCheck={false}
			className="font-mono text-theme-xs"
		/>
	);
};

/** Pairs of "find this, say that" — the white-label text replacements. */
const TextPairs = ({ setting, settings, onChange }: CustomRenderProps) => {
	const pairs = Array.isArray(settings[setting.id]) ? (settings[setting.id] as [string, string][]) : [];

	const set = (next: [string, string][]) => onChange({ [setting.id]: next });

	return (
		<div className="flex flex-col items-start gap-3">
			{pairs.map((pair, index) => (
				<div key={index} className="flex items-center gap-2">
					<Input
						value={pair[0] ?? ''}
						onChange={(event) => set(pairs.map((item, position) => (position === index ? [event.target.value, item[1]] : item)))}
						placeholder={__('Find')}
						aria-label={__('Find')}
					/>
					<Icon name="arrow_right_alt" className="text-base text-gray-400" />
					<Input
						value={pair[1] ?? ''}
						onChange={(event) => set(pairs.map((item, position) => (position === index ? [item[0], event.target.value] : item)))}
						placeholder={__('Replace with')}
						aria-label={__('Replace with')}
					/>
					<Button variant="ghost" size="sm" iconOnly icon="close" onClick={() => set(pairs.filter((_item, position) => position !== index))} aria-label={__('Remove')} />
				</div>
			))}

			<Button variant="outline" size="sm" icon="add" onClick={() => set([...pairs, ['', '']])}>
				{__('Add a replacement')}
			</Button>
		</div>
	);
};

const LAYOUTS = (): { value: string; label: string; icon: string }[] => [
	{ value: 'sidebar', label: __('Sidebar'), icon: 'view_sidebar' },
	{ value: 'top', label: __('Across the top'), icon: 'toolbar' },
	{ value: 'minimal', label: __('Minimal'), icon: 'minimize' },
];

const LayoutSelector = ({ setting, settings, onChange }: CustomRenderProps) => {
	const current = String(settings[setting.id] ?? 'sidebar');

	return (
		<div className="flex flex-wrap gap-3">
			{LAYOUTS().map((layout) => (
				<button
					key={layout.value}
					type="button"
					onClick={() => onChange({ [setting.id]: layout.value })}
					className={cn(
						'flex w-32 flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
						current === layout.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5'
					)}
					aria-pressed={current === layout.value}
				>
					<Icon name={layout.icon} className="text-2xl text-gray-500 dark:text-gray-400" />
					<span className="text-theme-xs text-gray-700 dark:text-gray-300">{layout.label}</span>
				</button>
			))}
		</div>
	);
};

export const CUSTOM_RENDERS: Record<string, (props: CustomRenderProps) => React.ReactNode> = {
	'license-key': LicenceKey,
	'remote-sites': RemoteSites,
	'font-selector': FontSelector,
	'google-analytics-connection': GoogleAnalyticsConnection,
	'google-recaptcha-connection': GoogleRecaptchaConnection,
	'reset-settings': ResetSettings,
	'color-scale': ColorScale,
	'code-editor': CodeEditorSetting,
	'external-stylesheets': ExternalStylesheets,
	'text-pairs': TextPairs,
	'layout-selector': LayoutSelector,
};
