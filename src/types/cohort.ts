export type CohortStatus = 'active' | 'inactive' | 'full' | 'ended';

export interface Cohort {
  id: string;
  member_area_id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: string | null;
  currency: string;
  product_id: string | null;
  max_students: number | null;
  current_students: number;
  start_date: string | null;
  end_date: string | null;
  status: CohortStatus;
  created_at: string;
  updated_at: string;
}

export interface CohortInsert {
  member_area_id: string;
  user_id: string;
  name: string;
  description?: string | null;
  price?: string | null;
  currency?: string;
  product_id?: string | null;
  max_students?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: CohortStatus;
}
