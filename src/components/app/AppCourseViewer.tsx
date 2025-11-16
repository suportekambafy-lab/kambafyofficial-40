import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppCourseViewerProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

export function AppCourseViewer({ courseId, courseName, onClose }: AppCourseViewerProps) {
  console.log('🎓 AppCourseViewer renderizado:', { courseId, courseName });
  
  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-semibold text-foreground">{courseName}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Course Content */}
      <div className="h-[calc(100vh-73px)] overflow-auto">
        <iframe
          src={`/area/${courseId}`}
          className="w-full h-full border-0"
          title={courseName}
        />
      </div>
    </div>
  );
}
