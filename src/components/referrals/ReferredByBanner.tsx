import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReferredByBannerProps {
  referrerName: string;
}

export function ReferredByBanner({ referrerName }: ReferredByBannerProps) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                Você foi indicado por <span className="text-primary">{referrerName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Isso não afeta suas comissões de venda
              </p>
            </div>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-5 w-5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  O vendedor que te indicou recebe uma pequena comissão sobre suas vendas 
                  por um período limitado. Isso <strong>não reduz</strong> seus ganhos - 
                  é um bónus pago pela plataforma.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
