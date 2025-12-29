import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, User, Globe, ArrowLeft, Check } from 'lucide-react-native';

// --- Constants & Translations ---

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];

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

export default function AuthPage({ navigation }: any) {
  const [currentPage, setCurrentPage] = useState<'login' | 'signup' | 'forgot'>('login');
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const t = translations[language];
  const { login, register, loginWithGoogle } = useAuth();

  // --- Shared State & Handlers ---
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Login/Signup Form Data
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3 | 4>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeInputRefs = useRef<Array<TextInput | null>>([]);

  // --- Effects ---
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // --- Helper Functions ---
  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Min 8 chars');
    if (!/[A-Z]/.test(password)) errors.push('uppercase');
    if (!/[a-z]/.test(password)) errors.push('lowercase');
    if (!/[0-9]/.test(password)) errors.push('number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('special char');
    return { isValid: errors.length === 0, errors };
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const switchPage = (page: 'login' | 'signup' | 'forgot') => {
    setCurrentPage(page);
    setErrors({});
    // Reset forms
    setFormData({ email: '', firstName: '', lastName: '', password: '', agreeToTerms: false });
    setForgotStep(1);
    setResetEmail('');
    setResetCode(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
  };

  // --- Auth Handlers ---

  const handleLogin = async () => {
    setIsLoading(true);
    setErrors({});
    
    // Basic validation
    if (!formData.email) { setErrors(prev => ({ ...prev, email: t.emailRequired })); setIsLoading(false); return; }
    if (!formData.password) { setErrors(prev => ({ ...prev, password: t.passwordRequired })); setIsLoading(false); return; }

    try {
      await login({ email: formData.email, password: formData.password });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);
    setErrors({});

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = t.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t.invalidEmail;
    
    if (!formData.firstName) newErrors.firstName = t.firstNameRequired;
    if (!formData.lastName) newErrors.lastName = t.lastNameRequired;
    
    if (!formData.password) newErrors.password = t.passwordRequired;
    else {
      const { isValid, errors: passErrors } = validatePassword(formData.password);
      if (!isValid) newErrors.password = passErrors.join(', ');
    }
    
    if (!formData.agreeToTerms) newErrors.agreeToTerms = t.agreeToTerms;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const registerData = {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim()
      };
      await register(registerData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Forgot Password Handlers ---

  const handleForgotEmailSubmit = async () => {
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setErrors({ email: t.invalidEmail });
      return;
    }
    setIsLoading(true);
    try {
      // Simulating API call for now
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      setForgotStep(2);
      setCountdown(600);
    } catch (error: any) {
       setForgotStep(2);
       setCountdown(600);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    const codeString = resetCode.join('');
    if (codeString.length !== 6) {
      setErrors({ code: 'Please enter all 6 digits' });
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setForgotStep(3);
    } catch (error: any) {
      setErrors({ code: error.message || 'Invalid code' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setErrors({ password: t.passwordsDontMatch });
      return;
    }
    const { isValid, errors: passErrors } = validatePassword(newPassword);
    if (!isValid) {
      setErrors({ password: passErrors.join(', ') });
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setForgotStep(4);
    } catch (error: any) {
      setErrors({ password: error.message || 'Failed to reset' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...resetCode];
    newCode[index] = value;
    setResetCode(newCode);
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // --- Render Functions ---

  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalContent}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageOption, language === lang.code && styles.languageOptionSelected]}
              onPress={() => {
                setLanguage(lang.code as 'en' | 'vi');
                setShowLanguageModal(false);
              }}
            >
              <Text style={styles.languageText}>{lang.flag} {lang.name}</Text>
              {language === lang.code && <Check size={20} color="#5DADE2" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Language Selector */}
        <TouchableOpacity 
          style={styles.languageButton} 
          onPress={() => setShowLanguageModal(true)}
        >
          <Globe size={20} color="#fff" />
          <Text style={styles.languageButtonText}>
            {languages.find(l => l.code === language)?.flag} {languages.find(l => l.code === language)?.name}
          </Text>
        </TouchableOpacity>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Header */}
          {currentPage !== 'forgot' ? (
            <>
              <Text style={styles.headerTitle}>
                {currentPage === 'login' ? t.signInTitle : t.createAccount}
              </Text>
              <Text style={styles.headerSubtitle}>
                {currentPage === 'login' ? t.signInSubtitle : t.createAccountSubtitle}
              </Text>
            </>
          ) : null}

          {/* Error Banner */}
          {(errors.submit || errors.code) && (
             <View style={styles.errorBanner}>
               <Text style={styles.errorBannerText}>{errors.submit || errors.code}</Text>
             </View>
          )}

          {/* --- LOGIN FORM --- */}
          {currentPage === 'login' && (
            <View>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder={t.email}
                  placeholderTextColor="#6B7280"
                  value={formData.email}
                  onChangeText={(val) => handleInputChange('email', val)}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <View style={styles.inputContainer}>
                <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder={t.password}
                  placeholderTextColor="#6B7280"
                  value={formData.password}
                  onChangeText={(val) => handleInputChange('password', val)}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIconRight}>
                  {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <TouchableOpacity 
                style={styles.forgotLink}
                onPress={() => switchPage('forgot')}
              >
                <Text style={styles.linkText}>{t.forgotPassword}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t.signIn}</Text>}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t.orSignInWith}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.googleButton}
                onPress={() => loginWithGoogle()}
                disabled={isLoading}
              >
                <Text style={styles.googleButtonText}>{t.logInWithGoogle}</Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t.noAccount} </Text>
                <TouchableOpacity onPress={() => switchPage('signup')}>
                  <Text style={styles.footerLink}>{t.signUp}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- SIGNUP FORM --- */}
          {currentPage === 'signup' && (
            <View>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder={t.email}
                  placeholderTextColor="#6B7280"
                  value={formData.email}
                  onChangeText={(val) => handleInputChange('email', val)}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              {/* Tên được tách ra thành 2 dòng riêng biệt */}
              <View style={styles.inputContainer}>
                 <User size={20} color="#6B7280" style={styles.inputIcon} />
                 <TextInput
                   placeholder={t.firstName}
                   placeholderTextColor="#6B7280"
                   value={formData.firstName}
                   onChangeText={(val) => handleInputChange('firstName', val)}
                   style={styles.input}
                 />
              </View>
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

              <View style={styles.inputContainer}>
                 <User size={20} color="#6B7280" style={styles.inputIcon} />
                 <TextInput
                   placeholder={t.lastName}
                   placeholderTextColor="#6B7280"
                   value={formData.lastName}
                   onChangeText={(val) => handleInputChange('lastName', val)}
                   style={styles.input}
                 />
              </View>
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

              <View style={styles.inputContainer}>
                <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder={t.password}
                  placeholderTextColor="#6B7280"
                  value={formData.password}
                  onChangeText={(val) => handleInputChange('password', val)}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIconRight}>
                  {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              <Text style={styles.hintText}>{t.passwordHint}</Text>

              <TouchableOpacity 
                style={styles.termsContainer}
                onPress={() => handleInputChange('agreeToTerms', !formData.agreeToTerms)}
              >
                <View style={[styles.checkbox, formData.agreeToTerms && styles.checkboxChecked]}>
                  {formData.agreeToTerms && <Check size={14} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  {t.agreeWith} <Text style={styles.linkText}>{t.termsOfUse}</Text> {t.and} <Text style={styles.linkText}>{t.privacyPolicy}</Text>
                </Text>
              </TouchableOpacity>
              {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}

              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t.createAccountBtn}</Text>}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t.alreadyHaveAccount} </Text>
                <TouchableOpacity onPress={() => switchPage('login')}>
                  <Text style={styles.footerLink}>{t.signInLink}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- FORGOT PASSWORD FLOW --- */}
          {currentPage === 'forgot' && (
            <View>
              {/* Step 1: Email */}
              {forgotStep === 1 && (
                <>
                  <View style={styles.iconCircle}>
                    <Lock size={24} color="#374151" />
                  </View>
                  <Text style={styles.headerTitle}>{t.resetPassword}</Text>
                  {/* Fixed JSX closing tag error */}
                  <Text style={styles.headerSubtitle}>{t.resetPasswordSubtitle}</Text>
                  
                  <View style={styles.inputContainer}>
                    <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      placeholder={t.enterEmail}
                      placeholderTextColor="#6B7280"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                  <TouchableOpacity 
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleForgotEmailSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t.sendResetCode}</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.backButton} onPress={() => switchPage('login')}>
                    <Text style={styles.backButtonText}>{t.backToLogin}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Step 2: Code */}
              {forgotStep === 2 && (
                <>
                  <Text style={styles.headerTitle}>{t.enterVerificationCode}</Text>
                  <Text style={styles.headerSubtitle}>{t.verificationSubtitle}</Text>
                  <Text style={styles.emailDisplay}>{resetEmail}</Text>

                  <View style={styles.codeContainer}>
                    {resetCode.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={(ref) => codeInputRefs.current[idx] = ref}
                        style={styles.codeInput}
                        value={digit}
                        onChangeText={(val) => handleCodeChange(idx, val)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                  
                  {countdown > 0 && (
                    <Text style={styles.timerText}>{t.codeExpires} {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</Text>
                  )}

                  <TouchableOpacity 
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleCodeSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t.verifyCode}</Text>}
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <TouchableOpacity onPress={() => setForgotStep(1)}>
                      <Text style={styles.backButtonText}>{t.backToLogin}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleForgotEmailSubmit} disabled={countdown > 0}>
                      <Text style={[styles.backButtonText, countdown > 0 && styles.disabledText]}>{t.resendCode}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Step 3: New Password */}
              {forgotStep === 3 && (
                <>
                  <Text style={styles.headerTitle}>{t.setNewPassword}</Text>
                  <Text style={styles.headerSubtitle}>{t.newPasswordSubtitle}</Text>

                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      placeholder={t.newPassword}
                      placeholderTextColor="#6B7280"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      style={styles.input}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.inputIconRight}>
                      {showNewPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      placeholder={t.confirmPassword}
                      placeholderTextColor="#6B7280"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      style={styles.input}
                      secureTextEntry={!showConfirmPassword}
                    />
                     <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.inputIconRight}>
                      {showConfirmPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                  <Text style={styles.hintText}>{t.passwordHint}</Text>

                  <TouchableOpacity 
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleNewPasswordSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t.resetPasswordBtn}</Text>}
                  </TouchableOpacity>
                </>
              )}

              {/* Step 4: Success */}
              {forgotStep === 4 && (
                <View style={styles.centerContent}>
                  <View style={styles.successIcon}>
                    <Check size={32} color="#10B981" />
                  </View>
                  <Text style={styles.headerTitle}>{t.passwordResetSuccess}</Text>
                  <Text style={styles.headerSubtitle}>{t.passwordResetSuccessSubtitle}</Text>
                  
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => switchPage('login')}
                  >
                    <Text style={styles.primaryButtonText}>{t.returnToLogin}</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          )}

        </View>
      </ScrollView>

      {renderLanguageModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2847', // Deep blue background
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    height: 50,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  inputIconRight: {
    padding: 10,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937', // Dark text color for visibility
    height: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  hintText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  linkText: {
    color: '#5DADE2',
    fontWeight: '500',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#111827', // Dark/Black button
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    marginHorizontal: 12,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#5DADE2',
    borderColor: '#5DADE2',
  },
  termsText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Language Button
  languageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  languageButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  languageOptionSelected: {
    backgroundColor: '#F3F4F6',
  },
  languageText: {
    fontSize: 16,
    color: '#374151',
  },

  // Forgot Password Specific
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  emailDisplay: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  codeInput: {
    width: 44,
    height: 52,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#374151',
  },
  timerText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 16,
  },
  backButton: {
    alignSelf: 'center',
    padding: 8,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    color: '#D1D5DB',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerContent: {
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
  },
});