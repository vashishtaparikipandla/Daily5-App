import { Platform } from 'react-native';

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const LocalAuth = await import('expo-local-authentication');
    const [hardware, enrolled] = await Promise.all([
      LocalAuth.hasHardwareAsync(),
      LocalAuth.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  } catch { return false; }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const LocalAuth = await import('expo-local-authentication');
    const result = await LocalAuth.authenticateAsync({
      promptMessage: 'Unlock Daily 5',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch { return false; }
}
