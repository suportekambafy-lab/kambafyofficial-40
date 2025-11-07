import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, XCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SubscriptionStatusProps {
  subscription: {
    id: string;
    status: string;
    renewal_type: string;
    current_period_end: string;
    grace_period_end: string | null;
    reactivation_count: number;
    products: {
      name: string;
      subscription_config: any;
    };
  };
}

export function SubscriptionStatus({ subscription }: SubscriptionStatusProps) {
  const daysUntilExpiration = differenceInDays(
    new Date(subscription.current_period_end),
    new Date()
  );

  const isAutomatic = subscription.renewal_type === 'automatic';
  const isPastDue = subscription.status === 'past_due';
  const config = subscription.products.subscription_config || {};

  return (
    <Card className={cn(
      "border-2",
      subscription.status === 'active' && "border-green-500",
      isPastDue && "border-red-500"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{subscription.products.name}</CardTitle>
          <Badge variant={isAutomatic ? "default" : "secondary"}>
            {isAutomatic ? "Renovação Automática" : "Renovação Manual"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.status === 'active' && (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Próxima renovação</p>
              <p className="text-lg font-semibold">
                {format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground">
                {daysUntilExpiration} dias restantes
              </p>
            </div>

            {!isAutomatic && daysUntilExpiration <= 7 && (
              <Alert variant={daysUntilExpiration <= 3 ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {daysUntilExpiration <= 1 ? "🚨 Sua assinatura expira amanhã!" : `⏰ Faltam ${daysUntilExpiration} dias`}
                </AlertTitle>
                <AlertDescription>
                  Renove agora para manter seu acesso sem interrupções
                </AlertDescription>
              </Alert>
            )}

            {!isAutomatic && (
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => window.location.href = `/renovar/${subscription.id}`}
              >
                Renovar Agora
              </Button>
            )}
          </>
        )}

        {isPastDue && (
          <>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Assinatura Suspensa</AlertTitle>
              <AlertDescription>
                {subscription.grace_period_end ? (
                  <>
                    Período de graça até {format(new Date(subscription.grace_period_end), "dd/MM/yyyy")}
                  </>
                ) : (
                  "Sua assinatura está suspensa"
                )}
              </AlertDescription>
            </Alert>

            {config.reactivation_discount_percentage > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  🎉 Desconto de {config.reactivation_discount_percentage}% para reativar!
                </p>
              </div>
            )}

            <Button 
              className="w-full" 
              size="lg" 
              variant="default"
              onClick={() => window.location.href = `/renovar/${subscription.id}`}
            >
              Reativar Assinatura
            </Button>
          </>
        )}

        {subscription.status === 'canceled' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Assinatura Cancelada</AlertTitle>
            <AlertDescription>
              Você pode assinar novamente a qualquer momento
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
