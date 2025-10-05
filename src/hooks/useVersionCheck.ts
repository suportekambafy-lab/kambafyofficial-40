import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

const CHECK_INTERVAL = 30000; // Check every 30 seconds
const VERSION_URL = '/version.json';

export function useVersionCheck() {
  const { toast } = useToast();
  const currentVersionRef = useRef<string | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      if (isCheckingRef.current) return;
      
      try {
        isCheckingRef.current = true;
        
        // Add timestamp to prevent caching
        const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const newVersion = data.version;
        
        // First time check - just store the version
        if (currentVersionRef.current === null) {
          currentVersionRef.current = newVersion;
          console.log('📦 Current version:', newVersion);
          return;
        }
        
        // Version changed - reload the page
        if (currentVersionRef.current !== newVersion) {
          console.log('🔄 New version detected:', newVersion, 'Current:', currentVersionRef.current);
          
          toast({
            title: "Nova versão disponível",
            description: "Atualizando a aplicação...",
          });
          
          // Wait a bit for toast to show, then reload
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking version:', error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Check immediately on mount
    checkVersion();
    
    // Then check periodically
    const interval = setInterval(checkVersion, CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [toast]);
}
