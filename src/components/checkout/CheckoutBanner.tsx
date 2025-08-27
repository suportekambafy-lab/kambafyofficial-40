interface CheckoutBannerProps {
  bannerImage: string;
}

export const CheckoutBanner = ({ bannerImage }: CheckoutBannerProps) => {
  return (
    <div className="w-full mb-6">
      <img 
        src={bannerImage} 
        alt="Checkout Banner" 
        className="w-full h-32 object-cover rounded-lg"
      />
    </div>
  );
};