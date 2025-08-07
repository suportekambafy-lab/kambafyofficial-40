# Troubleshooting Guide

## Recent Issues Fixed

### Página Inicial em Branco (Janeiro 2025)
- **Redirecionamento forçado**: Removido redirecionamento automático no AuthContext que causava conflitos
- **Loading lento**: Reduzido delay inicial de 50ms para 10ms para carregamento mais rápido
- **Conflitos useAuthGuard**: Corrigido para não interferir com mobile subdomain
- **Dropdowns transparentes**: Melhorados com background sólido e z-index alto
- **QueryClient otimização**: Configurado para melhor performance sem reconexões desnecessárias
- **Fallback Suspense**: Adicionado fallback para evitar tela completamente em branco

### Admin Panel Issues (Fase 5)
- **UUID validation errors**: Fixed admin ID generation to use proper UUIDs
- **Database operations failing**: Added proper UUID validation before database updates
- **Withdrawal requests not showing**: Resolved UUID format issues preventing data retrieval
- **User ban/unban not working**: Fixed by ensuring proper UUID format in admin operations
- **Product approval not saving**: Resolved database constraint violations with UUID validation

### General Tips
- Always check browser console for detailed error messages
- Verify admin session is valid with proper UUID format
- Check network tab for API call responses
- Use the debug panels in admin pages for data inspection

## Prevention
- Admin IDs are now generated using `crypto.randomUUID()`
- All admin operations validate UUID format before database calls
- Added `updated_at` timestamps for better audit trails
- AuthContext não faz mais redirecionamentos forçados
- Loading states são gerenciados de forma mais eficiente

### Bugs no Painel do Vendedor (Janeiro 2025)
- **Query incorreta useOptimizedSellerData**: Corrigido `.single()` para `.maybeSingle()` no profile
- **Logs excessivos**: Removidos console.logs que degradavam performance 
- **Real-time sem debounce**: Adicionado debounce de 500ms nas atualizações
- **Cache muito agressivo**: Aumentado staleTime para 5min e cacheTime para 10min
- **Falta Error Boundary**: Adicionado ModernErrorBoundary para melhor UX
- **Throttling insuficiente**: Aumentado throttle de revalidação para 60s
- **RLS admin_dashboard_stats**: Identificado mas não corrigível (é uma view)