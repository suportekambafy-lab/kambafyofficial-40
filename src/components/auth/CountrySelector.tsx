
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number;
}

interface CountrySelectorProps {
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
  supportedCountries: Record<string, CountryInfo>;
  disabled?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onCountryChange,
  supportedCountries,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        País da Conta
      </label>
      <Select value={selectedCountry} onValueChange={onCountryChange} disabled={disabled}>
        <SelectTrigger className="w-full rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus:border-violet-400/70 focus:bg-violet-500/10">
          <SelectValue placeholder="Selecione o país">
            {selectedCountry && supportedCountries[selectedCountry] && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{supportedCountries[selectedCountry].flag}</span>
                <span className="text-sm">{supportedCountries[selectedCountry].name}</span>
                <span className="text-xs text-muted-foreground">
                  ({supportedCountries[selectedCountry].currency})
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border border-border rounded-xl shadow-lg">
          {Object.values(supportedCountries).map((country) => (
            <SelectItem key={country.code} value={country.code} className="cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">{country.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{country.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Moeda: {country.currency}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        O país selecionado será a base da moeda da sua conta
      </p>
    </div>
  );
};
