import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/types/memberArea';

interface LessonViewSidebarProps {
  lessons: Lesson[];
  currentLessonId: string;
  lessonProgress: Record<string, any>;
  memberAreaId: string;
  onLessonSelect: (lessonId: string) => void;
}

export function LessonViewSidebar({ 
  lessons, 
  currentLessonId, 
  lessonProgress, 
  memberAreaId,
  onLessonSelect 
}: LessonViewSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  const completedLessons = lessons.filter(lesson => 
    lessonProgress[lesson.id]?.completed
  ).length;
  
  const totalProgress = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        {/* Course Progress */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso do Curso</span>
                <span className="text-sm text-muted-foreground">{totalProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {completedLessons} de {lessons.length} aulas concluídas
              </p>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {!isCollapsed && "Lista de Aulas"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {lessons.map((lesson, index) => {
                const isCurrentLesson = lesson.id === currentLessonId;
                const progress = lessonProgress[lesson.id];
                const isCompleted = progress?.completed || false;
                const progressPercentage = progress?.progress_percentage || 0;
                
                return (
                  <SidebarMenuItem key={lesson.id}>
                    <SidebarMenuButton 
                      asChild
                      className={cn(
                        "w-full justify-start cursor-pointer transition-colors",
                        isCurrentLesson && "bg-primary text-primary-foreground"
                      )}
                    >
                      <div
                        onClick={() => onLessonSelect(lesson.id)}
                        className="flex items-center gap-3 p-3 w-full"
                      >
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : progressPercentage > 0 ? (
                            <div className="relative w-5 h-5">
                              <PlayCircle className="w-5 h-5 text-blue-500" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              </div>
                            </div>
                          ) : (
                            <Play className="w-5 h-5 text-muted-foreground" />
                          )}
                          
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {index + 1}
                          </Badge>
                        </div>
                        
                        {!isCollapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-tight truncate">
                              {lesson.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {lesson.duration && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration} min
                                </div>
                              )}
                              {progressPercentage > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {progressPercentage}%
                                </span>
                              )}
                            </div>
                            
                            {progressPercentage > 0 && progressPercentage < 100 && (
                              <div className="mt-2">
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                    style={{ width: `${progressPercentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}