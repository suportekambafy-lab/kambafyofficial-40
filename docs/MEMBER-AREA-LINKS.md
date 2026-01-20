# Sistema de Links da Área de Membros

## Resumo das Mudanças

O sistema foi atualizado para usar o subdomínio **`membros.kambafy.com`** para todas as áreas de membros, separando-as dos outros subdomínios.

## Novos Subdomínios

- **`kambafy.com`** - Landing page principal
- **`app.kambafy.com`** - Dashboard de vendedores e autenticação
- **`pay.kambafy.com`** - Checkout e pagamentos
- **`admin.kambafy.com`** - Painel administrativo
- **`membros.kambafy.com`** - **NOVO** - Área de membros e login de estudantes

## URLs Geradas Automaticamente

### Área de Membros
- Login: `https://membros.kambafy.com/login/{memberAreaId}`
- Área principal: `https://membros.kambafy.com/area/{memberAreaId}`
- Lições: `https://membros.kambafy.com/area/{memberAreaId}/lesson/{lessonId}`
- Módulos: `https://membros.kambafy.com/area/{memberAreaId}/module/{moduleId}`

### Durante Desenvolvimento
No ambiente de desenvolvimento (localhost), os links continuam funcionando normalmente sem redirecionamentos.

## Componentes Atualizados

### 1. Utilitários
- **`src/utils/memberAreaLinks.ts`** - Funções para gerar links corretos
- **`src/components/MemberAreaLink.tsx`** - Componente para links da área de membros

### 2. Sistema de Redirecionamento
- **`src/components/SubdomainGuard.tsx`** - Atualizado para suportar subdomínio `membros`
- **`src/hooks/useSubdomain.ts`** - Detecta e maneja o novo subdomínio
- **`src/components/SubdomainLink.tsx`** - Roteamento automático para área de membros

### 3. Componentes de Compartilhamento
- **`src/components/ProductShareDialog.tsx`** - Agora inclui links da área de membros quando aplicável

## Como Usar

### Em Componentes React
```tsx
import { useMemberAreaLinks } from '@/utils/memberAreaLinks';

function MyComponent() {
  const { navigateToMemberArea, getMemberAreaLoginUrl } = useMemberAreaLinks();
  
  // Navegar para área de membros
  const handleAccessArea = () => {
    navigateToMemberArea('area-id-123');
  };
  
  // Obter URL de login
  const loginUrl = getMemberAreaLoginUrl('area-id-123');
}
```

### Componente de Link Direto
```tsx
import { MemberAreaLink, MemberAreaLoginLink } from '@/components/MemberAreaLink';

// Link para área de membros
<MemberAreaLink memberAreaId="123" path="/content">
  Acessar Conteúdo
</MemberAreaLink>

// Link para login
<MemberAreaLoginLink memberAreaId="123">
  Fazer Login
</MemberAreaLoginLink>
```

## Vantagens

1. **URLs Limpos**: Subdomínio dedicado para área de membros
2. **Melhor Organização**: Separação clara entre diferentes funcionalidades
3. **SEO**: URLs mais semânticas e organizadas
4. **Gerenciamento**: Fácil identificação do tipo de conteúdo
5. **Segurança**: Isolamento da área de membros

## Testando

Para testar em produção:
1. Crie um produto com área de membros
2. Use a funcionalidade "Compartilhar Produto"
3. Verifique se os links gerados usam `membros.kambafy.com`
4. Teste o acesso e login da área de membros

---

**Nota**: Em desenvolvimento local, os links continuam funcionando normalmente sem redirecionamentos para facilitar o teste e desenvolvimento.