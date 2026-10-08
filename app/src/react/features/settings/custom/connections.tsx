import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useRest } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { openMediaFrame } from '@/react/lib/wpMedia';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Badge, Button, Icon, Input, Select, Textarea } from '@/react/ui';
import type { CustomRenderProps } from '@/react/features/settings/custom';

/**
 * The settings that connect this site to something else, and the one that chooses a font.
 *
 * Each of these is a small screen with a state of its own — connected or not, a list that
 * grows — which is why they are not ordinary fields.
 */

type RemoteSite = { url: string; username?: string; app_password?: string };

/** A site address, as the REST client will have to use it. */
export const normaliseSiteUrl = (value: string): string | null => {
	const trimmed = value.trim().replace(/\/+$/, '');

	if (!trimmed) {
		return null;
	}

	const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

	try {
		return new URL(withScheme).origin;
	} catch {
		return null;
	}
};

export const RemoteSites = ({ settings, onChange }: CustomRenderProps) => {
	const confirm = useConfirm();
	const { notify } = useNotify();
	const sites = (Array.isArray(settings.remote_sites) ? settings.remote_sites : []) as RemoteSite[];
	const [form, setForm] = useState({ url: '', username: '', app_password: '' });

	const add = () => {
		const url = normaliseSiteUrl(form.url);

		if (!url) {
			notify({ tone: 'error', title: __('That does not look like a site address.') });
			return;
		}

		if (sites.some((site) => site.url === url)) {
			notify({ tone: 'error', title: __('That site is already on the list.') });
			return;
		}

		onChange({ remote_sites: [...sites, { url, username: form.username.trim(), app_password: form.app_password.trim() }] });
		setForm({ url: '', username: '', app_password: '' });
	};

	const removeAt = async (index: number) => {
		const confirmed = await confirm({
			title: __('Remove this site?'),
			message: __('This site stops being reachable from here. Nothing on the other site changes.'),
			confirmLabel: __('Remove'),
			variant: 'danger',
		});

		if (confirmed) {
			onChange({ remote_sites: sites.filter((_site, position) => position !== index) });
		}
	};

	return (
		<div className="flex flex-col gap-4">
			{sites.length ? (
				<ul className="flex flex-col gap-2">
					{sites.map((site, index) => (
						<li key={site.url} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
							<Icon name="public" className="shrink-0 text-theme-md text-gray-400" />
							<div className="min-w-0 flex-1">
								<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{site.url}</p>
								<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{site.username || __('No user set')}</p>
							</div>
							<Button variant="ghost" size="sm" iconOnly icon="close" onClick={() => removeAt(index)} aria-label={sprintf(__('Remove %s'), site.url)} />
						</li>
					))}
				</ul>
			) : (
				<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('No other site is connected yet.')}</p>
			)}

			<div className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 p-3 dark:border-gray-700">
				<Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://outro-site.com" aria-label={__('Site address')} />

				<div className="grid gap-2 sm:grid-cols-2">
					<Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder={__('Username there')} aria-label={__('Username there')} autoComplete="off" />
					<Input
						type="password"
						value={form.app_password}
						onChange={(event) => setForm({ ...form, app_password: event.target.value })}
						placeholder={__('Application password')}
						aria-label={__('Application password')}
						autoComplete="off"
					/>
				</div>

				<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('An application password, made on the other site. Not the password you sign in with.')}</p>

				<Button size="sm" icon="add" onClick={add} className="self-start">
					{__('Add the site')}
				</Button>
			</div>
		</div>
	);
};

type GoogleStatus = { connected?: boolean; property_id?: string; account?: string };

type GoogleProperty = { id?: string; property_id?: string; displayName?: string; name?: string };

export const GoogleAnalyticsConnection = () => {
	const rest = useRest();
	const { notify } = useNotify();
	const confirm = useConfirm();
	const queryClient = useQueryClient();
	const [credentials, setCredentials] = useState('');

	const status = useQuery({
		queryKey: ['ga-status'],
		retry: false,
		queryFn: ({ signal }) => rest.get<GoogleStatus>('flexify-dashboard/v1/google-analytics/status', {}, signal),
	});

	const properties = useQuery({
		queryKey: ['ga-properties'],
		enabled: Boolean(status.data?.connected),
		retry: false,
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ properties?: GoogleProperty[] } | GoogleProperty[]>('flexify-dashboard/v1/google-analytics/properties', {}, signal);

			return Array.isArray(result) ? result : (result.properties ?? []);
		},
	});

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['ga-status'] });
		queryClient.invalidateQueries({ queryKey: ['ga-properties'] });
	};

	const connect = useMutation<unknown, Error, string>({
		mutationFn: (json) => rest.post('flexify-dashboard/v1/google-analytics/credentials', { credentials: json }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Connected to Google Analytics') });
			setCredentials('');
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const chooseProperty = useMutation<unknown, Error, string>({
		mutationFn: (property_id) => rest.post('flexify-dashboard/v1/google-analytics/property', { property_id }),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Property chosen') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const disconnect = useMutation<unknown, Error, void>({
		mutationFn: () => rest.post('flexify-dashboard/v1/google-analytics/disconnect'),
		onSuccess: () => {
			notify({ tone: 'success', title: __('Disconnected') });
			refresh();
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	const askThenDisconnect = async () => {
		const confirmed = await confirm({
			title: __('Disconnect Google Analytics?'),
			message: __('The stored credentials are removed from this site. The data stays with Google.'),
			confirmLabel: __('Disconnect'),
			variant: 'danger',
		});

		if (confirmed) {
			disconnect.mutate();
		}
	};

	if (status.data?.connected) {
		const list = properties.data ?? [];

		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant="light" color="success">
						{__('Connected')}
					</Badge>
					{status.data.account ? <span className="text-theme-xs text-gray-500 dark:text-gray-400">{status.data.account}</span> : null}
				</div>

				<Select
					value={status.data.property_id ?? ''}
					options={[
						{ value: '', label: __('Choose a property') },
						...list.map((property) => ({ value: String(property.property_id ?? property.id ?? ''), label: property.displayName ?? property.name ?? String(property.id) })),
					]}
					onChange={(next) => (next ? chooseProperty.mutate(next) : undefined)}
					aria-label={__('Analytics property')}
					className="max-w-sm"
				/>

				<Button variant="outline" size="sm" loading={disconnect.isPending} onClick={askThenDisconnect} className="self-start">
					{__('Disconnect')}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<Alert variant="info" title={__('A service account is needed.')}>
				{__('Create one in Google Cloud, give it read access to the property, and paste its JSON key here. It is stored encrypted.')}
			</Alert>

			<Textarea
				rows={5}
				value={credentials}
				onChange={(event) => setCredentials(event.target.value)}
				placeholder='{"type": "service_account", ...}'
				aria-label={__('Service account key')}
				spellCheck={false}
				className="font-mono text-theme-xs"
			/>

			<Button size="sm" loading={connect.isPending} disabled={!credentials.trim()} onClick={() => connect.mutate(credentials.trim())} className="self-start">
				{__('Connect')}
			</Button>
		</div>
	);
};

export const GoogleRecaptchaConnection = ({ settings, onChange }: CustomRenderProps) => {
	const rest = useRest();
	const { notify } = useNotify();
	const [siteKey, setSiteKey] = useState(String(settings.google_recaptcha_site_key ?? ''));
	const [secret, setSecret] = useState('');

	const configured = Boolean(settings.google_recaptcha_site_key);

	const save = useMutation<unknown, Error, { site_key: string; secret_key: string }>({
		mutationFn: (data) => rest.post('flexify-dashboard/v1/google-recaptcha/credentials', data),
		onSuccess: (_result, data) => {
			notify({ tone: 'success', title: __('reCAPTCHA keys saved') });
			// The secret is kept by the server, encrypted; only the site key belongs on screen.
			onChange({ google_recaptcha_site_key: data.site_key });
			setSecret('');
		},
		onError: (error) => notify({ tone: 'error', title: error.message }),
	});

	return (
		<div className="flex flex-col gap-3">
			{configured ? (
				<Badge variant="light" color="success">
					{__('Keys are set')}
				</Badge>
			) : null}

			<Input value={siteKey} onChange={(event) => setSiteKey(event.target.value)} label={__('Site key')} autoComplete="off" className="max-w-md" />

			<Input
				type="password"
				value={secret}
				onChange={(event) => setSecret(event.target.value)}
				label={__('Secret key')}
				hint={configured ? __('Leave empty to keep the one already stored.') : undefined}
				autoComplete="off"
				className="max-w-md"
			/>

			<Button size="sm" loading={save.isPending} disabled={!siteKey.trim()} onClick={() => save.mutate({ site_key: siteKey.trim(), secret_key: secret.trim() })} className="self-start">
				{__('Save the keys')}
			</Button>
		</div>
	);
};

const GOOGLE_FONTS = [
	'Inter',
	'Roboto',
	'Open Sans',
	'Lato',
	'Montserrat',
	'Poppins',
	'Nunito',
	'Raleway',
	'Rubik',
	'Work Sans',
	'DM Sans',
	'Manrope',
	'Plus Jakarta Sans',
	'Space Grotesk',
	'Outfit',
	'Sora',
	'Figtree',
	'Playfair Display',
	'Merriweather',
	'Lora',
	'PT Serif',
	'Libre Baskerville',
	'JetBrains Mono',
	'Fira Code',
	'Source Code Pro',
	'IBM Plex Mono',
	'Bebas Neue',
	'Oswald',
];

const WEIGHTS = ['300', '400', '500', '600', '700'];

/** The stylesheet Google serves for a family and the weights that are wanted. */
export const googleFontUrl = (family: string, weights: string[]): string =>
	`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${[...weights].sort().join(';')}&display=swap`;

export const FontSelector = ({ settings, onChange }: CustomRenderProps) => {
	const source = String(settings.custom_font_source ?? 'system');
	const family = String(settings.custom_font_family ?? '');
	const url = String(settings.custom_font_url ?? '');
	const [weights, setWeights] = useState<string[]>(WEIGHTS);

	// The chosen font is loaded here too, so the preview is the font itself and not a guess.
	useEffect(() => {
		if (source !== 'google' || !family) {
			return;
		}

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = googleFontUrl(family, weights);
		document.head.appendChild(link);

		return () => link.remove();
	}, [family, source, weights]);

	return (
		<div className="flex flex-col gap-4">
			<Select
				value={source}
				options={[
					{ value: 'system', label: __('The one the plugin ships with') },
					{ value: 'google', label: __('Google Fonts') },
					{ value: 'url', label: __('A stylesheet of my own') },
					{ value: 'upload', label: __('A font file I upload') },
				]}
				onChange={(next) => onChange({ custom_font_source: next })}
				aria-label={__('Where the font comes from')}
				className="max-w-xs"
			/>

			{source === 'google' ? (
				<>
					<Select
						value={family}
						options={[{ value: '', label: __('Choose a font') }, ...GOOGLE_FONTS.map((name) => ({ value: name, label: name }))]}
						onChange={(next) => onChange({ custom_font_family: next, custom_font_url: next ? googleFontUrl(next, weights) : '' })}
						aria-label={__('Font')}
						className="max-w-xs"
					/>

					<div className="flex flex-wrap items-center gap-2">
						<span className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Weights')}</span>
						{['100', '200', '300', '400', '500', '600', '700', '800', '900'].map((weight) => (
							<button
								key={weight}
								type="button"
								onClick={() => {
									const next = weights.includes(weight) ? weights.filter((item) => item !== weight) : [...weights, weight];
									setWeights(next.length ? next : ['400']);
									onChange({ custom_font_url: family ? googleFontUrl(family, next.length ? next : ['400']) : '' });
								}}
								className={cn(
									'rounded-lg px-2 py-1 text-theme-xs font-medium transition-colors',
									weights.includes(weight) ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
								)}
								aria-pressed={weights.includes(weight)}
							>
								{weight}
							</button>
						))}
					</div>

					{family ? (
						<p className="rounded-xl border border-gray-200 p-4 text-theme-xl dark:border-gray-800" style={{ fontFamily: `"${family}", sans-serif` }}>
							{__('The quick brown fox jumps over the lazy dog')}
						</p>
					) : null}
				</>
			) : null}

			{source === 'url' ? (
				<Input
					value={url}
					onChange={(event) => onChange({ custom_font_url: event.target.value })}
					label={__('Stylesheet address')}
					placeholder="https://example.com/fonts.css"
					className="max-w-xl"
				/>
			) : null}

			{source === 'upload' ? (
				<div className="flex flex-wrap items-center gap-2">
					<Input value={url} onChange={(event) => onChange({ custom_font_url: event.target.value })} label={__('Font file')} placeholder="https://…/font.woff2" className="max-w-xl flex-1" />
					<Button
						variant="outline"
						size="sm"
						icon="upload"
						className="self-end"
						onClick={() => openMediaFrame({ title: __('Choose a font file'), type: '' }).then((files) => (files[0] ? onChange({ custom_font_url: files[0].url }) : undefined))}
					>
						{__('Choose')}
					</Button>
				</div>
			) : null}

			{source !== 'system' ? (
				<Input value={family} onChange={(event) => onChange({ custom_font_family: event.target.value })} label={__('Font family name')} hint={__('The name the stylesheet gives it.')} className="max-w-sm" />
			) : null}
		</div>
	);
};
