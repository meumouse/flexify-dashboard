import type { ReactNode } from 'react';
import { hintClasses, labelClass, type FieldState } from '@/react/ui/recipes';

export type FieldProps = {
	label?: string;
	/** id of the control the label points to */
	htmlFor?: string;
	hint?: string;
	error?: string | boolean;
	success?: string | boolean;
	required?: boolean;
	className?: string;
	children: ReactNode;
};

export const fieldState = (error?: string | boolean, success?: string | boolean): FieldState => {
	if (error) {
		return 'error';
	}

	return success ? 'success' : 'default';
};

export const Field = ({ label, htmlFor, hint, error, success, required = false, className, children }: FieldProps) => {
	const state = fieldState(error, success);
	const message = (typeof error === 'string' && error) || (typeof success === 'string' && success) || hint;

	return (
		<div className={className}>
			{label ? (
				<label htmlFor={htmlFor} className={labelClass}>
					{label}
					{required ? <span className="text-error-500"> *</span> : null}
				</label>
			) : null}
			{children}
			{message ? <p className={hintClasses[state]}>{message}</p> : null}
		</div>
	);
};
