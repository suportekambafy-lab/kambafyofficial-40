-- Function to create notifications for all students when a new lesson is added
CREATE OR REPLACE FUNCTION public.notify_students_new_lesson()
RETURNS TRIGGER AS $$
DECLARE
  student RECORD;
  area_name TEXT;
BEGIN
  -- Only notify if lesson is published
  IF NEW.status = 'published' THEN
    -- Get member area name
    SELECT name INTO area_name FROM public.member_areas WHERE id = NEW.member_area_id;
    
    -- Create notification for each student in the member area
    FOR student IN 
      SELECT student_email, student_name 
      FROM public.member_area_students 
      WHERE member_area_id = NEW.member_area_id
    LOOP
      INSERT INTO public.member_area_notifications (
        member_area_id,
        student_email,
        type,
        title,
        message,
        data,
        read
      ) VALUES (
        NEW.member_area_id,
        student.student_email,
        'new_lesson',
        'Nova Aula Disponível! 🎬',
        'A aula "' || NEW.title || '" foi adicionada ao curso.',
        jsonb_build_object('lesson_id', NEW.id, 'lesson_title', NEW.title),
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new lessons
DROP TRIGGER IF EXISTS trigger_notify_new_lesson ON public.lessons;
CREATE TRIGGER trigger_notify_new_lesson
  AFTER INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_students_new_lesson();

-- Function to notify when a scheduled lesson becomes available
CREATE OR REPLACE FUNCTION public.notify_students_lesson_published()
RETURNS TRIGGER AS $$
DECLARE
  student RECORD;
BEGIN
  -- Only notify if status changed to published
  IF OLD.status != 'published' AND NEW.status = 'published' THEN
    FOR student IN 
      SELECT student_email 
      FROM public.member_area_students 
      WHERE member_area_id = NEW.member_area_id
    LOOP
      INSERT INTO public.member_area_notifications (
        member_area_id,
        student_email,
        type,
        title,
        message,
        data,
        read
      ) VALUES (
        NEW.member_area_id,
        student.student_email,
        'new_lesson',
        'Nova Aula Disponível! 🎬',
        'A aula "' || NEW.title || '" está disponível para você assistir.',
        jsonb_build_object('lesson_id', NEW.id, 'lesson_title', NEW.title),
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for lesson status updates
DROP TRIGGER IF EXISTS trigger_notify_lesson_published ON public.lessons;
CREATE TRIGGER trigger_notify_lesson_published
  AFTER UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_students_lesson_published();

-- Function to notify when a new module is added
CREATE OR REPLACE FUNCTION public.notify_students_new_module()
RETURNS TRIGGER AS $$
DECLARE
  student RECORD;
BEGIN
  IF NEW.status = 'published' THEN
    FOR student IN 
      SELECT student_email 
      FROM public.member_area_students 
      WHERE member_area_id = NEW.member_area_id
    LOOP
      INSERT INTO public.member_area_notifications (
        member_area_id,
        student_email,
        type,
        title,
        message,
        data,
        read
      ) VALUES (
        NEW.member_area_id,
        student.student_email,
        'new_module',
        'Novo Módulo Adicionado! 📚',
        'O módulo "' || NEW.title || '" foi adicionado ao curso.',
        jsonb_build_object('module_id', NEW.id, 'module_title', NEW.title),
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new modules
DROP TRIGGER IF EXISTS trigger_notify_new_module ON public.modules;
CREATE TRIGGER trigger_notify_new_module
  AFTER INSERT ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_students_new_module();