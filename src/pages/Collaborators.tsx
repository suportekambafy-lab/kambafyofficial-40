import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Construction } from 'lucide-react';

export default function Collaborators() {
  return (
    <div className="p-3 md:p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">
            Gerencie quem tem acesso à sua conta
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Construction className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Em breve
          </h3>
          <p className="text-muted-foreground max-w-md">
            A funcionalidade de colaboradores permitirá que você convide outras pessoas 
            para gerenciar sua conta, editar produtos e acompanhar vendas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
