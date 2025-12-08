import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, Globe, MapPin, RefreshCw } from "lucide-react";
import { useUserTimezone, AVAILABLE_TIMEZONES } from "@/hooks/useUserTimezone";
import { useToast } from "@/hooks/use-toast";

export function TimezoneSettings() {
  const { 
    timezone, 
    detectedTimezone, 
    isAutomatic, 
    loading, 
    setTimezone,
    getCurrentTimePreview 
  } = useUserTimezone();
  
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(getCurrentTimePreview());
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [useAutomatic, setUseAutomatic] = useState(isAutomatic);
  const [saving, setSaving] = useState(false);

  // Atualizar hora atual a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimePreview());
    }, 1000);

    return () => clearInterval(interval);
  }, [getCurrentTimePreview]);

  // Sincronizar estado local com o hook
  useEffect(() => {
    setSelectedTimezone(timezone);
    setUseAutomatic(isAutomatic);
  }, [timezone, isAutomatic]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (useAutomatic) {
        await setTimezone(null);
      } else {
        await setTimezone(selectedTimezone);
      }

      toast({
        title: "Fuso horário atualizado",
        description: useAutomatic 
          ? `Usando detecção automática (${detectedTimezone})`
          : `Fuso horário definido para ${selectedTimezone}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o fuso horário",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedTzInfo = AVAILABLE_TIMEZONES.find(tz => tz.value === (useAutomatic ? detectedTimezone : selectedTimezone));

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Clock className="h-4 w-4 md:h-5 md:w-5" />
          Fuso Horário
        </CardTitle>
        <CardDescription>
          Configure o fuso horário para exibição correta dos horários de vendas e relatórios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview da hora atual */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hora atual</p>
                <p className="text-2xl font-bold font-mono">{currentTime}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{selectedTzInfo?.flag} {selectedTzInfo?.offset}</p>
              <p className="text-xs text-muted-foreground">{useAutomatic ? detectedTimezone : selectedTimezone}</p>
            </div>
          </div>
        </div>

        {/* Toggle automático */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="auto-timezone" className="text-sm font-medium">
                Detectar automaticamente
              </Label>
              <p className="text-xs text-muted-foreground">
                Usa o fuso horário do seu navegador ({detectedTimezone})
              </p>
            </div>
          </div>
          <Switch
            id="auto-timezone"
            checked={useAutomatic}
            onCheckedChange={(checked) => {
              setUseAutomatic(checked);
              if (checked) {
                setSelectedTimezone(detectedTimezone);
              }
            }}
          />
        </div>

        {/* Seletor de fuso horário - Sempre visível para permitir mudança manual */}
        <div className="space-y-2">
          <Label className="text-sm">
            {useAutomatic ? 'Fuso horário detectado' : 'Selecionar fuso horário'}
          </Label>
          <Select
            value={selectedTimezone}
            onValueChange={(value) => {
              setSelectedTimezone(value);
              // Se mudar manualmente, desativar automático
              if (useAutomatic) {
                setUseAutomatic(false);
              }
            }}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um fuso horário">
                {selectedTzInfo && (
                  <span className="flex items-center gap-2">
                    <span>{selectedTzInfo.flag}</span>
                    <span>{selectedTzInfo.label}</span>
                    <span className="text-muted-foreground text-xs">({selectedTzInfo.offset})</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <span className="flex items-center gap-2">
                    <span>{tz.flag}</span>
                    <span>{tz.label}</span>
                    <span className="text-muted-foreground text-xs">({tz.offset})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {useAutomatic && (
            <p className="text-xs text-muted-foreground">
              Selecione outro fuso para desativar a detecção automática
            </p>
          )}
        </div>

        {/* Botão salvar */}
        <Button 
          onClick={handleSave} 
          disabled={saving || loading}
          className="w-full"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar fuso horário'
          )}
        </Button>

        {/* Informação adicional */}
        <p className="text-xs text-muted-foreground text-center">
          O fuso horário afeta a exibição de horários em relatórios de vendas e análises
        </p>
      </CardContent>
    </Card>
  );
}
