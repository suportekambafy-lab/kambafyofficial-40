import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, BookOpen, File, Image } from 'lucide-react';
import { Lesson } from '@/types/memberArea';
import { ComplementaryLink, LessonMaterial } from '@/types/memberArea';
interface LessonContentTabsProps {
  lesson: Lesson;
}
export function LessonContentTabs({
  lesson
}: LessonContentTabsProps) {
  const [activeTab, setActiveTab] = useState('description');

  // Parse JSON data safely
  const complementaryLinks: ComplementaryLink[] = lesson.complementary_links ? typeof lesson.complementary_links === 'string' ? JSON.parse(lesson.complementary_links) : lesson.complementary_links : [];
  const lessonMaterials: LessonMaterial[] = lesson.lesson_materials ? typeof lesson.lesson_materials === 'string' ? JSON.parse(lesson.lesson_materials) : lesson.lesson_materials : [];
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-4 w-4 text-blue-500" />;
      case 'image':
        return <Image className="h-4 w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  return <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 rounded-3xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto rounded-none border-b border-border bg-transparent p-0 w-full justify-start overflow-x-auto">
          <TabsTrigger value="description" className="relative rounded-none py-2 px-3 sm:px-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Descrição</span>
            <span className="sm:hidden">Desc</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="relative rounded-none py-2 px-3 sm:px-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Material ({lessonMaterials.length})</span>
            <span className="sm:hidden">Mat ({lessonMaterials.length})</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="relative rounded-none py-2 px-3 sm:px-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary">
            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Links ({complementaryLinks.length})</span>
            <span className="sm:hidden">Links ({complementaryLinks.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-4">
          <Card className="border-0 shadow-none">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                    {lesson.title}
                  </h2>
                  {lesson.description && <div className="prose prose-gray max-w-none">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                        {lesson.description}
                      </p>
                    </div>}
                  {!lesson.description && <p className="text-muted-foreground italic text-sm sm:text-base">
                      Nenhuma descrição disponível para esta aula.
                    </p>}
                </div>
                
                {lesson.duration > 0}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <Card className="border-0 shadow-none">
            <CardContent className="p-4 sm:p-6">
              {lessonMaterials.length > 0 ? <div className="space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
                    Materiais de Apoio
                  </h3>
                  <div className="space-y-3">
                    {lessonMaterials.map(material => <div key={material.id} className="flex flex-col gap-3 p-3 sm:p-4 bg-secondary/50 border hover:bg-secondary/70 transition-colors rounded-md">
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(material.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm sm:text-base break-words" title={material.name}>
                              {material.name}
                            </p>
                            {material.size && <p className="text-xs sm:text-sm text-muted-foreground">
                                {formatFileSize(material.size)}
                              </p>}
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={material.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>)}
                  </div>
                </div> : <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Nenhum material disponível para esta aula.
                  </p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <Card className="border-0 shadow-none">
            <CardContent className="p-4 sm:p-6">
              {complementaryLinks.length > 0 ? <div className="space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
                    Links Complementares
                  </h3>
                  <div className="space-y-3">
                    {complementaryLinks.map(link => <div key={link.id} className="flex flex-col gap-3 p-3 sm:p-4 bg-secondary/50 rounded-lg border hover:bg-secondary/70 transition-colors">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm sm:text-base break-words">
                            {link.title}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground break-all">
                            {link.url}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Visitar
                          </a>
                        </Button>
                      </div>)}
                  </div>
                </div> : <div className="text-center py-8">
                  <ExternalLink className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Nenhum link complementar disponível para esta aula.
                  </p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}