import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useMarket } from '../../i18n/useMarket';

type Mode = 'login' | 'register' | 'forgot';

export default function LoginScreen() {
  const { isEN } = useMarket();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean; showResend?: boolean } | null>(null);

  const msg = (text: string, ok = false, showResend = false) =>
    setMessage({ text, ok, showResend });

  // ── Translations ───────────────────────────────────────────────
  const T = {
    titleLogin:    isEN ? 'Sign in'             : 'Iniciar sesión',
    titleRegister: isEN ? 'Create account'      : 'Crear cuenta',
    titleForgot:   isEN ? 'Reset password'      : 'Recuperar contraseña',
    google:        isEN ? 'Continue with Google': 'Continuar con Google',
    orEmail:       isEN ? 'or with email'       : 'o con correo',
    emailLabel:    isEN ? 'Email'               : 'Correo electrónico',
    emailPlaceholder: isEN ? 'you@email.com'    : 'tu@correo.com',
    passwordLabel: isEN ? 'Password'            : 'Contraseña',
    submitLogin:   isEN ? 'Sign in'             : 'Iniciar sesión',
    submitRegister:isEN ? 'Create account'      : 'Crear cuenta',
    submitForgot:  isEN ? 'Send reset link'     : 'Enviar enlace de recuperación',
    tcNotice: isEN
      ? <>By creating an account you accept the{' '}<a href="/terminos.html" target="_blank" rel="noopener" style={{ color: '#0d9488' }}>Terms & Conditions</a>{' '}and the{' '}<a href="/privacidad.html" target="_blank" rel="noopener" style={{ color: '#0d9488' }}>Privacy Policy</a>.</>
      : <>Al crear una cuenta aceptas los{' '}<a href="/terminos.html" target="_blank" rel="noopener" style={{ color: '#0d9488' }}>Términos y Condiciones</a>{' '}y la{' '}<a href="/privacidad.html" target="_blank" rel="noopener" style={{ color: '#0d9488' }}>Política de Privacidad</a>.</>,
    forgotLink:    isEN ? 'Forgot your password?'          : '¿Olvidaste tu contraseña?',
    createLink:    isEN ? 'Create account'                 : 'Crear cuenta',
    backLogin:     isEN ? '← Back to sign in'             : '← Volver al inicio de sesión',
    alreadyHave:   isEN ? 'Already have an account? Sign in' : '¿Ya tienes cuenta? Inicia sesión',
    resendBtn:     isEN ? 'Resend confirmation email →'    : 'Reenviar correo de confirmación →',
    // Feedback messages
    msgBadCreds:   isEN ? 'Email or password is incorrect.'
                        : 'Correo o contraseña incorrectos.',
    msgConfirmNeeded: isEN
      ? 'You need to confirm your email before signing in. Check your inbox (and spam folder).'
      : 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam).',
    msgAccountCreated: isEN
      ? 'Account created! We sent you a confirmation email. Click the link to activate it (check spam too).'
      : '¡Cuenta creada! Te enviamos un correo de confirmación. Haz clic en el enlace para activarla (revisa también el spam).',
    msgPasswordSent: isEN
      ? 'We sent you a password reset email. Check your spam folder too.'
      : 'Te enviamos un correo para restablecer tu contraseña. Revisa también la carpeta de spam.',
    msgResent: isEN
      ? 'Confirmation email resent. Check your inbox and spam folder.'
      : 'Correo de confirmación reenviado. Revisa tu bandeja de entrada y la carpeta de spam.',
    msgNoEmail: isEN
      ? 'Enter your email to resend the confirmation.'
      : 'Introduce tu correo para reenviar la confirmación.',
    msgSessionExpired: isEN
      ? 'Session expired. Please reload the page.'
      : 'Sesión expirada. Por favor recarga la página.',
    terms:    isEN ? 'Terms'   : 'Términos',
    privacy:  isEN ? 'Privacy' : 'Privacidad',
  };

  const titles = {
    login:    T.titleLogin,
    register: T.titleRegister,
    forgot:   T.titleForgot,
  };

  const submitLabel = {
    login:    T.submitLogin,
    register: T.submitRegister,
    forgot:   T.submitForgot,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message === 'Invalid login credentials') {
            msg(T.msgBadCreds);
          } else if (
            error.message.toLowerCase().includes('email not confirmed') ||
            error.message.toLowerCase().includes('email_not_confirmed')
          ) {
            msg(T.msgConfirmNeeded, false, true);
          } else {
            msg(error.message);
          }
        }
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          msg(error.message);
        } else if (data.session) {
          // Auto-confirm is enabled in Supabase — user is immediately logged in
          // The onAuthStateChange in App.tsx will pick up the session automatically
        } else {
          // Email confirmation required
          msg(T.msgAccountCreated, true);
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/app`,
        });
        if (error) msg(error.message);
        else msg(T.msgPasswordSent, true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (!email) { msg(T.msgNoEmail); return; }
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (error) msg(error.message);
    else msg(T.msgResent, true);
  }

  async function handleGoogle() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) { msg(error.message); setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 100%)',
      padding: '24px',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <img src="/midespensaLogo_134e4a.png" alt="MiDespensa" style={{ height: '72px', width: 'auto' }} />
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.5rem', color: '#0f766e', letterSpacing: '-0.03em' }}>
            midespensa
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px' }}>
            {titles[mode]}
          </div>
        </div>

        {/* Google button */}
        {mode !== 'forgot' && (
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              border: '1.5px solid #e5e7eb', borderRadius: '10px', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '20px', transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseOut={e => (e.currentTarget.style.background = '#fff')}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.2c-.6 3-2.3 5.6-4.9 7.3v6h7.9c4.6-4.2 7.3-10.5 7.3-17.4z"/>
              <path fill="#34A853" d="M24 48c6.6 0 12.2-2.2 16.2-5.9l-7.9-6c-2.2 1.5-5 2.3-8.3 2.3-6.4 0-11.8-4.3-13.7-10.1H2.1v6.2C6.1 42.7 14.4 48 24 48z"/>
              <path fill="#FBBC05" d="M10.3 28.3A14.8 14.8 0 0 1 9.5 24c0-1.5.3-2.9.8-4.3v-6.2H2.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.1 10.5l8.2-6.2z"/>
              <path fill="#EA4335" d="M24 9.5c3.6 0 6.8 1.2 9.3 3.7l7-7C36.2 2.1 30.6 0 24 0 14.4 0 6.1 5.3 2.1 13.5l8.2 6.2C12.2 13.8 17.6 9.5 24 9.5z"/>
            </svg>
            {T.google}
          </button>
        )}

        {/* Divider */}
        {mode !== 'forgot' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{T.orEmail}</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            {T.emailLabel}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" placeholder={T.emailPlaceholder} style={inputStyle} />
          </label>

          {mode !== 'forgot' && (
            <label style={labelStyle}>
              {T.passwordLabel}
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="••••••••" minLength={6} style={inputStyle} />
            </label>
          )}

          {/* T&C notice on register */}
          {mode === 'register' && (
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '14px', lineHeight: 1.5 }}>
              {T.tcNotice}
            </p>
          )}

          {/* Message */}
          {message && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px',
              background: message.ok ? '#f0fdf4' : '#fef2f2',
              color: message.ok ? '#0f766e' : '#dc2626',
              border: `1px solid ${message.ok ? '#99f6e4' : '#fecaca'}`,
            }}>
              {message.text}
              {message.showResend && (
                <div style={{ marginTop: '8px' }}>
                  <button type="button" onClick={handleResendConfirmation} disabled={loading}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700,
                      cursor: 'pointer', fontSize: '0.85rem', padding: 0, textDecoration: 'underline' }}>
                    {T.resendBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px',
            background: loading ? '#5eead4' : '#0d9488', color: '#fff',
            border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
          }}>
            {loading ? '…' : submitLabel[mode]}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
          {mode === 'login' && (
            <>
              <button style={linkBtn} onClick={() => { setMode('forgot'); setMessage(null); }}>
                {T.forgotLink}
              </button>
              <span style={{ margin: '0 8px' }}>·</span>
              <button style={linkBtn} onClick={() => { setMode('register'); setMessage(null); }}>
                {T.createLink}
              </button>
            </>
          )}
          {mode === 'register' && (
            <button style={linkBtn} onClick={() => { setMode('login'); setMessage(null); }}>
              {T.alreadyHave}
            </button>
          )}
          {mode === 'forgot' && (
            <button style={linkBtn} onClick={() => { setMode('login'); setMessage(null); }}>
              {T.backLogin}
            </button>
          )}
        </div>

        {/* Legal links */}
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.72rem', color: '#9ca3af' }}>
          <a href="/terminos.html" target="_blank" rel="noopener" style={{ color: '#9ca3af' }}>{T.terms}</a>
          {' · '}
          <a href="/privacidad.html" target="_blank" rel="noopener" style={{ color: '#9ca3af' }}>{T.privacy}</a>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '16px',
};
const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: '6px', padding: '10px 12px',
  border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem',
  outline: 'none', boxSizing: 'border-box', color: '#111827', background: '#f9fafb',
};
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#0d9488', fontWeight: 600,
  cursor: 'pointer', fontSize: '0.85rem', padding: 0,
};
