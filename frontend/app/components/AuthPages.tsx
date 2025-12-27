"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Mail, Lock, Eye, EyeOff, LogIn, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Cloud SVG component for decorative background
const CloudDecoration = () => (
  <>
    {/* Bottom clouds */}
    <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden pointer-events-none">
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.95)" />
          </linearGradient>
        </defs>
        <path fill="url(#cloudGradient)" d="M0,160 C150,100 300,180 450,140 C600,100 750,160 900,130 C1050,100 1200,150 1350,120 L1440,140 L1440,200 L0,200 Z" />
        <path fill="rgba(255,255,255,0.6)" d="M0,180 C200,140 400,200 600,160 C800,120 1000,180 1200,150 C1350,130 1400,160 1440,155 L1440,200 L0,200 Z" />
      </svg>
    </div>
    {/* Top-left cloud */}
    <div className="absolute top-10 left-10 w-32 h-16 bg-white/30 rounded-full blur-xl pointer-events-none" />
    <div className="absolute top-20 left-24 w-24 h-12 bg-white/20 rounded-full blur-lg pointer-events-none" />
    {/* Top-right cloud */}
    <div className="absolute top-16 right-20 w-40 h-20 bg-white/25 rounded-full blur-xl pointer-events-none" />
    <div className="absolute top-28 right-32 w-28 h-14 bg-white/15 rounded-full blur-lg pointer-events-none" />
    {/* Decorative arc/ring */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/20 rounded-full pointer-events-none" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-white/10 rounded-full pointer-events-none" />
  </>
);

// Language options
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];

// Translations
const translations = {
  en: {
    // Login form
    signInTitle: 'Sign in with email',
    signInSubtitle: 'Welcome back! Please enter your details',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    orSignInWith: 'Or sign in with',
    logInWithGoogle: 'Log In with Google',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',

    // Signup form
    createAccount: 'Create an account',
    createAccountSubtitle: 'Start your journey with us today',
    firstName: 'First name',
    lastName: 'Last name',
    passwordHint: 'Min 8 chars: uppercase, lowercase, number, special character',
    agreeWith: 'I agree with',
    termsOfUse: 'Terms of Use',
    and: 'and',
    privacyPolicy: 'Privacy Policy',
    createAccountBtn: 'Create Account',
    creatingAccount: 'Creating account...',
    alreadyHaveAccount: 'Already have an account?',
    signInLink: 'Sign in',

    // Forgot password form
    resetPassword: 'Reset your password',
    resetPasswordSubtitle: "Enter your email and we'll send you a code to reset your password",
    enterEmail: 'Enter your email',
    sendResetCode: 'Send Reset Code',
    sending: 'Sending...',
    backToLogin: 'Back to login',
    codeSent: "We've sent a 6-digit code to your email.",
    returnToLogin: 'Return to login',
    // Verification step
    enterVerificationCode: 'Enter verification code',
    verificationSubtitle: 'Enter the 6-digit code sent to your email',
    verifyCode: 'Verify Code',
    verifying: 'Verifying...',
    resendCode: 'Resend code',
    codeExpires: 'Code expires in',
    // New password step
    setNewPassword: 'Set new password',
    newPasswordSubtitle: 'Create a strong password for your account',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    resetPasswordBtn: 'Reset Password',
    resetting: 'Resetting...',
    passwordsDontMatch: "Passwords don't match",
    passwordResetSuccess: 'Password reset successful!',
    passwordResetSuccessSubtitle: 'You can now log in with your new password.',

    // Errors
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    firstNameRequired: 'First name is required',
    lastNameRequired: 'Last name is required',
    invalidEmail: 'Please enter a valid email address',
    agreeToTerms: 'You must agree to the terms',
  },
  vi: {
    // Login form
    signInTitle: 'Đăng nhập bằng email',
    signInSubtitle: 'Chào mừng trở lại! Vui lòng nhập thông tin của bạn',
    email: 'Email',
    password: 'Mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    signIn: 'Đăng nhập',
    signingIn: 'Đang đăng nhập...',
    orSignInWith: 'Hoặc đăng nhập với',
    logInWithGoogle: 'Đăng nhập với Google',
    noAccount: 'Chưa có tài khoản?',
    signUp: 'Đăng ký',

    // Signup form
    createAccount: 'Tạo tài khoản',
    createAccountSubtitle: 'Bắt đầu hành trình của bạn với chúng tôi',
    firstName: 'Tên',
    lastName: 'Họ',
    passwordHint: 'Tối thiểu 8 ký tự: chữ hoa, chữ thường, số, ký tự đặc biệt',
    agreeWith: 'Tôi đồng ý với',
    termsOfUse: 'Điều khoản sử dụng',
    and: 'và',
    privacyPolicy: 'Chính sách bảo mật',
    createAccountBtn: 'Tạo tài khoản',
    creatingAccount: 'Đang tạo tài khoản...',
    alreadyHaveAccount: 'Đã có tài khoản?',
    signInLink: 'Đăng nhập',

    // Forgot password form
    resetPassword: 'Đặt lại mật khẩu',
    resetPasswordSubtitle: 'Nhập email của bạn và chúng tôi sẽ gửi mã xác nhận',
    enterEmail: 'Nhập email của bạn',
    sendResetCode: 'Gửi mã xác nhận',
    sending: 'Đang gửi...',
    backToLogin: 'Quay lại đăng nhập',
    codeSent: 'Chúng tôi đã gửi mã 6 chữ số đến email của bạn.',
    returnToLogin: 'Quay lại đăng nhập',
    // Verification step
    enterVerificationCode: 'Nhập mã xác nhận',
    verificationSubtitle: 'Nhập mã 6 chữ số đã gửi đến email của bạn',
    verifyCode: 'Xác nhận mã',
    verifying: 'Đang xác nhận...',
    resendCode: 'Gửi lại mã',
    codeExpires: 'Mã hết hạn trong',
    // New password step
    setNewPassword: 'Đặt mật khẩu mới',
    newPasswordSubtitle: 'Tạo mật khẩu mạnh cho tài khoản của bạn',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Xác nhận mật khẩu',
    resetPasswordBtn: 'Đặt lại mật khẩu',
    resetting: 'Đang đặt lại...',
    passwordsDontMatch: 'Mật khẩu không khớp',
    passwordResetSuccess: 'Đặt lại mật khẩu thành công!',
    passwordResetSuccessSubtitle: 'Bạn có thể đăng nhập với mật khẩu mới.',

    // Errors
    emailRequired: 'Email là bắt buộc',
    passwordRequired: 'Mật khẩu là bắt buộc',
    firstNameRequired: 'Tên là bắt buộc',
    lastNameRequired: 'Họ là bắt buộc',
    invalidEmail: 'Vui lòng nhập địa chỉ email hợp lệ',
    agreeToTerms: 'Bạn phải đồng ý với các điều khoản',
  }
};

type TranslationKey = keyof typeof translations.en;

export default function AuthPages() {
  const [currentPage, setCurrentPage] = useState<'login' | 'signup' | 'forgot'>('login');
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguage = languages.find(l => l.code === language) || languages[0];
  const t = translations[language];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4"
      style={{
        background: 'linear-gradient(180deg, #a8d8ea 0%, #c8e6f5 30%, #e8f4fc 60%, #f5fafd 100%)'
      }}>
      {/* Cloud decorations */}
      <CloudDecoration />

      {/* Auth Form */}
      <div className="z-10">
        {currentPage === 'login' && (
          <LoginForm
            onSwitchToSignup={() => setCurrentPage('signup')}
            onSwitchToForgot={() => setCurrentPage('forgot')}
            t={t}
          />
        )}
        {currentPage === 'signup' && (
          <SignupForm onSwitchToLogin={() => setCurrentPage('login')} t={t} />
        )}
        {currentPage === 'forgot' && (
          <ForgotPasswordForm onSwitchToLogin={() => setCurrentPage('login')} t={t} />
        )}
      </div>

      {/* Language Selector */}
      <div className="mt-8 z-10 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white/70 transition-all shadow-sm"
        >
          <Globe className="w-4 h-4" />
          <span>{currentLanguage.flag} {currentLanguage.name}</span>
          <svg className={`w-4 h-4 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isLanguageDropdownOpen && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as 'en' | 'vi');
                  setIsLanguageDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${language === lang.code
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoginForm({ onSwitchToSignup, onSwitchToForgot, t }: { onSwitchToSignup: () => void; onSwitchToForgot: () => void; t: typeof translations.en }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; submit?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrors({});
      await loginWithGoogle();
    } catch (error: any) {
      console.error('Google login error:', error);
      const errorMessage = error?.message || 'Google login failed. Please try again.';

      // Check if it's a network error
      if (errorMessage.includes('Cannot connect to server') || errorMessage.includes('Failed to fetch')) {
        setErrors({
          submit: 'Cannot connect to server. Please check if the backend server is running.'
        });
      } else {
        setErrors({
          submit: errorMessage
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Frontend validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = t.emailRequired;
    if (!password) newErrors.password = t.passwordRequired;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      await login({ email, password });
      // Redirect happens automatically in the auth context
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Login failed. Please check your credentials and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] w-full max-w-md p-8 border border-white/60">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t.signInTitle}</h1>
      <p className="text-center text-gray-500 text-sm mb-6">{t.signInSubtitle}</p>

      {/* Error message */}
      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {errors.submit}
        </div>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
              disabled={isLoading}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
        </div>

        <div className="mb-2">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
        </div>

        <div className="text-right mb-6">
          <button
            type="button"
            onClick={onSwitchToForgot}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            {t.forgotPassword}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all mb-6 flex items-center justify-center shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {t.signingIn}
            </>
          ) : (
            t.signIn
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="text-sm text-gray-400">{t.orSignInWith}</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl py-3 px-4 mb-6 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="font-medium text-gray-700">{t.logInWithGoogle}</span>
        </button>

        <div className="text-center text-sm">
          <span className="text-gray-500">{t.noAccount} </span>
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-gray-800 hover:text-gray-900 font-semibold transition-colors"
          >
            {t.signUp}
          </button>
        </div>
      </form>
    </div>
  );
}

function SignupForm({ onSwitchToLogin, t }: { onSwitchToLogin: () => void; t: typeof translations.en }) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Password validation function
  const validatePassword = (password: string) => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = t.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.invalidEmail;
    }

    if (!formData.firstName) newErrors.firstName = t.firstNameRequired;
    if (!formData.lastName) newErrors.lastName = t.lastNameRequired;

    if (!formData.password) {
      newErrors.password = t.passwordRequired;
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors.join(', ');
      }
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = t.agreeToTerms;
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Frontend validation
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // Prepare data for backend
      const registerData = {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim()
      };

      console.log('Sending registration data:', registerData);

      await register(registerData);
      // Redirect happens automatically in the auth context
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({
        submit: error.message || 'Registration failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] w-full max-w-md p-8 border border-white/60">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t.createAccount}</h1>
      <p className="text-center text-gray-500 text-sm mb-6">{t.createAccountSubtitle}</p>

      {/* Signup Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder={t.email}
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
              disabled={isLoading}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t.firstName}
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
                disabled={isLoading}
              />
            </div>
            {errors.firstName && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.firstName}</p>}
          </div>
          <div>
            <input
              type="text"
              placeholder={t.lastName}
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
              disabled={isLoading}
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.lastName}</p>}
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t.password}
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            {t.passwordHint}
          </p>
        </div>

        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={(e) => handleChange('agreeToTerms', e.target.checked)}
              className="mt-0.5 w-5 h-5 text-gray-900 rounded-md border-gray-300 focus:ring-2 focus:ring-gray-300"
              disabled={isLoading}
            />
            <span className="text-sm text-gray-500">
              {t.agreeWith}{' '}
              <a href="#" className="text-gray-700 font-medium hover:text-gray-900 transition-colors">{t.termsOfUse}</a>
              {' '}{t.and}{' '}
              <a href="#" className="text-gray-700 font-medium hover:text-gray-900 transition-colors">{t.privacyPolicy}</a>
            </span>
          </label>
          {errors.agreeToTerms && <p className="text-red-500 text-xs mt-1.5 ml-8">{errors.agreeToTerms}</p>}
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm text-center">{errors.submit}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all mb-6 flex items-center justify-center shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {t.creatingAccount}
            </>
          ) : (
            t.createAccountBtn
          )}
        </button>

        <div className="text-center text-sm">
          <span className="text-gray-500">{t.alreadyHaveAccount} </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-gray-800 hover:text-gray-900 font-semibold transition-colors"
          >
            {t.signInLink}
          </button>
        </div>
      </form>
    </div>
  );
}

function ForgotPasswordForm({ onSwitchToLogin, t }: { onSwitchToLogin: () => void; t: typeof translations.en }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: email, 2: code, 3: password, 4: success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Password validation
  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Min 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('special character');
    return { isValid: errors.length === 0, errors };
  };

  // Step 1: Submit email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email) {
      setError(t.emailRequired);
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.invalidEmail);
      setIsLoading(false);
      return;
    }

    try {
      const { authService } = await import('../services/auth.service');
      await authService.requestPasswordReset(email);
      setStep(2);
      setCountdown(600); // 10 minutes
    } catch (err: any) {
      // Still move to step 2 for security (don't reveal if email exists)
      setStep(2);
      setCountdown(600);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only last digit
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, 5);
      codeInputRefs.current[focusIndex]?.focus();
    }
  };

  // Step 2: Verify code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const codeString = code.join('');
    if (codeString.length !== 6) {
      setError('Please enter all 6 digits');
      setIsLoading(false);
      return;
    }

    try {
      const { authService } = await import('../services/auth.service');
      await authService.verifyResetCode(email, codeString);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setError('');

    try {
      const { authService } = await import('../services/auth.service');
      await authService.requestPasswordReset(email);
      setCountdown(600);
      setCode(['', '', '', '', '', '']);
    } catch (err: any) {
      // Silently handle for security
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Submit new password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t.passwordsDontMatch);
      setIsLoading(false);
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError(`Password must have: ${validation.errors.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      const { authService } = await import('../services/auth.service');
      await authService.resetPassword(email, code.join(''), newPassword);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] w-full max-w-md p-8 border border-white/60">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
          <Lock className="w-6 h-6 text-gray-700" />
        </div>
      </div>

      {/* Step 1: Email Entry */}
      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t.resetPassword}</h1>
          <p className="text-center text-gray-500 text-sm mb-6">{t.resetPasswordSubtitle}</p>

          <form onSubmit={handleEmailSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder={t.enterEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30 mb-4"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t.sending}
                </>
              ) : (
                t.sendResetCode
              )}
            </button>

            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors"
            >
              {t.backToLogin}
            </button>
          </form>
        </>
      )}

      {/* Step 2: Code Verification */}
      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t.enterVerificationCode}</h1>
          <p className="text-center text-gray-500 text-sm mb-2">{t.verificationSubtitle}</p>
          <p className="text-center text-gray-400 text-xs mb-6">{email}</p>

          <form onSubmit={handleCodeSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* 6-digit code input */}
            <div className="flex justify-center gap-2 mb-4" onPaste={handleCodePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { codeInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700"
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* Countdown timer */}
            {countdown > 0 && (
              <p className="text-center text-gray-500 text-sm mb-4">
                {t.codeExpires} <span className="font-mono font-semibold">{formatTime(countdown)}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || code.join('').length !== 6}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30 mb-4"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t.verifying}
                </>
              ) : (
                t.verifyCode
              )}
            </button>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors"
              >
                {t.backToLogin}
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={countdown > 0 || isLoading}
                className="text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {t.resendCode}
              </button>
            </div>
          </form>
        </>
      )}

      {/* Step 3: New Password */}
      {step === 3 && (
        <>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t.setNewPassword}</h1>
          <p className="text-center text-gray-500 text-sm mb-6">{t.newPasswordSubtitle}</p>

          <form onSubmit={handlePasswordSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.newPassword}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="mb-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t.confirmPassword}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6 ml-1">
              {t.passwordHint}
            </p>

            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t.resetting}
                </>
              ) : (
                t.resetPasswordBtn
              )}
            </button>
          </form>
        </>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t.passwordResetSuccess}</h1>
          <p className="text-center text-gray-500 text-sm mb-6">{t.passwordResetSuccessSubtitle}</p>
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30"
          >
            {t.returnToLogin}
          </button>
        </div>
      )}
    </div>
  );
}