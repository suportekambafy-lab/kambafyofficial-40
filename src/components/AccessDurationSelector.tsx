import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedOption, setSelectedOption] = useState(() => {
    if (durationType === 'lifetime') return 'lifetime';
    if (durationType === 'months' && durationValue === 6) return '6months';
    if (durationType === 'years' && durationValue === 1) return '1year';
    return 'lifetime'; // fallback
  });

  const handleOptionChange = (option: string) => {
    setSelectedOption(option);
    
    switch (option) {
      case '6months':
        onDurationChange('months', 6, 'Acesso por 6 meses');
        break;
      case '1year':
        onDurationChange('years', 1, 'Acesso por 1 ano');
        break;
      case 'lifetime':
      default:
        onDurationChange('lifetime', null, 'Acesso vitalício');
        break;
    }
  };

  const getDescription = (option: string) => {
    switch (option) {
      case '6months':
        return 'Os clientes terão acesso por 6 meses';
      case '1year':
        return 'Os clientes terão acesso por 1 ano';
      case 'lifetime':
      default:
        return 'Os clientes terão acesso permanente ao produto';
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
        <Select value={selectedOption} onValueChange={handleOptionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a duração de acesso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lifetime">
              <div className="flex items-center gap-2">
                <Infinity className="w-4 h-4" />
                Acesso Vitalício
              </div>
            </SelectItem>
            <SelectItem value="6months">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                6 Meses
              </div>
            </SelectItem>
            <SelectItem value="1year">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                1 Ano
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {selectedOption === '6months' && 'Acesso por 6 meses'}
            {selectedOption === '1year' && 'Acesso por 1 ano'}
            {selectedOption === 'lifetime' && 'Acesso vitalício'}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {getDescription(selectedOption)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};