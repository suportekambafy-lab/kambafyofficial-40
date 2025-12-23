import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Badge } from '@/components/ui/badge';
import { UserCheck } from 'lucide-react';

interface AdminActionBadgeProps {
  adminName?: string | null;
  adminId?: string | null;
  actionLabel?: string;
  className?: string;
}

/**
 * Componente que exibe o nome do admin que realizou uma ação.
 * Visível APENAS para super admins.
 */
export function AdminActionBadge({ 
  adminName, 
  adminId, 
  actionLabel = 'Processado por',
  className = ''
}: AdminActionBadgeProps) {
  const { admin } = useAdminAuth();
  
  // Só mostrar para super admins
  const isSuperAdmin = admin?.role === 'super_admin';
  
  if (!isSuperAdmin || (!adminName && !adminId)) {
    return null;
  }
  
  const displayName = adminName || (adminId ? `Admin ${adminId.slice(0, 8)}...` : 'Admin');
  
  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <UserCheck className="h-3 w-3" />
      <span>
        <span className="font-medium">{actionLabel}:</span>{' '}
        <span className="text-foreground">{displayName}</span>
      </span>
    </div>
  );
}

/**
 * Versão em Badge para uso em cards/listas
 */
export function AdminActionBadgeCompact({ 
  adminName, 
  adminId,
  actionLabel = 'Por',
  className = ''
}: AdminActionBadgeProps) {
  const { admin } = useAdminAuth();
  
  // Só mostrar para super admins
  const isSuperAdmin = admin?.role === 'super_admin';
  
  if (!isSuperAdmin || (!adminName && !adminId)) {
    return null;
  }
  
  const displayName = adminName || (adminId ? `Admin ${adminId.slice(0, 8)}...` : 'Admin');
  
  return (
    <Badge 
      variant="outline" 
      className={`text-xs bg-purple-50 text-purple-700 border-purple-200 ${className}`}
    >
      <UserCheck className="h-3 w-3 mr-1" />
      {actionLabel}: {displayName}
    </Badge>
  );
}
