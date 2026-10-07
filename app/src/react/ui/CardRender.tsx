import { useMemo, type ComponentType } from 'react';
import { useCan, useWpData } from '@/react/app/WpDataProvider';
import { __ } from '@/react/lib/i18n';

/**
 * Render a card registered through the JavaScript API, wherever it came from.
 *
 * A card is markup or a React component, and says which capabilities and plugins it needs.
 * Vue cards were supported while the plugin had Vue in it; from 4.0.0 there is no Vue to
 * mount them with, and a card that says it is one says so on screen instead of rendering
 * nothing, so whoever wrote it can see what happened.
 */

export type RenderableCard = {
	title?: string;
	component: unknown;
	metadata?: {
		id?: string;
		className?: string;
		framework?: 'vue' | 'react' | 'html';
		language?: 'vue' | 'react' | 'html';
		requires_capabilities?: string[];
		requiresCapabilities?: string[];
		requires_plugins?: string[];
		requiresPlugins?: string[];
	};
};

type Props = {
	card: RenderableCard;
	props: Record<string, unknown>;
};

const framework = (card: RenderableCard) => card.metadata?.framework ?? card.metadata?.language ?? 'react';

export const CardRender = ({ card, props }: Props) => {
	const can = useCan();
	const { page } = useWpData();

	const kind = framework(card);
	const metadata = card.metadata ?? {};

	const Component = useMemo(() => {
		if (kind === 'html' || !card.component) {
			return null;
		}

		if (kind === 'vue') {
			return null;
		}

		return card.component as ComponentType<Record<string, unknown>>;
	}, [card.component, kind]);

	const capabilities = metadata.requires_capabilities ?? metadata.requiresCapabilities;

	// With no capability list the card is for everyone; otherwise one match is enough.
	if (Array.isArray(capabilities) && capabilities.length && !capabilities.some((capability) => can(capability))) {
		return null;
	}

	const requiredPlugins = metadata.requires_plugins ?? metadata.requiresPlugins;
	const activePlugins = (page.plugins as { path?: string; slug?: string }[] | undefined) ?? null;

	if (Array.isArray(requiredPlugins) && requiredPlugins.length && Array.isArray(activePlugins)) {
		const active = new Set(activePlugins.flatMap((plugin) => [plugin.path, plugin.slug].filter(Boolean) as string[]));

		if (!requiredPlugins.every((plugin) => active.has(plugin))) {
			return null;
		}
	}

	if (kind === 'html') {
		// The markup comes from an extension running in the same admin page, like a Vue card would.
		return <div id={metadata.id} className={metadata.className} dangerouslySetInnerHTML={{ __html: String(card.component ?? '') }} />;
	}

	if (kind === 'vue') {
		return (
			<div className="rounded-xl bg-warning-50 p-4 text-theme-xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
				{__('This card was built for the old Vue dashboard. It needs to be rebuilt as a React component or as markup.')}
			</div>
		);
	}

	if (!Component) {
		return null;
	}

	return <Component id={metadata.id} className={metadata.className} {...props} />;
};
