import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export interface BiometricCredentials {
  username: string;
  password: string;
}

export class BiometricService {
  private static readonly CREDENTIALS_SERVER = 'kambafy-app';

  static async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade biométrica:', error);
      return false;
    }
  }

  static async getBiometryType(): Promise<BiometryType | null> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.biometryType || null;
    } catch (error) {
      console.error('Erro ao obter tipo de biometria:', error);
      return null;
    }
  }

  static async authenticate(reason?: string): Promise<boolean> {
    try {
      await NativeBiometric.verifyIdentity({
        reason: reason || 'Autentique-se para acessar o app',
        title: 'Autenticação Biométrica',
        subtitle: 'Use sua biometria para entrar',
        description: 'Coloque seu dedo ou olhe para o dispositivo'
      });
      return true;
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      return false;
    }
  }

  static async saveCredentials(username: string, password: string): Promise<boolean> {
    try {
      await NativeBiometric.setCredentials({
        username,
        password,
        server: this.CREDENTIALS_SERVER
      });
      return true;
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      return false;
    }
  }

  static async getCredentials(): Promise<BiometricCredentials | null> {
    try {
      const credentials = await NativeBiometric.getCredentials({
        server: this.CREDENTIALS_SERVER
      });
      
      if (credentials.username && credentials.password) {
        return {
          username: credentials.username,
          password: credentials.password
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter credenciais:', error);
      return null;
    }
  }

  static async deleteCredentials(): Promise<boolean> {
    try {
      await NativeBiometric.deleteCredentials({
        server: this.CREDENTIALS_SERVER
      });
      return true;
    } catch (error) {
      console.error('Erro ao deletar credenciais:', error);
      return false;
    }
  }

  static async enableBiometric(username: string, password: string): Promise<boolean> {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      return false;
    }

    const authenticated = await this.authenticate('Ative a autenticação biométrica');
    if (!authenticated) {
      return false;
    }

    return await this.saveCredentials(username, password);
  }

  static getBiometryTypeName(type: BiometryType | null): string {
    switch (type) {
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.TOUCH_ID:
        return 'Touch ID';
      case BiometryType.FINGERPRINT:
        return 'Impressão Digital';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Reconhecimento Facial';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Reconhecimento de Íris';
      default:
        return 'Biometria';
    }
  }
}
