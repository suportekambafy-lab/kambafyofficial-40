import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export function useNativeShare() {
  const isNative = Capacitor.isNativePlatform();

  const canShare = async (): Promise<boolean> => {
    if (!isNative) {
      return 'share' in navigator;
    }

    try {
      const result = await Share.canShare();
      return result.value;
    } catch {
      return false;
    }
  };

  const shareContent = async (options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<boolean> => {
    if (!isNative) {
      // Fallback para Web Share API
      if ('share' in navigator) {
        try {
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url
          });
          return true;
        } catch (error) {
          console.error('Error sharing:', error);
          return false;
        }
      }
      return false;
    }

    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Compartilhar'
      });
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  };

  const shareProduct = async (productName: string, productUrl: string) => {
    return shareContent({
      title: `Confira ${productName} na Kambafy!`,
      text: `Olha que legal esse produto: ${productName}`,
      url: productUrl,
      dialogTitle: 'Compartilhar Produto'
    });
  };

  return {
    canShare,
    shareContent,
    shareProduct,
    isNative
  };
}
