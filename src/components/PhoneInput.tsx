
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const countries: Country[] = [
  { code: "AO", name: "Angola", flag: "🇦🇴", dialCode: "+244" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351" },
  { code: "MZ", name: "Moçambique", flag: "🇲🇿", dialCode: "+258" },
  { code: "BR", name: "Brasil", flag: "🇧🇷", dialCode: "+55" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dialCode: "+1" },
  { code: "ES", name: "Espanha", flag: "🇪🇸", dialCode: "+34" },
  { code: "FR", name: "França", flag: "🇫🇷", dialCode: "+33" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dialCode: "+44" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪", dialCode: "+49" },
  { code: "IT", name: "Itália", flag: "🇮🇹", dialCode: "+39" },
  { code: "ZA", name: "África do Sul", flag: "🇿🇦", dialCode: "+27" },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻", dialCode: "+238" }
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedCountry?: string;
  onCountryChange?: (country: string) => void;
  className?: string;
  disabled?: boolean;
  allowedCountries?: string[];
}

export function PhoneInput({ 
  value, 
  onChange, 
  placeholder = "Digite seu telefone",
  selectedCountry = "AO",
  onCountryChange,
  className = "",
  disabled = false,
  allowedCountries
}: PhoneInputProps) {
  const availableCountries = allowedCountries ? 
    countries.filter(c => allowedCountries.includes(c.code)) : 
    countries;
  const currentCountry = availableCountries.find(c => c.code === selectedCountry) || availableCountries[0];

  const handleCountryChange = (countryCode: string) => {
    const newCountry = availableCountries.find(c => c.code === countryCode) || availableCountries[0];
    
    // Limpar o campo de telefone e adicionar o novo código do país
    const dialCode = newCountry.dialCode;
    onChange(dialCode + " ");
    
    if (onCountryChange) {
      onCountryChange(countryCode);
    }
  };

  return (
    <div className={`flex ${className}`}>
      <Select value={selectedCountry} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-auto min-w-[80px] rounded-r-none border-r-0">
          <SelectValue>
            <div className="flex items-center justify-center">
              <span className="text-lg">{currentCountry.flag}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableCountries.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm">{country.dialCode}</span>
                <span className="text-sm text-muted-foreground">{country.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-l-none"
        disabled={disabled}
      />
    </div>
  );
}
