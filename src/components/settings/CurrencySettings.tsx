import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Coins, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCustomToast } from "@/hooks/useCustomToast";

interface CountryOption {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: 'AO', name: 'Angola', currency: 'KZ', flag: '🇦🇴' },
  { code: 'MZ', name: 'Moçambique', currency: 'MZN', flag: '🇲🇿' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹' },
  { code: 'ES', name: 'Espanha', currency: 'EUR', flag: '🇪🇸' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', flag: '🇧🇷' },
  { code: 'GB', name: 'Reino Unido', currency: 'GBP', flag: '🇬🇧' },
];

export const CurrencySettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useCustomToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [country, setCountry] = useState('AO');
  const [preferredCurrency, setPreferredCurrency] = useState('KZ');

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('country, preferred_currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading currency settings:', error);
        return;
      }

      if (data) {
        setCountry((data as any).country || 'AO');
        setPreferredCurrency((data as any).preferred_currency || 'KZ');
      }
    } catch (error) {
      console.error('Error loading currency settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    // Auto-set preferred currency based on country
    const countryData = SUPPORTED_COUNTRIES.find(c => c.code === newCountry);
    if (countryData) {
      setPreferredCurrency(countryData.currency);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Use upsert + select so we can detect when nothing was actually saved (e.g., RLS/no row)
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            country,
            preferred_currency: preferredCurrency,
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false,
          }
        )
        .select('country, preferred_currency')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Não foi possível salvar as configurações.');

      setCountry((data as any).country || country);
      setPreferredCurrency((data as any).preferred_currency || preferredCurrency);

      toast({
        title: "Configurações salvas",
        message: "Suas preferências de moeda foram atualizadas.",
        variant: "success"
      });
    } catch (error) {
      console.error('Error saving currency settings:', error);
      toast({
        title: "Erro",
        message: "Não foi possível salvar as configurações.",
        variant: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCountry = SUPPORTED_COUNTRIES.find(c => c.code === country);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Coins className="h-4 w-4 md:h-5 md:w-5" />
          Moeda e Região
        </CardTitle>
        <CardDescription>
          Configure seu país e moeda preferida para exibição no dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>País da Conta</Label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedCountry && (
                      <span className="flex items-center gap-2">
                        <span>{selectedCountry.flag}</span>
                        <span>{selectedCountry.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({selectedCountry.currency})
                        </span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({c.currency})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define a moeda base da sua conta
              </p>
            </div>

            <div className="space-y-2">
              <Label>Moeda de Exibição</Label>
              <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KZ">
                    <span className="flex items-center gap-2">
                      🇦🇴 Kwanza (KZ)
                    </span>
                  </SelectItem>
                  <SelectItem value="MZN">
                    <span className="flex items-center gap-2">
                      🇲🇿 Metical (MZN)
                    </span>
                  </SelectItem>
                  <SelectItem value="EUR">
                    <span className="flex items-center gap-2">
                      🇪🇺 Euro (EUR)
                    </span>
                  </SelectItem>
                  <SelectItem value="GBP">
                    <span className="flex items-center gap-2">
                      🇬🇧 Libra (GBP)
                    </span>
                  </SelectItem>
                  <SelectItem value="BRL">
                    <span className="flex items-center gap-2">
                      🇧🇷 Real (BRL)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Moeda usada para exibir totais no dashboard
              </p>
            </div>

            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                "Salvando..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Preferências
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
