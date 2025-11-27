"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../services/types/auth.types';
import { ChevronDown, Check } from 'lucide-react';

// US Flag Component - Clean simple design
const USFlag = ({ className = "w-5 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 7410 3900" xmlns="http://www.w3.org/2000/svg">
    <rect width="7410" height="3900" fill="#b22234"/>
    <path d="M0,450H7410m0,600H0m0,600H7410m0,600H0m0,600H7410m0,600H0" stroke="#fff" strokeWidth="300"/>
    <rect width="2964" height="2100" fill="#3c3b6e"/>
    <g fill="#fff">
      <g id="s18">
        <g id="s9">
          <g id="s5">
            <g id="s4">
              <path id="s" d="M247,90 317.534230,307.082039 132.873218,172.917961H361.126782L176.465770,307.082039z"/>
              <use xlinkHref="#s" y="420"/>
              <use xlinkHref="#s" y="840"/>
              <use xlinkHref="#s" y="1260"/>
            </g>
            <use xlinkHref="#s" y="1680"/>
          </g>
          <use xlinkHref="#s4" x="247" y="210"/>
        </g>
        <use xlinkHref="#s9" x="494"/>
      </g>
      <use xlinkHref="#s18" x="988"/>
      <use xlinkHref="#s9" x="1976"/>
      <use xlinkHref="#s5" x="2470"/>
    </g>
  </svg>
);

// Vietnam Flag Component - Clean simple design
const VietnamFlag = ({ className = "w-5 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="600" fill="#da251d"/>
    <polygon fill="#ffff00" points="450,120 517.634,303.09 711.756,303.09 555.061,417.82 622.695,600.91 450,486.18 277.305,600.91 344.939,417.82 188.244,303.09 382.366,303.09"/>
  </svg>
);

interface LanguageOption {
  code: Language;
  label: string;
  FlagComponent: React.FC<{ className?: string }>;
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'English (US)', FlagComponent: USFlag },
  { code: 'vi', label: 'Tiếng Việt', FlagComponent: VietnamFlag }
];

export default function LanguageSwitcher() {
  const { language, setLanguage, isLoading } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (lang: Language) => {
    if (lang !== language && !isLoading) {
      try {
        await setLanguage(lang);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 
          rounded-lg border border-gray-200 dark:border-gray-600
          bg-white dark:bg-gray-700 
          hover:bg-gray-50 dark:hover:bg-gray-600
          text-gray-700 dark:text-gray-200
          transition-all duration-200
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="rounded overflow-hidden">
          <currentLanguage.FlagComponent className="w-6 h-4" />
        </span>
        <span className="hidden sm:inline text-sm font-medium">
          {currentLanguage.code === 'en' ? 'EN' : 'VI'}
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="
            absolute right-0 mt-2 w-48 z-50
            bg-white dark:bg-gray-800 
            rounded-lg shadow-lg 
            border border-gray-200 dark:border-gray-700
            py-1 overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          "
          role="listbox"
          aria-label="Select language"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={isLoading}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5
                text-left transition-colors
                ${language === lang.code 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
              role="option"
              aria-selected={language === lang.code}
            >
              <span className="rounded overflow-hidden">
                <lang.FlagComponent className="w-6 h-4" />
              </span>
              <span className="flex-1 text-sm font-medium">{lang.label}</span>
              {language === lang.code && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
