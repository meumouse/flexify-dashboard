import { useEffect, useRef, useState } from 'react';
import { __ } from '@/react/lib/i18n';
import { Input } from '@/react/form/Input';
import type { FieldSize } from '@/react/ui/recipes';

type Props = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	/** Milliseconds to wait before reporting the typed value */
	debounce?: number;
	size?: FieldSize;
	disabled?: boolean;
	className?: string;
	'aria-label'?: string;
};

/**
 * Search field that reports the typed value after a short pause.
 */
export const SearchInput = ({ value, onChange, placeholder, debounce = 350, size = 'md', disabled, className, ...rest }: Props) => {
	const [local, setLocal] = useState(value);
	const timer = useRef<number>(undefined);
	const latest = useRef(onChange);

	latest.current = onChange;

	useEffect(() => {
		setLocal(value);
	}, [value]);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	const report = (next: string, immediate = false) => {
		setLocal(next);
		window.clearTimeout(timer.current);

		if (immediate) {
			latest.current(next);
			return;
		}

		timer.current = window.setTimeout(() => latest.current(next), debounce);
	};

	return (
		<Input
			{...rest}
			type="search"
			icon="search"
			clearable
			size={size}
			disabled={disabled}
			className={className}
			value={local}
			placeholder={placeholder ?? __('Search...')}
			aria-label={rest['aria-label'] ?? placeholder ?? __('Search')}
			autoComplete="off"
			onChange={(event) => report(event.target.value)}
			onClear={() => report('', true)}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					report(local, true);
				}
			}}
		/>
	);
};
