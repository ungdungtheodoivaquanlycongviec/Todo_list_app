import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ navigation }: any) {
  const [currentPage, setCurrentPage] = useState('login'); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    agreeToTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { login, register, loginWithGoogle } = useAuth();

  const handleChange = (field: string, value: string) => {
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

  const validateLoginForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const validateSignupForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors.join(', ');
      }
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms';
    }

    return newErrors;
  };

  const handleLogin = async () => {
    setIsLoading(true);
    
    // Frontend validation
    const newErrors = validateLoginForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      await login({ email: formData.email, password: formData.password });
      // Navigation happens automatically in the auth context
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);
    
    // Frontend validation
    const newErrors = validateSignupForm();
    
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
      // Navigation happens automatically in the auth context
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Login Failed', error.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    // TODO: Implement password reset navigation
    Alert.alert('Password Reset', 'Navigate to password reset screen');
  };

  const toggleAgreeToTerms = () => {
    setFormData(prev => ({ ...prev, agreeToTerms: !prev.agreeToTerms }));
    if (errors.agreeToTerms) {
      setErrors(prev => ({ ...prev, agreeToTerms: '' }));
    }
  };

  const switchPage = () => {
    setCurrentPage(currentPage === 'login' ? 'signup' : 'login');
    setErrors({});
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      agreeToTerms: false
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>
        {currentPage === 'login' ? 'Log In' : 'Sign Up'}
      </Text>

      {/* Google Login Button */}
      <TouchableOpacity 
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={isLoading}
      >
        <View style={styles.googleButtonContent}>
          <Text style={styles.googleButtonText}>Log In with Google</Text>
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or {currentPage === 'login' ? 'Log in' : 'Sign up'} with Email</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Form */}
      {currentPage === 'login' ? (
        <View style={styles.form}>
          <TextInput
            placeholder="Email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            style={[styles.input, errors.email && styles.inputError]}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TextInput
            placeholder="Password"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            style={[styles.input, errors.password && styles.inputError]}
            secureTextEntry
            editable={!isLoading}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={handleResetPassword}>
              <Text style={styles.linkText}>Forgot password? Reset</Text>
            </TouchableOpacity>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <TouchableOpacity onPress={switchPage}>
                <Text style={styles.linkText}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.switchHeader}>
            <Text style={styles.switchHeaderText}>Already have an account?</Text>
            <TouchableOpacity 
              style={styles.switchHeaderButton}
              onPress={switchPage}
            >
              <Text style={styles.switchHeaderButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            style={[styles.input, errors.email && styles.inputError]}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TextInput
            placeholder="First name"
            value={formData.firstName}
            onChangeText={(value) => handleChange('firstName', value)}
            style={[styles.input, errors.firstName && styles.inputError]}
            editable={!isLoading}
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

          <TextInput
            placeholder="Last name"
            value={formData.lastName}
            onChangeText={(value) => handleChange('lastName', value)}
            style={[styles.input, errors.lastName && styles.inputError]}
            editable={!isLoading}
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

          <TextInput
            placeholder="Enter a strong password"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            style={[styles.input, errors.password && styles.inputError]}
            secureTextEntry
            editable={!isLoading}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          
          <Text style={styles.passwordHint}>
            Password must contain at least 8 characters, including uppercase, lowercase, number, and special character
          </Text>

          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={toggleAgreeToTerms}
            disabled={isLoading}
          >
            <View style={[styles.checkbox, formData.agreeToTerms && styles.checkboxChecked]}>
              {formData.agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree with <Text style={styles.termsLink}>Terms of Use</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Sign up for free</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2847',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 30,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginHorizontal: 10,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  switchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchHeaderText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchHeaderButton: {
    backgroundColor: '#1a2847',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchHeaderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
  },
  passwordHint: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5DADE2',
    borderColor: '#5DADE2',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    color: '#5DADE2',
  },
  submitButton: {
    backgroundColor: '#5DADE2',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLinks: {
    alignItems: 'center',
  },
  linkText: {
    color: '#5DADE2',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
  },
});