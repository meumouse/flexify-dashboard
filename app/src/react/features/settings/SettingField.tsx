import { useQuery } from '@tanstack/react-query';
import { useRest, useWpData } from '@/react/app/WpDataProvider';
import { openMediaFrame } from '@/react/lib/wpMedia';
import { __ } from '@/react/lib/i18n';
import { Button, Icon, Input, Select, Switch, Textarea } from '@/react/ui';
import { EntityPicker } from '@/react/data/EntityPicker';
import { CUSTOM_RENDERS } from '@/react/features/settings/custom';
import type { SettingDefinition } from '@/shared/settings/settings-config.js';
import type { Settings } from '@/react/features/settings/queries';

/**
 * One setting, drawn according to what the schema says it is.
 *
 * A setting the schema calls `custom` is its own small screen; those live in `custom/` and
 * are looked up by name.
 */

type Props = {
	setting: SettingDefinition;
	settings: Settings;
	onChange: (patch: Settings) => void;
};

const asString = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

const asArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

/** Pick a file from the media library the site already has. */
const ImageSetting = ({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (value: string) => void }) => (
	<div className="flex items-center gap-2">
		{value ? <img src={value} alt="" aria-hidden className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : null}

		<Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} aria-label={placeholder ?? __('Image address')} className="flex-1" />

		<Button variant="outline" size="sm" icon="image" onClick={() => openMediaFrame({ title: __('Choose an image') }).then((files) => (files[0] ? onChange(files[0].url) : undefined))}>
			{__('Choose')}
		</Button>

		{value ? <Button variant="ghost" size="sm" iconOnly icon="close" onClick={() => onChange('')} aria-label={__('Clear')} /> : null}
	</div>
);

const PostTypeSetting = ({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) => {
	const { page } = useWpData();
	const types = Object.values((page.postTypes ?? {}) as Record<string, { name: string; labels?: { name?: string } }>);

	return (
		<div className="flex flex-wrap gap-3">
			{types.map((type) => (
				<label key={type.name} className="flex cursor-pointer items-center gap-2 text-theme-sm">
					<input
						type="checkbox"
						checked={value.includes(type.name)}
						onChange={(event) => onChange(event.target.checked ? [...value, type.name] : value.filter((item) => item !== type.name))}
						className="accent-brand-500"
					/>
					<span className="text-gray-700 dark:text-gray-300">{type.labels?.name ?? type.name}</span>
				</label>
			))}
		</div>
	);
};

const PluginSetting = ({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) => {
	const rest = useRest();

	const { data: plugins = [] } = useQuery({
		queryKey: ['settings-plugins'],
		staleTime: 300_000,
		queryFn: async ({ signal }) => {
			const result = await rest.get<{ plugins?: Record<string, { Name: string; slug: string }> }>('flexify-dashboard/v1/plugins', {}, signal);

			return Object.values(result.plugins ?? {});
		},
	});

	return (
		<div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-xl border border-gray-200 p-3 dark:border-gray-800">
			{plugins.map((plugin) => (
				<label key={plugin.slug} className="flex cursor-pointer items-center gap-2 text-theme-sm">
					<input
						type="checkbox"
						checked={value.includes(plugin.slug)}
						onChange={(event) => onChange(event.target.checked ? [...value, plugin.slug] : value.filter((item) => item !== plugin.slug))}
						className="accent-brand-500"
					/>
					<span className="truncate text-gray-700 dark:text-gray-300">{plugin.Name}</span>
				</label>
			))}
		</div>
	);
};

export const SettingField = ({ setting, settings, onChange }: Props) => {
	const value = settings[setting.id];
	const props = (setting.componentProps ?? {}) as { placeholder?: string; options?: { value: string; label: string }[]; min?: number; max?: number };
	const set = (next: unknown) => onChange({ [setting.id]: next });

	if (setting.type === 'custom') {
		const Render = setting.customRender ? CUSTOM_RENDERS[setting.customRender] : undefined;

		return Render ? (
			<Render setting={setting} settings={settings} onChange={onChange} />
		) : (
			<p className="text-theme-xs text-gray-400">{__('This setting is not available on this screen.')}</p>
		);
	}

	switch (setting.type) {
		case 'toggle':
			return <Switch checked={value === true} onCheckedChange={set} aria-label={setting.label} />;

		case 'select':
			return <Select value={asString(value)} options={props.options ?? []} onChange={(event) => set(event.target.value)} aria-label={setting.label} className="max-w-xs" />;

		case 'number':
			return <Input type="number" min={props.min} max={props.max} value={asString(value)} onChange={(event) => set(Number(event.target.value))} aria-label={setting.label} className="max-w-32" />;

		case 'password':
			return <Input type="password" value={asString(value)} placeholder={props.placeholder} onChange={(event) => set(event.target.value)} aria-label={setting.label} className="max-w-md" autoComplete="off" />;

		case 'text':
			return <Textarea rows={4} value={asString(value)} placeholder={props.placeholder} onChange={(event) => set(event.target.value)} aria-label={setting.label} />;

		case 'image-select':
			return <ImageSetting value={asString(value)} placeholder={props.placeholder} onChange={set} />;

		case 'user-role-select':
			return (
				<EntityPicker
					endpoint="wp/v2/users"
					toItem={(record) => ({ id: Number(record.id), label: String(record.name ?? '') })}
					value={Array.isArray(value) ? value.map(Number) : []}
					onChange={set}
					placeholder={props.placeholder ?? __('Anyone')}
					className="max-w-md"
				/>
			);

		case 'post-type-select':
			return <PostTypeSetting value={asArray(value)} onChange={set} />;

		case 'plugin-select':
			return <PluginSetting value={asArray(value)} onChange={set} />;

		default:
			return <Input value={asString(value)} placeholder={props.placeholder} onChange={(event) => set(event.target.value)} aria-label={setting.label} className="max-w-md" />;
	}
};

export const LockedSetting = ({ label }: { label: string }) => (
	<span className="flex items-center gap-2 text-theme-xs text-gray-400">
		<Icon name="lock" className="text-sm" />
		{label}
	</span>
);
