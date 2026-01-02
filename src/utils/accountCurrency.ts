/**
 * Account Currency Resolver
 * Centraliza a lógica de resolução de moeda preferida do usuário,
 * eliminando o "flash KZ" ao carregar o dashboard.
 */

// Mapeamento país -> moeda padrão
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'AO': 'KZ',
  'PT': 'EUR',
  'ES': 'EUR',
  'FR': 'EUR',
  'DE': 'EUR',
  'IT': 'EUR',
  'MZ': 'MZN',
  'GB': 'GBP',
  'US': 'USD',
  'BR': 'BRL',
};

// Moedas suportadas
export const SUPPORTED_CURRENCIES = ['KZ', 'EUR', 'MZN', 'GBP', 'USD', 'BRL'];

const CACHE_KEY_PREFIX = 'preferred_currency_';

/**
 * Obtém a moeda preferida do cache local (por userId)
 */
export function getCachedPreferredCurrency(userId: string): string | null {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
    if (cached && SUPPORTED_CURRENCIES.includes(cached)) {
      return cached;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Salva a moeda preferida no cache local (por userId)
 */
export function setCachedPreferredCurrency(userId: string, currency: string): void {
  try {
    if (SUPPORTED_CURRENCIES.includes(currency)) {
      localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, currency);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Limpa a moeda preferida do cache local (por userId)
 */
export function clearCachedPreferredCurrency(userId: string): void {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Obtém o país de signup do localStorage (definido durante o signup)
 */
export function getSignupCountry(): string | null {
  try {
    return localStorage.getItem('signupCountry');
  } catch {
    return null;
  }
}

/**
 * Deriva a moeda a partir de um código de país
 */
export function deriveCurrencyFromCountry(countryCode: string | null): string | null {
  if (!countryCode) return null;
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || null;
}

/**
 * Resolve a moeda preferida seguindo a ordem de prioridade:
 * 1. Cache local (instantâneo)
 * 2. Valor passado do Supabase (se disponível)
 * 3. Derivado do país (se disponível)
 * 4. País de signup (localStorage)
 * 5. null (sem fallback para KZ - deixa o componente decidir)
 */
export function resolvePreferredCurrency(options: {
  userId?: string;
  supabaseCurrency?: string | null;
  supabaseCountry?: string | null;
}): string | null {
  const { userId, supabaseCurrency, supabaseCountry } = options;

  // 1. Tentar cache local primeiro (mais rápido)
  if (userId) {
    const cached = getCachedPreferredCurrency(userId);
    if (cached) return cached;
  }

  // 2. Usar valor do Supabase se disponível
  if (supabaseCurrency && SUPPORTED_CURRENCIES.includes(supabaseCurrency)) {
    return supabaseCurrency;
  }

  // 3. Derivar do país do perfil
  const fromCountry = deriveCurrencyFromCountry(supabaseCountry || null);
  if (fromCountry) return fromCountry;

  // 4. Tentar país de signup
  const signupCountry = getSignupCountry();
  const fromSignup = deriveCurrencyFromCountry(signupCountry);
  if (fromSignup) return fromSignup;

  // 5. Sem fallback - retorna null para que o componente decida
  return null;
}
