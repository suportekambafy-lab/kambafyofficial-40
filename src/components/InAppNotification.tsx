import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface NotificationData {
  title: string;
  message: string;
  order_id?: string;
  amount?: number;
  currency?: string;
}

interface InAppNotificationProps {
  notification: NotificationData | null;
  onClose: () => void;
}

export function InAppNotification({ notification, onClose }: InAppNotificationProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      
      // Auto-dismiss após 8 segundos
      const timer = setTimeout(() => {
        handleClose();
      }, 8000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Aguarda animação terminar
  };

  const handleClick = () => {
    navigate('/vendedor/vendas');
    handleClose();
  };

  if (!notification) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-[9999] max-w-md w-full"
        >
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-2xl p-4 cursor-pointer hover:shadow-3xl transition-shadow"
            onClick={handleClick}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg mb-1">
                  {notification.title}
                </h3>
                <p className="text-white/90 text-sm mb-2">
                  {notification.message}
                </p>
                
                {notification.amount && (
                  <div className="flex items-center gap-2 text-white/80 text-xs">
                    <span>Pedido: {notification.order_id}</span>
                    <span>•</span>
                    <span className="font-semibold">
                      {notification.amount.toLocaleString('pt-AO')} {notification.currency}
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="flex-shrink-0 text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-white/70 text-xs text-center">
                Clique para ver detalhes da venda
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}