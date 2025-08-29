
export interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration: number;
  order_number: number;
  status: 'draft' | 'published' | 'archived';
  module_id: string | null;
  member_area_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  order_number: number;
  status: 'draft' | 'published' | 'archived';
  member_area_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  lessons_count?: number;
  cover_image_url?: string | null;
}

export interface MemberArea {
  id: string;
  name: string;
  url: string;
  description: string | null;
  students_count?: number;
  lessons_count?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  hero_image_url?: string | null;
  hero_title?: string | null;
  hero_description?: string | null;
}
