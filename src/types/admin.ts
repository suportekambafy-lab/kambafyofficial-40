
export type AdminRole = 'super_admin' | 'admin' | 'support' | 'moderator';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

export interface AdminPermission {
  id: string;
  admin_id: string;
  permission: string;
  granted_at: string;
  granted_by: string | null;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_products: number;
  total_transactions: number;
  pending_withdrawals: number;
  total_paid_out: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  user_id: string;
  admin_approved: boolean;
  status: string;
  type: string;
  cover: string | null;
  fantasy_name: string | null;
  sales: number | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
  admin_processed_by: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  banned: boolean;
  is_creator: boolean | null;
  avatar_url: string | null;
  bio: string | null;
  account_holder: string | null;
  created_at: string;
}
