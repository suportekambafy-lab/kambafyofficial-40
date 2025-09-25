
export interface ComplementaryLink {
  id: string;
  title: string;
  url: string;
}

export interface LessonMaterial {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'docx' | 'txt' | 'image' | 'other';
  size?: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url?: string;
  bunny_video_id?: string;
  bunny_embed_url?: string;
  video_data?: any;
  duration: number;
  order_number: number;
  status: 'draft' | 'published' | 'archived';
  module_id: string | null;
  member_area_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  scheduled_at?: string | null;
  is_scheduled?: boolean;
  complementary_links?: ComplementaryLink[];
  lesson_materials?: LessonMaterial[];
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
  coming_soon?: boolean;
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
  logo_url?: string | null;
}
