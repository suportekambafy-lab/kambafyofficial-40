import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({ 
  title = "Em Breve", 
  description = "Esta funcionalidade estará disponível em breve. Fique atento às novidades!" 
}: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6">
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate(-1)} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <Button className="w-full">
                <Bell className="h-4 w-4 mr-2" />
                Notificar quando estiver pronto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}