import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { SplashIllustration } from '../illustrations';
import { Button, Input, Card } from '../ui';
import type { UserRole } from '../data';
import { requestRecoveryCode, resetPassword, verifyRecoveryCode } from '../services/recovery';
import { ApiError } from '../api';
import { loginRequest, registerRequest } from '../backend';
import { setToken } from '../session';

function hasSpecialChar(s: string) {
  return /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(s);
}
function hasNumber(s: string) { return /\d/.test(s); }
function hasLetter(s: string) { return /[a-zA-Z]/.test(s); }
function getLoginEmailError(email: string) {
  if (!email.trim()) return 'El correo electrónico es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    return 'Ingresa un correo electrónico válido.';
  }
  return '';
}
function getLoginPasswordError(password: string) {
  if (!password.trim()) return 'La contraseña es obligatoria.';
  if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
  return '';
}

// ─── SPLASH ────────────────────────────────────────────────────────────────────

export function SplashScreen({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] relative overflow-hidden">
      {/* Top decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#F5E6D3] rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute top-10 left-0 w-28 h-28 bg-[#EDD8BC] rounded-full -translate-x-1/2 opacity-50" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-center pt-12 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-[#E8734A] rounded-2xl flex items-center justify-center shadow-[0_4px_16px_rgba(232,115,74,0.4)]">
            <span className="text-white font-black text-xl">✂</span>
          </div>
          <span className="text-2xl font-black text-[#6B4226] font-display">BarberBook</span>
        </div>
      </div>

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-8 py-4">
        <div className="w-full max-w-sm">
          <SplashIllustration />
        </div>
      </div>

      {/* Hero text */}
      <div className="relative z-10 px-8 pb-2">
        <h1 className="text-3xl font-black text-[#6B4226] font-display leading-tight text-center">
          Tu barbería favorita,{' '}
          <span className="text-[#E8734A]">a un toque</span>
        </h1>
        <p className="text-center text-[#A67850] mt-3 leading-relaxed font-medium text-sm">
          Reserva tu cita en segundos. Sin llamadas, sin esperas. Elige tu estilista, elige tu hora.
        </p>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 py-4">
        <span className="w-6 h-2 bg-[#E8734A] rounded-full" />
        <span className="w-2 h-2 bg-[#EDD8BC] rounded-full" />
        <span className="w-2 h-2 bg-[#EDD8BC] rounded-full" />
      </div>

      {/* Bottom wave decoration — behind the CTAs */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#F5E6D3] opacity-30 rounded-t-[60px] z-0" />

      {/* CTAs — above the wave */}
      <div className="relative z-10 px-6 pb-10 flex flex-col gap-3">
        <Button onClick={onRegister} variant="primary" size="lg" fullWidth>
          Crear cuenta gratis
        </Button>
        <Button onClick={onLogin} variant="secondary" size="lg" fullWidth>
          Ya tengo una cuenta
        </Button>
      </div>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────

export function LoginScreen({ onLogin, onRegister, onBack, onForgotPassword }: {
  onLogin: (role: UserRole, name: string) => void;
  onRegister: () => void;
  onBack: () => void;
  onForgotPassword?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const failedAttemptTimes = useRef<number[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockSecondsLeft, setBlockSecondsLeft] = useState(0);

  // Countdown timer while blocked
  useEffect(() => {
    if (!isBlocked) return;
    const interval = setInterval(() => {
      setBlockSecondsLeft(s => {
        if (s <= 1) {
          setIsBlocked(false);
          failedAttemptTimes.current = [];
          setError('');
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isBlocked]);

  const emailFieldError = touched.email ? getLoginEmailError(email) : '';
  const passwordFieldError = touched.password ? getLoginPasswordError(password) : '';

  const registerFailedAttempt = (message: string) => {
    const now = Date.now();
    const recentAttempts = failedAttemptTimes.current.filter(timestamp => now - timestamp < 5 * 60 * 1000);
    recentAttempts.push(now);
    failedAttemptTimes.current = recentAttempts;

    const next = recentAttempts.length;
    if (next >= 5) {
      setIsBlocked(true);
      setBlockSecondsLeft(600);
      setError('Demasiados intentos fallidos. Cuenta temporalmente bloqueada por seguridad.');
    } else {
      setError(`${message} Intento ${next} de 5.`);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBlocked) return;
    setTouched({ email: true, password: true });
    const validationError = getLoginEmailError(email) || getLoginPasswordError(password);
    if (validationError) {
      registerFailedAttempt(validationError);
      return;
    }

    setLoading(true);
    try {
      const session = await loginRequest(email.trim().toLowerCase(), password);
      setToken(session.token);
      setError('');
      failedAttemptTimes.current = [];
      onLogin(session.role, session.fullName);
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        // The backend locks the account after repeated failures (HU-02).
        setIsBlocked(true);
        setBlockSecondsLeft(600);
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 401) {
        registerFailedAttempt(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] overflow-y-auto">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5E6D3] rounded-full -translate-y-1/4 translate-x-1/4 opacity-70" />

      {/* Back + header */}
      <div className="relative z-10 flex items-center gap-4 p-5 pt-10">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_12px_rgba(107,66,38,0.1)] flex items-center justify-center text-[#6B4226] hover:bg-[#F5E6D3] transition-colors"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E8734A] rounded-xl flex items-center justify-center">
            <span className="text-white font-black">✂</span>
          </div>
          <span className="font-black text-[#6B4226] font-display text-lg">BarberBook</span>
        </div>
      </div>

      {/* Top scissors decoration */}
      <div className="relative z-10 flex justify-center py-4">
        <div className="w-20 h-20 bg-white rounded-[20px] shadow-[0_4px_24px_rgba(107,66,38,0.1)] flex items-center justify-center">
          <span className="text-4xl">✂️</span>
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 flex-1 px-6 pb-10">
        <h2 className="text-2xl font-black text-[#6B4226] font-display text-center mb-1">Bienvenido de vuelta</h2>
        <p className="text-center text-[#A67850] text-sm mb-8">Inicia sesión para gestionar tus citas</p>

        <form noValidate onSubmit={handleLogin}>
          <Card className="mb-6">
            <div className="flex flex-col gap-4">
              <Input
                id="login-email"
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={value => { setEmail(value); setError(''); setTouched(t => ({ ...t, email: true })); }}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
                error={emailFieldError}
                icon={<span className="text-base">✉️</span>}
              />
              <Input
                id="login-password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={value => { setPassword(value); setError(''); setTouched(t => ({ ...t, password: true })); }}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                error={passwordFieldError}
                icon={<span className="text-base">🔒</span>}
                rightAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword(visible => !visible)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="text-[#A67850] hover:text-[#6B4226] focus-visible:outline-2 focus-visible:outline-[#E8734A] rounded"
                  >
                    {showPassword ? (
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.3 3.1" />
                        <path d="M6.2 6.2C3.9 7.7 2.7 9.8 2.5 12c.5 1.2 3.9 7 9.5 7 1 0 1.9-.2 2.7-.5" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                }
              />
              {error && (
                <div role="alert" className="bg-[#F8D7DA] border border-[#F0C0BE] rounded-xl p-3">
                  <p className="text-[#C45C4C] text-sm font-medium">⚠️ {error}</p>
                  {isBlocked && blockSecondsLeft > 0 && (
                    <p className="text-[#C45C4C] text-xs mt-1">
                      Podrás intentarlo en {Math.floor(blockSecondsLeft / 60)}:{String(blockSecondsLeft % 60).padStart(2, '0')} min.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading || isBlocked}>
            {loading ? '⏳ Ingresando...' : isBlocked ? '🔒 Bloqueado temporalmente' : 'Iniciar sesión'}
          </Button>
        </form>

        <button
          onClick={onForgotPassword}
          className="w-full text-center mt-4 text-[#A67850] text-sm font-medium hover:text-[#E8734A] transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </button>

        <Button onClick={onRegister} variant="ghost" fullWidth>
          ¿Sin cuenta? <span className="text-[#E8734A] font-bold">Regístrate gratis</span>
        </Button>
      </div>
    </div>
  );
}

// ─── REGISTER ──────────────────────────────────────────────────────────────────

export function RegisterScreen({ onRegister, onLogin, onBack }: {
  onRegister: (role: UserRole, name: string) => void;
  onLogin: () => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio';
    if (!email.includes('@')) {
      e.email = 'Correo electrónico inválido';
    }
    if (phone.length < 9) e.phone = 'Ingresa un número válido (mínimo 9 dígitos)';
    if (password.length < 8) {
      e.password = 'Mínimo 8 caracteres';
    } else if (!hasLetter(password) || !hasNumber(password)) {
      e.password = 'Debe contener letras y números';
    } else if (!hasSpecialChar(password)) {
      e.password = 'Debe incluir al menos un símbolo (ej. @, #, !)';
    }
    return e;
  };

  const handleRegister = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await registerRequest({ fullName: name.trim(), phone: phone.trim(), email: cleanEmail, password });
      // Registration does not start a session by itself: sign in with the same credentials.
      const session = await loginRequest(cleanEmail, password);
      setToken(session.token);
      setShowToast(true);
      setTimeout(() => { setShowToast(false); onRegister(session.role, session.fullName); }, 1500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: 'Este correo ya se encuentra registrado. Intenta iniciar sesión.' });
      } else if (err instanceof ApiError && err.fieldErrors) {
        // The backend names its fields fullName / phone / email / password; the form uses name.
        const mapped: Record<string, string> = {};
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          mapped[field === 'fullName' ? 'name' : field] = message;
        }
        setErrors(mapped);
      } else {
        setErrors({ email: err instanceof Error ? err.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] overflow-y-auto">
      <div className="absolute top-0 left-0 w-48 h-48 bg-[#F5E6D3] rounded-full -translate-y-1/3 -translate-x-1/4 opacity-60" />

      <div className="relative z-10 flex items-center gap-4 p-5 pt-10">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_12px_rgba(107,66,38,0.1)] flex items-center justify-center text-[#6B4226] hover:bg-[#F5E6D3] transition-colors"
        >
          ←
        </button>
        <h2 className="text-xl font-black text-[#6B4226] font-display">Crear cuenta</h2>
      </div>

      {/* Progress indicator */}
      <div className="relative z-10 px-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-[#E8734A] rounded-full" />
          <div className="flex-1 h-1.5 bg-[#E8734A] rounded-full" />
          <div className="flex-1 h-1.5 bg-[#EDD8BC] rounded-full" />
        </div>
        <p className="text-xs text-[#A67850] font-medium">Paso 1 de 2 — Información personal</p>
      </div>

      <div className="relative z-10 flex-1 px-6 pb-10">
        <div className="flex items-center gap-3 my-5">
          <div className="w-14 h-14 bg-white rounded-2xl shadow-[0_4px_20px_rgba(107,66,38,0.1)] flex items-center justify-center text-3xl">
            👤
          </div>
          <div>
            <h3 className="font-black text-[#6B4226] font-display text-lg leading-tight">¡Hola, nuevo cliente!</h3>
            <p className="text-sm text-[#A67850]">Completa tus datos para empezar</p>
          </div>
        </div>

        <Card className="mb-4">
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre completo"
              value={name}
              onChange={setName}
              placeholder="Juan García"
              error={errors.name}
              icon={<span>👤</span>}
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="tu@correo.com"
              error={errors.email}
              icon={<span>✉️</span>}
            />
            <Input
              label="Teléfono"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="+34 600 000 000"
              error={errors.phone}
              icon={<span>📱</span>}
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              error={errors.password}
              hint="Mínimo 8 caracteres, con letras, números y un símbolo"
              icon={<span>🔒</span>}
            />
          </div>
        </Card>

        {/* Terms */}
        <p className="text-xs text-[#A67850] text-center mb-5 leading-relaxed">
          Al registrarte, aceptas nuestros{' '}
          <span className="text-[#E8734A] font-semibold">Términos de uso</span>{' '}
          y{' '}
          <span className="text-[#E8734A] font-semibold">Política de privacidad</span>
        </p>

        <Button onClick={handleRegister} variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? '⏳ Creando cuenta...' : 'Crear mi cuenta ✨'}
        </Button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#EDD8BC]" />
          <span className="text-xs text-[#C8A88A]">o</span>
          <div className="flex-1 h-px bg-[#EDD8BC]" />
        </div>

        <Button onClick={onLogin} variant="ghost" fullWidth>
          ¿Ya tienes cuenta? <span className="text-[#E8734A] font-bold">Inicia sesión</span>
        </Button>
      </div>

      {/* Success toast — HU-01 */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-[#4A7C59] text-white rounded-2xl shadow-2xl flex items-center gap-2.5 font-semibold text-sm whitespace-nowrap">
          <span className="text-lg">✅</span>
          ¡Registro exitoso! Iniciando sesión…
        </div>
      )}
    </div>
  );
}

// ─── ROLE SELECT (Admin) ────────────────────────────────────────────────────────

export function RoleSelectScreen({ onSelect }: { onSelect: (role: UserRole) => void }) {
  const roles = [
    {
      id: 'client' as UserRole,
      title: 'Cliente',
      desc: 'Reserva y gestiona tus citas',
      icon: '👤',
      color: '#E8734A',
      bg: '#FDEBD0',
    },
    {
      id: 'stylist' as UserRole,
      title: 'Estilista',
      desc: 'Gestiona tu agenda y clientes',
      icon: '✂️',
      color: '#F2A950',
      bg: '#FEF5E4',
    },
    {
      id: 'admin' as UserRole,
      title: 'Administrador',
      desc: 'Control total del negocio',
      icon: '🔐',
      color: '#8B9D77',
      bg: '#EAF2E3',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] p-6">
      <div className="flex items-center gap-2 mb-8 pt-6">
        <div className="w-8 h-8 bg-[#E8734A] rounded-xl flex items-center justify-center">
          <span className="text-white font-black">✂</span>
        </div>
        <span className="font-black text-[#6B4226] font-display">BarberBook</span>
        <span className="ml-auto bg-[#E8734A] text-white text-xs px-3 py-1 rounded-full font-bold">Admin</span>
      </div>

      <h2 className="text-2xl font-black text-[#6B4226] font-display mb-1">Gestión de Roles</h2>
      <p className="text-[#A67850] text-sm mb-8">Selecciona un rol para previsualizar la experiencia</p>

      <div className="flex flex-col gap-4">
        {roles.map(role => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className="flex items-center gap-4 p-5 bg-white rounded-[20px] shadow-[0_4px_24px_rgba(107,66,38,0.1)] text-left hover:shadow-[0_8px_32px_rgba(107,66,38,0.18)] active:scale-[0.98] transition-all duration-200 group"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ background: role.bg }}
            >
              {role.icon}
            </div>
            <div className="flex-1">
              <div className="font-black text-[#6B4226] font-display text-lg">{role.title}</div>
              <div className="text-sm text-[#A67850] font-medium">{role.desc}</div>
            </div>
            <span style={{ color: role.color }} className="text-xl font-bold transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 p-4 bg-[#F5E6D3] rounded-2xl border border-[#EDD8BC]">
        <p className="text-xs text-[#8B5E3C] text-center font-medium">
          🔐 Esta pantalla solo es visible para administradores del sistema
        </p>
      </div>
    </div>
  );
}

// ─── FORGOT PASSWORD ───────────────────────────────────────────────────────────

type RecoveryStep = 'email' | 'code' | 'password';
type RecoveryStatus = 'idle' | 'loading' | 'success' | 'error' | 'blocked_attempts' | 'expired';

const RECOVERY_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OTP_LENGTH = 6;
const OTP_LIFETIME_SECONDS = 15 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const PASSWORD_REQUIREMENTS = [
  { label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'Al menos una letra mayúscula y una minúscula', test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: 'Al menos un número', test: (value: string) => /\d/.test(value) },
  { label: 'Al menos un carácter especial (@, $, !, %, *, ?, &)', test: (value: string) => /[@$!%*?&]/.test(value) },
];

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function PasswordVisibilityButton({ visible, onToggle, label }: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
      aria-pressed={visible}
      className="text-[#A67850] hover:text-[#6B4226] focus-visible:outline-2 focus-visible:outline-[#E8734A] rounded"
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {visible ? (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.3 3.1" />
            <path d="M6.2 6.2C3.9 7.7 2.7 9.8 2.5 12c.5 1.2 3.9 7 9.5 7 1 0 1.9-.2 2.7-.5" />
          </>
        ) : (
          <>
            <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [status, setStatus] = useState<RecoveryStatus>('idle');
  const [loadingAction, setLoadingAction] = useState<'request' | 'verify' | 'reset' | null>(null);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [message, setMessage] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(OTP_LIFETIME_SECONDS);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [verifiedCode, setVerifiedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const codeExpiresAt = useRef(0);
  const code = otpDigits.join('');
  const emailError = emailTouched && !RECOVERY_EMAIL_PATTERN.test(email.trim())
    ? (email.trim() ? 'Ingresa un correo electrónico válido.' : 'El correo electrónico es obligatorio.')
    : '';
  const requirements = PASSWORD_REQUIREMENTS.map(requirement => ({
    ...requirement,
    met: requirement.test(newPassword),
  }));
  const passwordsMatch = Boolean(newPassword && newPassword === confirmPassword);
  const attemptsRemaining = 3 - attemptsUsed;
  const isCodeUnavailable = attemptsUsed >= 3 || secondsRemaining <= 0;

  useEffect(() => {
    if (step !== 'code' || isCodeUnavailable || status === 'success' || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(remaining => Math.max(remaining - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, isCodeUnavailable, status, secondsRemaining]);

  useEffect(() => {
    if (step === 'code' && secondsRemaining === 0 && status !== 'blocked_attempts' && status !== 'success' && status !== 'loading') {
      setStatus('expired');
      setMessage('El código ha expirado. Por favor solicita un nuevo código de recuperación.');
    }
  }, [step, secondsRemaining, status]);

  useEffect(() => {
    if (step !== 'code' || resendSeconds <= 0) return;
    const interval = setInterval(() => {
      setResendSeconds(remaining => Math.max(remaining - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendSeconds]);

  useEffect(() => {
    if (status !== 'success') return;
    const timeout = setTimeout(onBack, 2000);
    return () => clearTimeout(timeout);
  }, [status, onBack]);

  const sendRecoveryCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailTouched(true);
    if (!RECOVERY_EMAIL_PATTERN.test(email.trim())) {
      setStatus('error');
      setMessage(email.trim() ? 'Ingresa un correo electrónico válido.' : 'El correo electrónico es obligatorio.');
      return;
    }

    setStatus('loading');
    setLoadingAction('request');
    setMessage('');
    try {
      await requestRecoveryCode(email.trim());
      codeExpiresAt.current = Date.now() + OTP_LIFETIME_SECONDS * 1000;
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setAttemptsUsed(0);
      setSecondsRemaining(OTP_LIFETIME_SECONDS);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setVerifiedCode('');
      setStep('code');
      setStatus('idle');
      setLoadingAction(null);
      setMessage('Revisa tu bandeja de entrada e ingresa el código proporcionado aquí:');
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch {
      setStatus('error');
      setLoadingAction(null);
      setMessage('No fue posible solicitar el código. Intenta nuevamente.');
    }
  };

  const requestNewCode = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setLoadingAction('request');
    setMessage('');
    try {
      await requestRecoveryCode(email.trim());
      codeExpiresAt.current = Date.now() + OTP_LIFETIME_SECONDS * 1000;
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setAttemptsUsed(0);
      setSecondsRemaining(OTP_LIFETIME_SECONDS);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setVerifiedCode('');
      setStatus('idle');
      setLoadingAction(null);
      setMessage('Revisa tu bandeja de entrada e ingresa el código proporcionado aquí:');
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch {
      setStatus('error');
      setLoadingAction(null);
      setMessage('No fue posible solicitar el código. Intenta nuevamente.');
    }
  };

  const updateOtpDigit = (index: number, value: string) => {
    if (isCodeUnavailable || status === 'loading') return;
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setOtpDigits(current => current.map((digit, position) => position === index ? '' : digit));
      return;
    }

    const nextDigits = [...otpDigits];
    if (digits.length > 1) {
      digits.slice(0, OTP_LENGTH).split('').forEach((digit, offset) => {
        nextDigits[offset] = digit;
      });
      setOtpDigits(nextDigits);
      otpRefs.current[Math.min(digits.length, OTP_LENGTH) - 1]?.focus();
      return;
    }

    nextDigits[index] = digits;
    setOtpDigits(nextDigits);
    setMessage('');
    if (status === 'error') setStatus('idle');
    if (index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCodeUnavailable || status === 'loading') return;
    if (code.length !== OTP_LENGTH) {
      setStatus('error');
      setMessage('Ingresa el código de 6 dígitos.');
      return;
    }

    setStatus('loading');
    setLoadingAction('verify');
    setMessage('');
    try {
      const isValid = await verifyRecoveryCode(email.trim(), code);
      if (Date.now() >= codeExpiresAt.current) {
        setSecondsRemaining(0);
        setStatus('expired');
        setLoadingAction(null);
        setMessage('El código ha expirado. Por favor solicita un nuevo código de recuperación.');
      } else if (isValid) {
        setVerifiedCode(code);
        setStep('password');
        setStatus('idle');
        setLoadingAction(null);
      } else {
        const nextAttempts = attemptsUsed + 1;
        setAttemptsUsed(nextAttempts);
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        if (nextAttempts >= 3) {
          setStatus('blocked_attempts');
          setLoadingAction(null);
          setMessage('El código ha sido bloqueado por seguridad tras múltiples intentos fallidos. Por favor solicita uno nuevo.');
        } else {
          setStatus('error');
          setLoadingAction(null);
          setMessage('El código ingresado no es válido. Intenta nuevamente.');
          window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
        }
      }
    } catch {
      setStatus('error');
      setLoadingAction(null);
      setMessage('No fue posible verificar el código. Intenta nuevamente.');
    }
  };

  const resetRecoveryPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'loading' || status === 'success') return;
    if (!requirements.every(requirement => requirement.met) || !passwordsMatch) {
      setStatus('error');
      setMessage('Completa todos los requisitos y confirma que las contraseñas coincidan.');
      return;
    }

    setStatus('loading');
    setLoadingAction('reset');
    setMessage('');
    try {
      await resetPassword(email.trim(), verifiedCode, newPassword);
      setStatus('success');
      setLoadingAction(null);
      setMessage('Contraseña actualizada exitosamente. Por favor, inicia sesión.');
    } catch {
      setStatus('error');
      setLoadingAction(null);
      setMessage('No fue posible cambiar la contraseña. Intenta nuevamente.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] overflow-y-auto">
      <div className="absolute top-0 right-0 w-52 h-52 bg-[#F5E6D3] rounded-full -translate-y-1/3 translate-x-1/4 opacity-60" />

      <div className="relative z-10 flex items-center gap-4 p-5 pt-10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al inicio de sesión"
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_12px_rgba(107,66,38,0.1)] flex items-center justify-center text-[#6B4226] hover:bg-[#F5E6D3] transition-colors"
        >
          ←
        </button>
        <h2 className="text-xl font-black text-[#6B4226] font-display">Recuperar contraseña</h2>
      </div>

      <div className="relative z-10 flex justify-center py-5">
        <div className="w-16 h-16 bg-white rounded-[20px] shadow-[0_4px_24px_rgba(107,66,38,0.1)] flex items-center justify-center text-3xl">
          🔑
        </div>
      </div>

      <div className="relative z-10 flex-1 px-6 pb-10 max-w-xl w-full mx-auto">
        <div className="flex items-center gap-2 mb-6" aria-label={`Paso ${step === 'email' ? 1 : step === 'code' ? 2 : 3} de 3`}>
          {(['email', 'code', 'password'] as RecoveryStep[]).map((item, index) => {
            const currentIndex = step === 'email' ? 0 : step === 'code' ? 1 : 2;
            return (
              <div key={item} className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? 'bg-[#E8734A]' : 'bg-[#EDD8BC]'}`} />
            );
          })}
        </div>

        <h3 className="text-2xl font-black text-[#6B4226] font-display text-center mb-2">
          {step === 'email' ? '¿Olvidaste tu contraseña?' : step === 'code' ? 'Verifica tu correo' : 'Crea una contraseña nueva'}
        </h3>
        <p className="text-center text-[#A67850] text-sm mb-6 leading-relaxed">
          {step === 'email'
            ? 'Ingresa tu correo y te enviaremos un código para recuperar tu acceso.'
            : step === 'code'
              ? 'Ingresa el código de 6 dígitos enviado a tu correo electrónico.'
              : 'Elige una contraseña segura para proteger tu cuenta.'}
        </p>

        {message && (
          <div
            role={status === 'error' || status === 'blocked_attempts' || status === 'expired' ? 'alert' : 'status'}
            aria-live={status === 'error' || status === 'blocked_attempts' || status === 'expired' ? 'assertive' : 'polite'}
            className={`mb-5 rounded-2xl border p-4 text-sm font-medium ${
              status === 'blocked_attempts' || status === 'expired' || status === 'error'
                ? 'bg-[#F8D7DA] border-[#F0C0BE] text-[#C45C4C]'
                : status === 'success'
                  ? 'bg-[#EAF2E3] border-[#A8BB92] text-[#4A7C59]'
                  : 'bg-[#EAF2E3] border-[#A8BB92] text-[#4A7C59]'
            }`}
          >
            {message}
          </div>
        )}

        {step === 'email' && (
          <form noValidate onSubmit={sendRecoveryCode}>
            <Card className="mb-5">
              <Input
                id="recovery-email"
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={value => {
                  setEmail(value);
                  if (status === 'error') { setStatus('idle'); setMessage(''); }
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
                error={emailError}
                icon={<span>✉️</span>}
              />
            </Card>
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={status === 'loading'}>
              {status === 'loading' ? '⏳ Enviando código...' : 'Enviar código'}
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form noValidate onSubmit={verifyCode}>
            <Card className="mb-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <span className="text-sm font-semibold text-[#6B4226]">El código vence en</span>
                <span
                  className={`font-display font-black text-lg ${secondsRemaining <= 60 ? 'text-[#C45C4C]' : 'text-[#6B4226]'}`}
                  aria-label={`Tiempo restante ${formatCountdown(secondsRemaining)}`}
                >
                  {formatCountdown(secondsRemaining)}
                </span>
              </div>
              <div className="flex justify-center gap-2 sm:gap-3" aria-label="Código de verificación de seis dígitos">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={element => { otpRefs.current[index] = element; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Dígito ${index + 1} del código`}
                    value={digit}
                    maxLength={1}
                    disabled={isCodeUnavailable || status === 'loading'}
                    onChange={event => updateOtpDigit(index, event.target.value)}
                    onKeyDown={event => handleOtpKeyDown(index, event)}
                    onPaste={event => {
                      event.preventDefault();
                      updateOtpDigit(index, event.clipboardData.getData('text'));
                    }}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold text-[#6B4226] bg-white border-2 border-[#EDD8BC] rounded-xl outline-none focus:border-[#E8734A] disabled:bg-[#F5E6D3] disabled:text-[#A67850]"
                  />
                ))}
              </div>
              <p className="text-center text-sm text-[#A67850] mt-5" aria-live="polite">
                Intentos restantes: {attemptsRemaining}
              </p>
            </Card>

            {loadingAction === 'request' && status === 'loading' ? (
              <Button type="button" variant="primary" size="lg" fullWidth disabled>
                ⏳ Solicitando...
              </Button>
            ) : isCodeUnavailable ? (
              <Button type="button" onClick={requestNewCode} variant="primary" size="lg" fullWidth disabled={status === 'loading'}>
                {status === 'loading' ? '⏳ Solicitando...' : 'Solicitar nuevo código'}
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary" size="lg" fullWidth disabled={status === 'loading'}>
                  {status === 'loading' ? '⏳ Verificando...' : 'Verificar código'}
                </Button>
                <button
                  type="button"
                  onClick={requestNewCode}
                  disabled={resendSeconds > 0 || status === 'loading'}
                  className="w-full text-center mt-4 text-sm font-medium text-[#A67850] hover:text-[#E8734A] disabled:text-[#C8A88A] disabled:cursor-not-allowed"
                >
                  {resendSeconds > 0 ? `Reenviar código en ${formatCountdown(resendSeconds)}` : 'Reenviar código'}
                </button>
              </>
            )}
          </form>
        )}

        {step === 'password' && (
          <form noValidate onSubmit={resetRecoveryPassword}>
            <Card className="mb-5">
              <div className="flex flex-col gap-4">
                <Input
                  id="recovery-new-password"
                  label="Nueva contraseña"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Ingresa tu nueva contraseña"
                  autoComplete="new-password"
                  required
                  rightAdornment={
                    <PasswordVisibilityButton
                      visible={showNewPassword}
                      onToggle={() => setShowNewPassword(visible => !visible)}
                      label="Nueva contraseña"
                    />
                  }
                />
                <Input
                  id="recovery-confirm-password"
                  label="Confirmar contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirma tu nueva contraseña"
                  autoComplete="new-password"
                  required
                  error={confirmPassword && !passwordsMatch ? 'Las contraseñas no coinciden.' : ''}
                  rightAdornment={
                    <PasswordVisibilityButton
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword(visible => !visible)}
                      label="Confirmar contraseña"
                    />
                  }
                />
              </div>
            </Card>

            <Card className="mb-5">
              <h4 className="text-sm font-bold text-[#6B4226] mb-3">Requisitos de contraseña</h4>
              <ul className="flex flex-col gap-2">
                {[...requirements, { label: 'Las contraseñas coinciden', met: passwordsMatch }].map(requirement => (
                  <li key={requirement.label} className={`flex items-start gap-2 text-xs ${requirement.met ? 'text-[#4A7C59]' : 'text-[#A67850]'}`}>
                    <span aria-hidden="true" className="font-bold">{requirement.met ? '✓' : '○'}</span>
                    <span>{requirement.label}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? '⏳ Actualizando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
