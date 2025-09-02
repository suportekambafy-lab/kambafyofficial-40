import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Clock, Infinity } from "lucide-react";

interface AccessDurationSelectorProps {
  durationType: string;
  durationValue: number | null;
  durationDescription: string;
  onDurationChange: (type: string, value: number | null, description: string) => void;
}

export const AccessDurationSelector = ({
  durationType,
  durationValue,
  durationDescription,
  onDurationChange
}: AccessDurationSelectorProps) => {
  const [localType, setLocalType] = useState(durationType || 'lifetime');
  const [localValue, setLocalValue] = useState(durationValue || 1);
  const [localDescription, setLocalDescription] = useState(durationDescription || '');

  const updateDuration = (newType: string, newValue?: number) => {
    const value = newType === 'lifetime' ? null : (newValue || localValue);
    const description = generateDescription(newType, value);
    
    setLocalType(newType);
    if (newValue !== undefined) setLocalValue(newValue);
    setLocalDescription(description);
    
    onDurationChange(newType, value, description);
  };

  const generateDescription = (type: string, value: number | null): string => {
    if (type === 'lifetime') return 'Acesso vitalício';
    
    const unit = type === 'days' ? 'dia' : type === 'months' ? 'mês' : 'ano';
    const unitPlural = type === 'days' ? 'dias' : type === 'months' ? 'meses' : 'anos';
    
    return `Acesso por ${value} ${value === 1 ? unit : unitPlural}`;
  };

  const handleValueChange = (newValue: string) => {
    const numValue = parseInt(newValue);
    if (!isNaN(numValue) && numValue > 0) {
      updateDuration(localType, numValue);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Duração de Acesso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="duration-type">Tipo de Acesso</Label>
          <Select value={localType} onValueChange={(value) => updateDuration(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de acesso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lifetime">
                <div className="flex items-center gap-2">
                  <Infinity className="w-4 h-4" />
                  Acesso Vitalício
                </div>
              </SelectItem>
              <SelectItem value="days">Dias</SelectItem>
              <SelectItem value="months">Meses</SelectItem>
              <SelectItem value="years">Anos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {localType !== 'lifetime' && (
          <div>
            <Label htmlFor="duration-value">
              Quantidade de {localType === 'days' ? 'Dias' : localType === 'months' ? 'Meses' : 'Anos'}
            </Label>
            <Input
              id="duration-value"
              type="number"
              min="1"
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Ex: 6"
            />
          </div>
        )}

        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {localDescription}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {localType === 'lifetime' 
              ? 'Os clientes terão acesso permanente ao produto'
              : 'Os clientes terão acesso limitado pelo período especificado'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};