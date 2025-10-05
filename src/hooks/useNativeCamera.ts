import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export function useNativeCamera() {
  const isNative = Capacitor.isNativePlatform();

  const takePhoto = async (): Promise<string | null> => {
    if (!isNative) {
      // Fallback para web - usar input file
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'camera';
        
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        
        input.click();
      });
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      return photo.dataUrl || null;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  };

  const pickPhoto = async (): Promise<string | null> => {
    if (!isNative) {
      // Fallback para web - usar input file
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        
        input.click();
      });
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return photo.dataUrl || null;
    } catch (error) {
      console.error('Error picking photo:', error);
      return null;
    }
  };

  return {
    takePhoto,
    pickPhoto,
    isNative
  };
}
