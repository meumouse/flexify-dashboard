import { useWpData } from '@/react/app/WpDataProvider';

/**
 * Renders an icon from `assets/icons` as a CSS mask, so it inherits the current color.
 */

type Props = {
	name: string;
	className?: string;
	title?: string;
};

export const Icon = ({ name, className, title }: Props) => {
	const { pluginBase } = useWpData();
	const source = name.startsWith('data:image') ? name : `${pluginBase}assets/icons/${name}.svg`;

	return (
		<span
			className={className}
			role={title ? 'img' : undefined}
			aria-label={title}
			aria-hidden={title ? undefined : true}
			style={{
				display: 'block',
				height: '1em',
				width: '1em',
				minHeight: '1em',
				minWidth: '1em',
				backgroundColor: 'currentColor',
				WebkitMaskImage: `url(${source})`,
				WebkitMaskRepeat: 'no-repeat',
				WebkitMaskPosition: 'center',
				WebkitMaskSize: 'contain',
				maskImage: `url(${source})`,
				maskRepeat: 'no-repeat',
				maskPosition: 'center',
				maskSize: 'contain',
			}}
		/>
	);
};
