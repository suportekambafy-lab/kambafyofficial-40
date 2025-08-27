interface CheckoutCountdownProps {
  minutes: number;
  title: string;
  backgroundColor: string;
  textColor: string;
}

export const CheckoutCountdown = ({ minutes, title, backgroundColor, textColor }: CheckoutCountdownProps) => {
  return (
    <div 
      className="p-4 rounded-lg mb-6 text-center"
      style={{ backgroundColor, color: textColor }}
    >
      <h3 className="font-semibold">{title}</h3>
      <p>Tempo restante: {minutes} minutos</p>
    </div>
  );
};