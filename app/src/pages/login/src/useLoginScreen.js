import { computed, nextTick, onMounted, ref, watch } from 'vue';

export const useLoginScreen = (config = {}) => {
  const screen = ref('login');
  const username = ref('');
  const password = ref('');
  const remember = ref(false);
  const recoveryLogin = ref('');
  const showPassword = ref(false);
  const loading = ref(false);
  const recoveryLoading = ref(false);
  const errorMessage = ref('');
  const notice = ref(config.notice || null);
  const recaptchaContainer = ref(null);
  const recaptchaWidgetId = ref(null);
  const recaptchaReady = ref(!config.recaptchaEnabled);
  const recaptchaToken = ref('');
  const recaptchaError = ref('');
  const siteInfo = ref({
    siteName: config.siteName || '',
    siteDescription: config.siteDescription || '',
    logoUrl: config.asideLogoUrl || config.authLogoUrl || config.logoUrl || '',
    siteLogoUrl: config.siteLogoUrl || '',
    asideColor: config.asideColor || '#008aff',
    asideGradientStart: config.asideGradientStart || '#0070e0',
    asideGradientEnd: config.asideGradientEnd || '#002f73',
    asideGlowColor: config.asideGlowColor || '#1392ff',
  });
  const siteInfoLoading = ref(true);

  const recaptchaEnabled = Boolean(config.recaptchaEnabled);

  const normalizeSiteInfo = (payload = {}) => ({
    siteName: payload.siteName || config.siteName || '',
    siteDescription: payload.siteDescription || config.siteDescription || '',
    logoUrl:
      payload.logoUrl || config.asideLogoUrl || config.authLogoUrl || config.logoUrl || '',
    siteLogoUrl: payload.siteLogoUrl || config.siteLogoUrl || '',
    asideColor: payload.asideColor || config.asideColor || '#008aff',
    asideGradientStart: payload.asideGradientStart || config.asideGradientStart || '#0070e0',
    asideGradientEnd: payload.asideGradientEnd || config.asideGradientEnd || '#002f73',
    asideGlowColor: payload.asideGlowColor || config.asideGlowColor || '#1392ff',
  });

  const loadSiteInfo = async () => {
    if (!config.siteInfoUrl) {
      siteInfo.value = normalizeSiteInfo();
      siteInfoLoading.value = false;
      return;
    }

    try {
      const response = await fetch(config.siteInfoUrl, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load site info.');
      }

      const payload = await response.json().catch(() => ({}));
      const normalizedPayload = normalizeSiteInfo(payload);

      siteInfo.value = normalizedPayload;
    } catch (error) {
      siteInfo.value = normalizeSiteInfo();
    } finally {
      siteInfoLoading.value = false;
    }
  };

  const initialLetter = computed(() => {
    const siteName = siteInfo.value.siteName || 'A';
    return siteName.charAt(0).toUpperCase();
  });

  const loginActionUrl = computed(() => {
    return config.loginActionUrl || config.loginUrl || window.location.href;
  });

  const isLoginScreen = computed(() => screen.value === 'login');
  const isRecoveryScreen = computed(() => screen.value === 'recovery');

  const submitDisabled = computed(() => {
    if (!isLoginScreen.value) {
      return false;
    }

    if (loading.value) {
      return true;
    }

    if (!username.value.trim() || !password.value) {
      return true;
    }

    if (recaptchaEnabled && (!recaptchaReady.value || !recaptchaToken.value)) {
      return true;
    }

    return false;
  });

  const recoverySubmitDisabled = computed(() => {
    if (recoveryLoading.value || !recoveryLogin.value.trim()) {
      return true;
    }

    if (recaptchaEnabled && (!recaptchaReady.value || !recaptchaToken.value)) {
      return true;
    }

    return false;
  });

  const setRecaptchaContainer = (element) => {
    recaptchaContainer.value = element;

    if (element && recaptchaEnabled && window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      if (recaptchaWidgetId.value === null) {
        renderRecaptcha();
      }
    }
  };

  const recaptchaTheme = () => {
    return document.body.classList.contains('dark') ? 'dark' : 'light';
  };

  const renderRecaptcha = () => {
    if (!recaptchaEnabled || !config.recaptchaSiteKey || !recaptchaContainer.value) {
      recaptchaReady.value = true;
      return;
    }

    if (!window.grecaptcha || typeof window.grecaptcha.render !== 'function') {
      recaptchaReady.value = false;
      recaptchaError.value = 'Nao foi possivel carregar o Google reCAPTCHA.';
      return;
    }

    if (recaptchaWidgetId.value !== null) {
      return;
    }

    recaptchaWidgetId.value = window.grecaptcha.render(recaptchaContainer.value, {
      sitekey: config.recaptchaSiteKey,
      theme: recaptchaTheme(),
      callback: (token) => {
        recaptchaToken.value = token;
        recaptchaError.value = '';
        recaptchaReady.value = true;
      },
      'expired-callback': () => {
        recaptchaToken.value = '';
      },
      'error-callback': () => {
        recaptchaToken.value = '';
        recaptchaReady.value = false;
        recaptchaError.value = 'O Google reCAPTCHA falhou ao carregar.';
      },
    });

    recaptchaReady.value = true;
  };

  const waitForRecaptcha = async () => {
    if (!recaptchaEnabled) {
      return;
    }

    let attempts = 0;

    while (attempts < 80) {
      if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
        renderRecaptcha();
        return;
      }

      attempts += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    recaptchaError.value = 'O Google reCAPTCHA nao respondeu a tempo.';
    recaptchaReady.value = false;
  };

  const resetRecaptcha = () => {
    if (window.grecaptcha && recaptchaWidgetId.value !== null) {
      window.grecaptcha.reset(recaptchaWidgetId.value);
    }

    recaptchaToken.value = '';
  };

  const togglePassword = () => {
    showPassword.value = !showPassword.value;
  };

  const showLoginScreen = () => {
    errorMessage.value = '';
    screen.value = 'login';
  };

  const showRecoveryScreen = () => {
    errorMessage.value = '';
    recoveryLogin.value = username.value.trim() || recoveryLogin.value;
    screen.value = 'recovery';
  };

  const submit = async () => {
    if (submitDisabled.value) {
      return;
    }

    errorMessage.value = '';
    loading.value = true;

    try {
      const response = await fetch(config.ajaxUrl || config.restUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams({
          action: config.loginAjaxAction || 'flexify_dashboard_login',
          username: username.value.trim(),
          password: password.value,
          remember: remember.value ? '1' : '',
          redirect_to: config.redirectTo || '',
          login_nonce: config.loginNonce || '',
          g_recaptcha_response: recaptchaToken.value || '',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const responseData = payload?.data || payload;

      if (!response.ok || !payload?.success) {
        errorMessage.value =
          responseData?.error ||
          responseData?.message ||
          payload?.message ||
          'Nao foi possivel autenticar agora. Verifique suas credenciais e tente novamente.';
        resetRecaptcha();
        return;
      }

      window.location.assign(responseData?.redirect_to || config.adminUrl);
    } catch (error) {
      errorMessage.value =
        'Falha de comunicacao com o servidor. Tente novamente em alguns instantes.';
      resetRecaptcha();
    } finally {
      loading.value = false;
    }
  };

  const submitRecovery = async () => {
    if (recoverySubmitDisabled.value) {
      return;
    }

    errorMessage.value = '';
    recoveryLoading.value = true;

    try {
      const response = await fetch(config.ajaxUrl || config.lostPasswordRestUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams({
          action: config.lostPasswordAjaxAction || 'flexify_dashboard_lostpassword',
          user_login: recoveryLogin.value.trim(),
          lostpassword_nonce: config.lostPasswordNonce || '',
          g_recaptcha_response: recaptchaToken.value || '',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const responseData = payload?.data || payload;

      if (!response.ok || !payload?.success) {
        errorMessage.value =
          responseData?.error ||
          responseData?.message ||
          payload?.message ||
          'Nao foi possivel iniciar a recuperacao de senha. Tente novamente.';
        return;
      }

      notice.value = {
        type: 'success',
        message:
          responseData?.message ||
          payload?.message ||
          'Confira seu e-mail para continuar o processo de recuperacao de senha.',
      };
      resetRecaptcha();
      screen.value = 'login';
    } catch (error) {
      errorMessage.value =
        'Falha de comunicacao com o servidor. Tente novamente em alguns instantes.';
      resetRecaptcha();
    } finally {
      recoveryLoading.value = false;
    }
  };

  watch(screen, async () => {
    if (!recaptchaEnabled) {
      return;
    }

    recaptchaReady.value = false;
    recaptchaError.value = '';
    recaptchaWidgetId.value = null;
    recaptchaToken.value = '';

    await nextTick();
    renderRecaptcha();
  });

  onMounted(() => {
    loadSiteInfo();

    if (recaptchaEnabled) {
      waitForRecaptcha();
    }
  });

  return {
    screen,
    username,
    password,
    remember,
    recoveryLogin,
    showPassword,
    loading,
    recoveryLoading,
    errorMessage,
    notice,
    recaptchaError,
    recaptchaEnabled,
    siteInfo,
    siteInfoLoading,
    loginActionUrl,
    initialLetter,
    isLoginScreen,
    isRecoveryScreen,
    submitDisabled,
    recoverySubmitDisabled,
    setRecaptchaContainer,
    togglePassword,
    showLoginScreen,
    showRecoveryScreen,
    submit,
    submitRecovery,
  };
};
