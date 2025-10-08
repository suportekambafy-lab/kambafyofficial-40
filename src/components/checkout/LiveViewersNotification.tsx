import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LiveViewersNotificationProps {
  productId: string;
}

export const LiveViewersNotification = ({ productId }: LiveViewersNotificationProps) => {
  const [viewers, setViewers] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Gerar número de visualizadores entre 2-8
    const generateViewers = () => {
      const newViewers = Math.floor(Math.random() * 7) + 2; // 2-8
      setViewers(newViewers);
      setShow(true);

      // Esconder após 5 segundos
      setTimeout(() => {
        setShow(false);
      }, 5000);
    };

    // Mostrar primeira vez após 2 segundos
    const initialTimeout = setTimeout(generateViewers, 2000);

    // Depois a cada 20-30 segundos
    const interval = setInterval(generateViewers, Math.random() * 10000 + 20000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [productId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border-l-4 border-orange-500 max-w-xs"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Eye className="w-5 h-5 text-orange-500" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                <span className="font-bold text-orange-600">{viewers} pessoas</span> estão vendo
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                este produto agora
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
