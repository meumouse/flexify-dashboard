import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/react/lib/cn';
import { Field, fieldState } from '@/react/form/Field';
import { fieldBase, fieldStates } from '@/react/ui/recipes';

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
	label?: string;
	hint?: string;
	error?: string | boolean;
	success?: string | boolean;
	required?: boolean;
	className?: string;
	textareaClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
	{ label, hint, error, success, required = false, className, textareaClassName, id, rows = 4, ...rest },
	ref
) {
	const generatedId = useId();
	const textareaId = id ?? generatedId;
	const state = fieldState(error, success);

	return (
		<Field label={label} htmlFor={textareaId} hint={hint} error={error} success={success} required={required} className={className}>
			<textarea
				{...rest}
				id={textareaId}
				ref={ref}
				rows={rows}
				required={required}
				aria-invalid={state === 'error' || undefined}
				className={cn(fieldBase, fieldStates[state], 'px-4 py-3', textareaClassName)}
			/>
		</Field>
	);
});
