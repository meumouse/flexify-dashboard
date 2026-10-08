import { useEffect } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Checkbox } from '@/react/form/Checkbox';
import { Icon } from '@/react/ui/Icon';
import { hexToRgb, useLoginScreen, type LoginConfig } from '@/react/features/login/useLoginScreen';

/**
 * The login screen the plugin puts in place of the WordPress one.
 *
 * It is the only React screen that runs for somebody who is not signed in, so it uses no part
 * of the admin: the site's own name, logo and colours come from a small public endpoint.
 */

const Field = ({
	id,
	label,
	type = 'text',
	value,
	onChange,
	autoComplete,
	autoFocus,
	children,
}: {
	id: string;
	label: string;
	type?: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete?: string;
	autoFocus?: boolean;
	children?: React.ReactNode;
}) => (
	<div className="fd-login-field">
		<label htmlFor={id} className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
			{label}
		</label>
		<div className="relative flex items-center">
			<input
				id={id}
				name={id}
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				autoComplete={autoComplete}
				autoFocus={autoFocus}
				className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-theme-sm text-gray-900 shadow-theme-xs outline-hidden transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
			/>
			{children}
		</div>
	</div>
);

export const LoginScreen = ({ config }: { config: LoginConfig }) => {
	const screen = useLoginScreen(config);
	const { site } = screen;

	// The brand colours decide what this page looks like, and they arrive after it loads.
	useEffect(() => {
		const root = document.documentElement;

		root.style.setProperty('--fd-login-accent', hexToRgb(site.asideColor));
		root.style.setProperty('--fd-login-gradient-start', hexToRgb(site.asideGradientStart, '0 112 224'));
		root.style.setProperty('--fd-login-gradient-end', hexToRgb(site.asideGradientEnd, '0 47 115'));
		root.style.setProperty('--fd-login-glow', hexToRgb(site.asideGlowColor, '19 146 255'));
	}, [site]);

	const initial = (site.siteName || 'A').charAt(0).toUpperCase();
	const onLogin = screen.screen === 'login';

	return (
		<div className="fd-login grid min-h-screen w-full lg:grid-cols-2">
			<aside
				className="relative hidden items-center overflow-hidden lg:grid"
				style={{
					background: 'linear-gradient(135deg, rgb(var(--fd-login-gradient-start)) 0%, rgb(var(--fd-login-gradient-end)) 100%)',
				}}
			>
				<span
					aria-hidden
					className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full opacity-40 blur-3xl"
					style={{ background: 'rgb(var(--fd-login-glow))' }}
				/>

				<div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-6 p-12 text-center text-white">
					{site.logoUrl ? (
						<img src={site.logoUrl} alt="" aria-hidden className="max-h-20 max-w-xs object-contain" />
					) : (
						<span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-title-sm font-semibold">{initial}</span>
					)}

					{site.siteName ? <h1 className="text-title-xs font-semibold">{site.siteName}</h1> : null}
					{site.siteDescription ? <p className="text-theme-sm text-white/80">{site.siteDescription}</p> : null}
				</div>
			</aside>

			<main className="flex items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
				<div className="w-full max-w-sm">
					<div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
						{site.siteLogoUrl || site.logoUrl ? (
							<img src={site.siteLogoUrl || site.logoUrl} alt="" aria-hidden className="max-h-14 object-contain" />
						) : null}
						{site.siteName ? <span className="text-theme-lg font-semibold text-gray-900 dark:text-white/90">{site.siteName}</span> : null}
					</div>

					<h2 className="mb-1 text-theme-xl font-semibold text-gray-900 dark:text-white/90">{onLogin ? __('Sign in') : __('Reset your password')}</h2>
					<p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
						{onLogin ? __('Enter your details to carry on.') : __('Tell us your username or email and we will send you a link.')}
					</p>

					{screen.notice ? (
						<div
							className={cn(
								'mb-4 rounded-lg px-3 py-2 text-theme-sm',
								screen.notice.type === 'success' ? 'bg-success-50 text-success-700 dark:bg-success-500/10' : 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10'
							)}
							role="status"
						>
							{screen.notice.message}
						</div>
					) : null}

					{screen.error ? (
						<div className="mb-4 rounded-lg bg-error-50 px-3 py-2 text-theme-sm text-error-700 dark:bg-error-500/10 dark:text-error-400" role="alert">
							{screen.error}
						</div>
					) : null}

					<form
						onSubmit={(event) => {
							event.preventDefault();
							(onLogin ? screen.submit : screen.submitRecovery)();
						}}
						className="flex flex-col gap-4"
					>
						{onLogin ? (
							<>
								<Field id="user_login" label={__('Username or email')} value={screen.username} onChange={screen.setUsername} autoComplete="username" autoFocus />

								<Field
									id="user_pass"
									label={__('Password')}
									type={screen.showPassword ? 'text' : 'password'}
									value={screen.password}
									onChange={screen.setPassword}
									autoComplete="current-password"
								>
									<button
										type="button"
										onClick={() => screen.setShowPassword(!screen.showPassword)}
										className="absolute end-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
										aria-label={screen.showPassword ? __('Hide the password') : __('Show the password')}
									>
										<Icon name={screen.showPassword ? 'visibility_off' : 'visibility'} className="text-theme-md" />
									</button>
								</Field>

								<Checkbox size="sm" checked={screen.remember} onCheckedChange={screen.setRemember} label={__('Keep me signed in')} className="items-center" />
							</>
						) : (
							<Field id="user_login_recovery" label={__('Username or email')} value={screen.recoveryLogin} onChange={screen.setRecoveryLogin} autoComplete="username" autoFocus />
						)}

						{screen.captchaOn ? (
							<div>
								<div ref={screen.mountCaptcha} />
								{screen.captchaError ? <p className="mt-1 text-theme-xs text-error-600">{screen.captchaError}</p> : null}
							</div>
						) : null}

						<button
							type="submit"
							disabled={onLogin ? !screen.canSubmit : !screen.canRecover}
							className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{screen.busy ? <Icon name="progress_activity" className="animate-spin text-theme-md" /> : null}
							{onLogin ? __('Sign in') : __('Send the link')}
						</button>
					</form>

					<button
						type="button"
						onClick={onLogin ? screen.showRecovery : screen.showLogin}
						className="mt-4 w-full text-center text-theme-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
					>
						{onLogin ? __('I forgot my password') : __('Back to signing in')}
					</button>
				</div>
			</main>
		</div>
	);
};
