import { Check, X } from "lucide-react";

interface ValidationFeedbackProps {
  isValid: boolean;
  message?: string;
  show: boolean;
}

export const ValidationFeedback = ({ isValid, message, show }: ValidationFeedbackProps) => {
  if (!show) return null;

  return (
    <div className={`flex items-center gap-2 mt-1 text-sm ${
      isValid ? 'text-green-600' : 'text-red-600'
    }`}>
      {isValid ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      )}
      <span>{message}</span>
    </div>
  );
};

export const validateEmail = (email: string): boolean => {
  // Validação rigorosa de email - rejeita números de telefone e formatos inválidos
  // Deve ter: caracteres válidos antes do @, domínio com pelo menos um ponto, TLD válido
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Rejeitar se parece com número de telefone (apenas dígitos e símbolos comuns de telefone)
  const phonePattern = /^[\d\s\-\+\(\)]+$/;
  if (phonePattern.test(email.trim())) {
    return false;
  }
  
  // Deve conter @ e pelo menos um ponto após o @
  if (!email.includes('@') || !email.split('@')[1]?.includes('.')) {
    return false;
  }
  
  return emailRegex.test(email.trim().toLowerCase());
};

// Sanitiza input de email removendo caracteres claramente inválidos
export const sanitizeEmailInput = (value: string): string => {
  // Remove espaços no início e fim
  let sanitized = value.trim();
  
  // Permite apenas caracteres válidos para email
  // Letras, números, @, ., _, %, +, -
  sanitized = sanitized.replace(/[^a-zA-Z0-9@._+%-]/g, '');
  
  // Não permite múltiplos @
  const atCount = (sanitized.match(/@/g) || []).length;
  if (atCount > 1) {
    // Mantém apenas o primeiro @
    const parts = sanitized.split('@');
    sanitized = parts[0] + '@' + parts.slice(1).join('');
  }
  
  return sanitized;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 3;
};

export const validatePhone = (phone: string): boolean => {
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 9;
};
