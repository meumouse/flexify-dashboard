import { useCallback, useEffect, useRef, useState } from 'react';
import { __ } from '@/react/lib/i18n';

/**
 * The login screen's behaviour, apart from how it looks.
 *
 * It talks to admin-ajax rather than the REST API, because the person using it is not signed
 * in yet and there is no nonce of theirs to send.
 */

export type LoginConfig = {
	ajaxUrl?: string;
	restUrl?: string;
	loginAjaxAction?: string;
	lostPasswordAjaxAction?: string;
	loginNonce?: string;
	lostPasswordNonce?: string;
	redirectTo?: string;
	adminUrl?: string;
	siteInfoUrl?: string;
	siteName?: string;
	siteDescription?: string;
	logoUrl?: string;
	authLogoUrl?: string;
	asideLogoUrl?: string;
	siteLogoUrl?: string;
	asideColor?: string;
	asideGradientStart?: string;
	asideGradientEnd?: string;
	asideGlowColor?: string;
	recaptchaEnabled?: boolean;
	recaptchaSiteKey?: string;
	notice?: { type: string; message: string } | null;
};

export type SiteInfo = {
	siteName: string;
	siteDescription: string;
	logoUrl: string;
	siteLogoUrl: string;
	asideColor: string;
	asideGradientStart: string;
	asideGradientEnd: string;
	asideGlowColor: string;
};

type Grecaptcha = {
	render: (element: HTMLElement, options: Record<string, unknown>) => number;
	reset: (id: number) => void;
};

const grecaptcha = (): Grecaptcha | undefined => (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;

export const siteInfoFrom = (payload: Partial<SiteInfo>, config: LoginConfig): SiteInfo => ({
	siteName: payload.siteName || config.siteName || '',
	siteDescription: payload.siteDescription || config.siteDescription || '',
	logoUrl: payload.logoUrl || config.asideLogoUrl || config.authLogoUrl || config.logoUrl || '',
	siteLogoUrl: payload.siteLogoUrl || config.siteLogoUrl || '',
	asideColor: payload.asideColor || config.asideColor || '#008aff',
	asideGradientStart: payload.asideGradientStart || config.asideGradientStart || '#0070e0',
	asideGradientEnd: payload.asideGradientEnd || config.asideGradientEnd || '#002f73',
	asideGlowColor: payload.asideGlowColor || config.asideGlowColor || '#1392ff',
});

/** A hex colour as the three numbers a CSS variable wants. */
export const hexToRgb = (hex: string, fallback = '0 138 255'): string => {
	const value = typeof hex === 'string' ? hex.trim().replace('#', '') : '';

	if (!/^[0-9a-fA-F]{6}$/.test(value)) {
		return fallback;
	}

	return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16)).join(' ');
};

/** What the server said went wrong, or a sentence saying that it did not say. */
export const errorFrom = (payload: unknown, fallback: string): string => {
	const body = payload as { data?: { error?: string; message?: string }; message?: string } | null;

	return body?.data?.error || body?.data?.message || body?.message || fallback;
};

export const useLoginScreen = (config: LoginConfig) => {
	const [screen, setScreen] = useState<'login' | 'recovery'>('login');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [remember, setRemember] = useState(false);
	const [recoveryLogin, setRecoveryLogin] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState(config.notice ?? null);
	const [site, setSite] = useState<SiteInfo>(() => siteInfoFrom({}, config));
	const [siteLoading, setSiteLoading] = useState(Boolean(config.siteInfoUrl));
	const [captchaReady, setCaptchaReady] = useState(!config.recaptchaEnabled);
	const [captchaToken, setCaptchaToken] = useState('');
	const [captchaError, setCaptchaError] = useState('');
	const captchaWidget = useRef<number | null>(null);

	const captchaOn = Boolean(config.recaptchaEnabled);

	// The site's own name and colours come from a tiny public endpoint, so the page can be
	// cached as markup and still show what this site looks like.
	useEffect(() => {
		if (!config.siteInfoUrl) {
			return;
		}

		let cancelled = false;

		fetch(config.siteInfoUrl, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
			.then((response) => (response.ok ? response.json() : {}))
			.catch(() => ({}))
			.then((payload) => {
				if (!cancelled) {
					setSite(siteInfoFrom(payload as Partial<SiteInfo>, config));
					setSiteLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [config]);

	const mountCaptcha = useCallback(
		(element: HTMLDivElement | null) => {
			if (!element || !captchaOn || !config.recaptchaSiteKey || captchaWidget.current !== null) {
				return;
			}

			const api = grecaptcha();

			if (!api?.render) {
				setCaptchaReady(false);
				return;
			}

			captchaWidget.current = api.render(element, {
				sitekey: config.recaptchaSiteKey,
				theme: document.body.classList.contains('dark') ? 'dark' : 'light',
				callback: (token: string) => {
					setCaptchaToken(token);
					setCaptchaError('');
					setCaptchaReady(true);
				},
				'expired-callback': () => setCaptchaToken(''),
				'error-callback': () => {
					setCaptchaToken('');
					setCaptchaReady(false);
					setCaptchaError(__('The reCAPTCHA could not be loaded.'));
				},
			});

			setCaptchaReady(true);
		},
		[captchaOn, config.recaptchaSiteKey]
	);

	const resetCaptcha = () => {
		const api = grecaptcha();

		if (api && captchaWidget.current !== null) {
			api.reset(captchaWidget.current);
		}

		setCaptchaToken('');
	};

	const post = async (action: string, fields: Record<string, string>, fallback: string) => {
		const response = await fetch(config.ajaxUrl ?? config.restUrl ?? '', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
			body: new URLSearchParams({ action, ...fields, g_recaptcha_response: captchaToken }),
		});

		const payload = await response.json().catch(() => ({}));

		if (!response.ok || !(payload as { success?: boolean })?.success) {
			throw new Error(errorFrom(payload, fallback));
		}

		return (payload as { data?: Record<string, string> }).data ?? {};
	};

	const canSubmit = !busy && username.trim().length > 0 && password.length > 0 && (!captchaOn || (captchaReady && Boolean(captchaToken)));
	const canRecover = !busy && recoveryLogin.trim().length > 0 && (!captchaOn || (captchaReady && Boolean(captchaToken)));

	const submit = async () => {
		if (!canSubmit) {
			return;
		}

		setError('');
		setBusy(true);

		try {
			const data = await post(
				config.loginAjaxAction ?? 'flexify_dashboard_login',
				{
					username: username.trim(),
					password,
					remember: remember ? '1' : '',
					redirect_to: config.redirectTo ?? '',
					login_nonce: config.loginNonce ?? '',
				},
				__('We could not sign you in. Check your details and try again.')
			);

			window.location.assign(data.redirect_to || config.adminUrl || '/wp-admin/');
		} catch (failure) {
			setError((failure as Error).message);
			resetCaptcha();
		} finally {
			setBusy(false);
		}
	};

	const submitRecovery = async () => {
		if (!canRecover) {
			return;
		}

		setError('');
		setBusy(true);

		try {
			const data = await post(
				config.lostPasswordAjaxAction ?? 'flexify_dashboard_lostpassword',
				{ user_login: recoveryLogin.trim(), lostpassword_nonce: config.lostPasswordNonce ?? '' },
				__('We could not start the password reset. Try again.')
			);

			setNotice({ type: 'success', message: data.message || __('Check your email to carry on resetting your password.') });
			resetCaptcha();
			setScreen('login');
		} catch (failure) {
			setError((failure as Error).message);
			resetCaptcha();
		} finally {
			setBusy(false);
		}
	};

	return {
		screen,
		username,
		password,
		remember,
		recoveryLogin,
		showPassword,
		busy,
		error,
		notice,
		site,
		siteLoading,
		captchaOn,
		captchaError,
		canSubmit,
		canRecover,
		setUsername,
		setPassword,
		setRemember,
		setRecoveryLogin,
		setShowPassword,
		setNotice,
		mountCaptcha,
		showLogin: () => {
			setError('');
			setScreen('login');
		},
		showRecovery: () => {
			setError('');
			setRecoveryLogin(username.trim() || recoveryLogin);
			setScreen('recovery');
		},
		submit,
		submitRecovery,
	};
};
