
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
  selectedCountry: CountryInfo;
  onCountryChange: (countryCode: string) => void;
  supportedCountries: Record<string, CountryInfo>;
  loading?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onCountryChange,
  supportedCountries,
  loading = false
}) => {
  return (
    <div className="inline-flex items-center">
      <Select value={selectedCountry.code} onValueChange={onCountryChange}>
        <SelectTrigger className="w-20 h-8 text-xs border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
          <SelectValue>
            <div className="flex items-center gap-1">
              <span className="text-xs">{selectedCountry.flag}</span>
              <span className="text-xs text-gray-600 font-medium">
                {selectedCountry.code}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(supportedCountries).map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{country.flag}</span>
                <span className="text-sm">{country.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
