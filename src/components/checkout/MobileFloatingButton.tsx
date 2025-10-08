import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileFloatingButtonProps {
  show: boolean;
  disabled: boolean;
  processing: boolean;
  totalPrice: string;
  onSubmit: () => void;
  buttonText?: string;
}

export const MobileFloatingButton = ({ 
  show, 
  disabled, 
  processing, 
  totalPrice, 
  onSubmit,
  buttonText = "Finalizar Compra"
}: MobileFloatingButtonProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="p-4 space-y-3">
            {/* Price Summary */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total a pagar:
              </span>
              <span className="text-2xl font-bold text-primary">
                {totalPrice}
              </span>
            </div>

            {/* Main Button */}
            <Button
              onClick={onSubmit}
              disabled={disabled || processing}
              className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  {buttonText}
                </>
              )}
            </Button>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">
                Pagamento 100% Seguro
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
