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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 3;
};

export const validatePhone = (phone: string): boolean => {
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 9;
};
