import { useMemo } from 'react';
import { useCurrencyToCountry } from './useCurrencyToCountry';

export const useCorrectSalesDisplay = () => {
  const { convertToKZ } = useCurrencyToCountry();

  const correctSaleAmount = (sale: any) => {
    // Sistema de correção desabilitado - os valores já estão corretos em KZ na base de dados
    return sale.amount;
  };

  const correctSalesData = (sales: any[]) => {
    // Retornar dados originais sem correção
    return sales;
  };

  return {
    correctSaleAmount,
    correctSalesData
  };
};