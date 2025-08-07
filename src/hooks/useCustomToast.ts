import { useRef, useCallback } from 'react';
import CustomToaster, { ToasterRef } from '@/components/ui/toast';

type Variant = 'default' | 'success' | 'error' | 'warning';
type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface UseCustomToastProps {
  title?: string;
  message: string;
  variant?: Variant;
  duration?: number;
  position?: Position;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  onDismiss?: () => void;
  highlightTitle?: boolean;
}

// Global ref to access the toaster
let globalToasterRef: ToasterRef | null = null;

export const setGlobalToasterRef = (ref: ToasterRef | null) => {
  globalToasterRef = ref;
};

export const useCustomToast = () => {
  const showToast = useCallback((props: UseCustomToastProps) => {
    if (globalToasterRef) {
      globalToasterRef.show(props);
    } else {
      console.warn('Toast system not initialized');
    }
  }, []);

  return { toast: showToast };
};

// For compatibility with existing code
export const toast = (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
  if (globalToasterRef) {
    const variant = props.variant === 'destructive' ? 'error' : 'success'; // Sempre usar success para toasts positivos
    globalToasterRef.show({
      title: props.title,
      message: props.description || '',
      variant: variant,
    });
  }
};