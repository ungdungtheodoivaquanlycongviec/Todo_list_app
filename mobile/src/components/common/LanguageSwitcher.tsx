import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Dimensions,
  // Thêm các component cần thiết
  // Import typeof cho TypeScript
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 

// --- START: Giả định Context và Types ---
type Language = 'en' | 'vi';

const useLanguage = () => {
    const [language, setLanguage] = useState<Language>('en');
    const [isLoading, setIsLoading] = useState(false);

    const handleSetLanguage = async (lang: Language) => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500)); 
        setLanguage(lang);
        setIsLoading(false);
    };

    return { 
        language, 
        setLanguage: handleSetLanguage, 
        isLoading 
    };
};
// --- END: Giả định Context và Types ---


// 🚩 Flag Components (Placeholder)
const FlagPlaceholder = ({ code, style }: { code: Language, style?: any }) => {
    const color = code === 'en' ? '#3c3b6e' : '#da251d';
    const text = code === 'en' ? '🇺🇸' : '🇻🇳'; 
    return (
        <View style={[styles.flagContainer, style, { backgroundColor: color }]}>
            <Text style={styles.flagText}>{text}</Text>
        </View>
    );
};

const USFlag = ({ style }: { style?: any }) => <FlagPlaceholder code="en" style={style} />;
const VietnamFlag = ({ style }: { style?: any }) => <FlagPlaceholder code="vi" style={style} />;


interface LanguageOption {
  code: Language;
  label: string;
  FlagComponent: React.FC<{ style?: any }>;
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'English (US)', FlagComponent: USFlag },
  { code: 'vi', label: 'Tiếng Việt', FlagComponent: VietnamFlag }
];

const { width: screenWidth } = Dimensions.get('window');

export default function LanguageSwitcher() {
  const { language, setLanguage, isLoading } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  
  // Sửa lỗi 1: Sử dụng React.ComponentRef<typeof TouchableOpacity>
  const buttonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });


  const currentLanguage = languages.find(l => l.code === language) || languages[0];

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
  
  const onLayout = () => {
    // Sửa lỗi 2: Khai báo kiểu dữ liệu rõ ràng
    buttonRef.current?.measure(
      (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setButtonLayout({ x: pageX, y: pageY, width, height });
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Trigger Button */}
      <TouchableOpacity
        ref={buttonRef}
        onPress={() => {
            setIsOpen(!isOpen);
        }}
        onLayout={onLayout}
        disabled={isLoading}
        style={[
          styles.button,
          isLoading && styles.buttonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Change language"
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={styles.flagWrapper}>
          <currentLanguage.FlagComponent style={styles.flag} />
        </View>
        <Text style={styles.buttonText}>
          {currentLanguage.code === 'en' ? 'EN' : 'VI'}
        </Text>
        <Ionicons 
          name="chevron-down-outline" 
          size={16} 
          color="#374151" 
          style={[styles.chevron, isOpen && styles.chevronRotated]} 
        />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {isOpen && (
        <View
            style={[
                styles.dropdownMenu,
                { 
                    top: buttonLayout.y + buttonLayout.height + 8,
                    right: screenWidth - (buttonLayout.x + buttonLayout.width),
                    width: 192, // w-48
                }
            ]}
            accessibilityRole="list"
            aria-label="Select language"
        >
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              disabled={isLoading}
              style={[
                styles.dropdownItem,
                language === lang.code && styles.dropdownItemSelected,
                isLoading && styles.buttonDisabled,
              ]}
              accessibilityRole="menuitem"
              aria-selected={language === lang.code}
            >
              <View style={styles.flagWrapper}>
                <lang.FlagComponent style={styles.flag} />
              </View>
              <Text 
                style={[
                    styles.itemText, 
                    language === lang.code && styles.itemTextSelected
                ]}
              >
                {lang.label}
              </Text>
              {language === lang.code && (
                <Ionicons 
                    name="checkmark" 
                    size={18} 
                    color="#3b82f6" 
                    style={styles.checkIcon} 
                /> 
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        // Có thể thêm style container tổng thể nếu cần
    },
    flagContainer: {
        width: 24,
        height: 16,
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    flagText: {
        fontSize: 10,
        lineHeight: 12,
        color: 'white',
    },
    // --- Trigger Button Styles ---
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb', 
        backgroundColor: 'white', 
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    flagWrapper: {
        borderRadius: 4,
        overflow: 'hidden',
    },
    flag: {
        width: 24, 
        height: 16,
    },
    buttonText: {
        marginHorizontal: 8,
        fontSize: 14,
        fontWeight: '500', 
        color: '#374151', 
    },
    chevron: {
        marginLeft: 4,
        // **Đã loại bỏ lỗi: transition: 'transform 200ms',**
    },
    chevronRotated: {
        transform: [{ rotate: '180deg' }],
    },

    // --- Dropdown Menu Styles ---
    dropdownMenu: {
        position: 'absolute',
        zIndex: 50,
        marginTop: 8,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        width: '100%',
    },
    dropdownItemSelected: {
        backgroundColor: '#eff6ff', 
    },
    itemText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginLeft: 12,
    },
    itemTextSelected: {
        color: '#1d4ed8',
    },
    checkIcon: {
        marginLeft: 'auto',
    }
});