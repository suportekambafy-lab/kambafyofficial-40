/**
 * Utilitário para gerenciar autenticação admin
 */

/**
 * Obtém o JWT do admin do localStorage
 * @returns JWT string ou null se não existir
 */
export const getAdminJwt = (): string | null => {
  try {
    return localStorage.getItem('admin_jwt');
  } catch {
    return null;
  }
};

/**
 * Verifica se há um JWT válido (apenas verifica existência, não valida assinatura)
 * @returns boolean indicando se JWT existe
 */
export const hasAdminJwt = (): boolean => {
  return getAdminJwt() !== null;
};

/**
 * Remove JWT do localStorage (usado no logout)
 */
export const clearAdminJwt = (): void => {
  try {
    localStorage.removeItem('admin_jwt');
    localStorage.removeItem('admin_session');
  } catch {
    // Silenciar erros
  }
};
