import { useState, useCallback, useRef } from 'react';
import { validateEmail, validateName, validatePhone } from '@/components/checkout/EnhancedFormValidation';

interface ValidationResult {
  isValid: boolean;
  message: string;
}

interface ValidationCache {
  [key: string]: ValidationResult;
}

export const useOptimizedValidation = () => {
  const [validationStates, setValidationStates] = useState<{
    email: ValidationResult;
    name: ValidationResult;
    phone: ValidationResult;
  }>({
    email: { isValid: false, message: '' },
    name: { isValid: false, message: '' },
    phone: { isValid: false, message: '' },
  });

  const validationCache = useRef<ValidationCache>({});
  const validationTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const validateField = useCallback((
    field: 'email' | 'name' | 'phone',
    value: string,
    immediate: boolean = false
  ) => {
    // Check cache first
    const cacheKey = `${field}:${value}`;
    if (validationCache.current[cacheKey]) {
      setValidationStates(prev => ({
        ...prev,
        [field]: validationCache.current[cacheKey]
      }));
      return;
    }

    const runValidation = () => {
      let result: ValidationResult;

      switch (field) {
        case 'email':
          result = {
            isValid: validateEmail(value),
            message: validateEmail(value) ? 'Email válido' : 'Email inválido'
          };
          break;
        case 'name':
          result = {
            isValid: validateName(value),
            message: validateName(value) ? 'Nome válido' : 'Nome deve ter pelo menos 3 caracteres'
          };
          break;
        case 'phone':
          result = {
            isValid: validatePhone(value),
            message: validatePhone(value) ? 'Telefone válido' : 'Telefone inválido'
          };
          break;
        default:
          result = { isValid: false, message: '' };
      }

      // Cache result
      validationCache.current[cacheKey] = result;

      setValidationStates(prev => ({
        ...prev,
        [field]: result
      }));
    };

    if (immediate) {
      runValidation();
    } else {
      // Debounce validation
      if (validationTimers.current[field]) {
        clearTimeout(validationTimers.current[field]);
      }

      validationTimers.current[field] = setTimeout(runValidation, 300);
    }
  }, []);

  const clearValidation = useCallback((field: 'email' | 'name' | 'phone') => {
    if (validationTimers.current[field]) {
      clearTimeout(validationTimers.current[field]);
    }
    setValidationStates(prev => ({
      ...prev,
      [field]: { isValid: false, message: '' }
    }));
  }, []);

  return {
    validationStates,
    validateField,
    clearValidation
  };
};
