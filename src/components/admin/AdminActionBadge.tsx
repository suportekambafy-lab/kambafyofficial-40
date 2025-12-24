import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Badge } from '@/components/ui/badge';
import { UserCheck, UserX } from 'lucide-react';

interface AdminActionBadgeProps {
  adminName?: string | null;
  adminId?: string | null;
  actionLabel?: string;
  className?: string;
  variant?: 'approved' | 'rejected' | 'default';
}

/**
 * Componente que exibe o nome do admin que realizou uma ação.
 * Visível para todos os admins ativos.
 */
export function AdminActionBadge({ 
  adminName, 
  adminId, 
  actionLabel = 'Processado por',
  className = '',
  variant = 'default'
}: AdminActionBadgeProps) {
  const { admin } = useAdminAuth();
  
  // Mostrar para qualquer admin ativo
  if (!admin || (!adminName && !adminId)) {
    return null;
  }
  
  const displayName = adminName || (adminId ? `Admin ${adminId.slice(0, 8)}...` : 'Admin');
  const Icon = variant === 'rejected' ? UserX : UserCheck;
  
  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Icon className="h-3 w-3" />
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
  className = '',
  variant = 'default'
}: AdminActionBadgeProps) {
  const { admin } = useAdminAuth();
  
  // Mostrar para qualquer admin ativo
  if (!admin || (!adminName && !adminId)) {
    return null;
  }
  
  const displayName = adminName || (adminId ? `Admin ${adminId.slice(0, 8)}...` : 'Admin');
  const Icon = variant === 'rejected' ? UserX : UserCheck;
  
  const badgeStyles = variant === 'rejected' 
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-purple-50 text-purple-700 border-purple-200';
  
  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${badgeStyles} ${className}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {actionLabel}: {displayName}
    </Badge>
  );
}
