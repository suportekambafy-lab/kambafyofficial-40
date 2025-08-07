
import React from 'react';
import { Button } from "@/components/ui/button";

interface MobileLoginChoiceProps {
  onChoice: (type: 'customer' | 'seller') => void;
}

export function MobileLoginChoice({ onChoice }: MobileLoginChoiceProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-checkout-green to-checkout-green/90 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-12">
        {/* Logo inspirado no Cakto */}
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-checkout-green font-bold text-3xl">K</span>
          </div>
          <h1 className="text-white text-3xl font-bold mb-2">kambafy</h1>
        </div>

        {/* Botões de escolha */}
        <div className="space-y-6">
          <Button
            onClick={() => onChoice('customer')}
            className="w-full bg-white hover:bg-gray-50 text-checkout-green py-4 text-lg font-semibold rounded-2xl shadow-lg border-2 border-white/20"
          >
            Sou Cliente
          </Button>
          
          <div className="text-center">
            <span className="text-white/80 text-base">ou</span>
          </div>
          
          <Button
            onClick={() => onChoice('seller')}
            className="w-full bg-white hover:bg-gray-50 text-checkout-green py-4 text-lg font-semibold rounded-2xl shadow-lg border-2 border-white/20"
          >
            Sou Vendedor
          </Button>
        </div>
      </div>
    </div>
  );
}
