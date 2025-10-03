"use client"

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPages() {
  const [currentPage, setCurrentPage] = useState('login'); // 'login' or 'signup'

  return (
    <div className="min-h-screen bg-[#1a2847] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {/* Your logo here */}
        </div>
      </div>

      {/* Auth Form */}
      {currentPage === 'login' ? (
        <LoginForm onSwitchToSignup={() => setCurrentPage('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setCurrentPage('login')} />
      )}

      {/* Language Selector */}
      <div className="mt-8">
        <button className="flex items-center gap-2 text-white/70 hover:text-white px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-colors">
          <Globe className="w-4 h-4" />
          <span>English</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; submit?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth login
    console.log('Google OAuth login - to be implemented');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Frontend validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    
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

  const handleReset = () => {
    // TODO: Implement password reset
    console.log('Navigate to password reset page');
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Log In</h1>

      {/* Google Login Button */}
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg py-3 px-4 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="font-medium text-gray-700">Log In with Google</span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="text-sm text-gray-500">or Log in with Email</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div className="mb-6">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{errors.submit}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#5DADE2] hover:bg-[#4FA3D8] disabled:bg-gray-400 text-white font-medium py-3 rounded-full transition-colors mb-4 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Logging in...
            </>
          ) : (
            'Log in'
          )}
        </button>

        <div className="text-center text-sm">
          <span className="text-gray-600">Forgot password? </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[#5DADE2] hover:underline font-medium"
          >
            Reset
          </button>
        </div>

        <div className="text-center text-sm mt-4">
          <span className="text-gray-600">Don't have an account? </span>
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[#5DADE2] hover:underline font-medium"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}

function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    agreeToTerms: false
  });
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
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Already have an account?</span>
          <button
            onClick={onSwitchToLogin}
            className="text-white bg-[#1a2847] hover:bg-[#243152] px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Log In
          </button>
        </div>
      </div>

      {/* Signup Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>

        <div className="mb-4">
          <input
            type="password"
            placeholder="Enter a strong password (min 8 chars with uppercase, lowercase, number, special character)"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Password must contain at least 8 characters, including uppercase, lowercase, number, and special character
          </p>
        </div>

        <div className="mb-6">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={(e) => handleChange('agreeToTerms', e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <span className="text-sm text-gray-600">
              I agree with{' '}
              <a href="#" className="text-[#5DADE2] hover:underline">Terms of Use</a>
              {' '}and{' '}
              <a href="#" className="text-[#5DADE2] hover:underline">Privacy Policy</a>
            </span>
          </label>
          {errors.agreeToTerms && <p className="text-red-500 text-xs mt-1">{errors.agreeToTerms}</p>}
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{errors.submit}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#5DADE2] hover:bg-[#4FA3D8] disabled:bg-gray-400 text-white font-medium py-3 rounded-full transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Creating account...
            </>
          ) : (
            'Sign up for free'
          )}
        </button>
      </form>
    </div>
  );
}