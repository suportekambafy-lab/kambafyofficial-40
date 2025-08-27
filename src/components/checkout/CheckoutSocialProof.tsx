interface CheckoutSocialProofProps {
  viewersCount: number;
  totalSales: number;
  recentPurchases: string[];
  position: string;
}

export const CheckoutSocialProof = ({ viewersCount, totalSales, recentPurchases, position }: CheckoutSocialProofProps) => {
  return (
    <div className={`p-4 bg-green-50 rounded-lg mb-6 ${position}`}>
      <div className="flex items-center justify-between text-sm text-green-700">
        <span>👥 {viewersCount} pessoas visualizando</span>
        <span>✅ {totalSales} vendas realizadas</span>
      </div>
      {recentPurchases?.length > 0 && (
        <div className="mt-2 text-xs text-green-600">
          Últimas compras: {recentPurchases.join(', ')}
        </div>
      )}
    </div>
  );
};