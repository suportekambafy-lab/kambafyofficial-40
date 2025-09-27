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
  return <div className="mt-8 border-t border-gray-800 pt-6 bg-zinc-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-zinc-950">
          <TabsTrigger value="description" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Descrição
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Material ({lessonMaterials.length})
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Links ({complementaryLinks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-0">
          <Card className="border-0 shadow-none">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {lesson.title}
                  </h2>
                  {lesson.description && <div className="prose prose-gray max-w-none">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {lesson.description}
                      </p>
                    </div>}
                  {!lesson.description && <p className="text-muted-foreground italic">
                      Nenhuma descrição disponível para esta aula.
                    </p>}
                </div>
                
                {lesson.duration > 0}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="mt-0">
          <Card className="border-0 shadow-none">
            <CardContent className="p-6">
              {lessonMaterials.length > 0 ? <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Materiais de Apoio
                  </h3>
                  <div className="grid gap-3">
                    {lessonMaterials.map(material => <div key={material.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border hover:bg-secondary/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(material.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {material.name}
                            </p>
                            {material.size && <p className="text-sm text-muted-foreground">
                                {formatFileSize(material.size)}
                              </p>}
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="flex-shrink-0">
                          <a href={material.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>)}
                  </div>
                </div> : <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum material disponível para esta aula.
                  </p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-0">
          <Card className="border-0 shadow-none">
            <CardContent className="p-6">
              {complementaryLinks.length > 0 ? <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Links Complementares
                  </h3>
                  <div className="grid gap-3">
                    {complementaryLinks.map(link => <div key={link.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border hover:bg-secondary/70 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {link.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {link.url}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="flex-shrink-0">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Visitar
                          </a>
                        </Button>
                      </div>)}
                  </div>
                </div> : <div className="text-center py-8">
                  <ExternalLink className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum link complementar disponível para esta aula.
                  </p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}