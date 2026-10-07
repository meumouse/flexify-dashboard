import { useMemo, type ComponentType } from 'react';
import { applyVueInReact } from 'veaury';
import { useCan, useWpData } from '@/react/app/WpDataProvider';
import type { ExtensionCard } from '@/react/woo/types';

/**
 * Render a sidebar card registered by an extension through the JavaScript hooks.
 *
 * Keeps the contract of the Vue `ComponentRender`: a card is HTML, a React component or a
 * Vue component (wrapped by veaury so it still mounts inside this React tree).
 */

type Props = {
	card: ExtensionCard;
	props: Record<string, unknown>;
};

const framework = (card: ExtensionCard) => card.metadata?.framework ?? card.metadata?.language ?? 'vue';

export const ExtensionCardRender = ({ card, props }: Props) => {
	const can = useCan();
	const { page } = useWpData();

	const kind = framework(card);
	const metadata = card.metadata ?? {};

	const Component = useMemo(() => {
		if (kind === 'html' || !card.component) {
			return null;
		}

		return kind === 'react' ? (card.component as ComponentType<Record<string, unknown>>) : (applyVueInReact(card.component) as ComponentType<Record<string, unknown>>);
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

	if (!Component) {
		return null;
	}

	return <Component id={metadata.id} className={metadata.className} {...props} />;
};
