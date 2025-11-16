import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AppCourseViewerProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

export function AppCourseViewer({ courseId, courseName, onClose }: AppCourseViewerProps) {
  const navigate = useNavigate();
  
  console.log('🎓 AppCourseViewer: navegando para curso', { courseId, courseName });
  
  useEffect(() => {
    // Navega para a área de membros
    navigate(`/area/${courseId}`);
    
    // Limpa o selectedCourse para não renderizar este componente novamente
    onClose();
  }, [courseId, navigate, onClose]);
  
  // Não renderiza nada, apenas faz a navegação
  return null;
}
