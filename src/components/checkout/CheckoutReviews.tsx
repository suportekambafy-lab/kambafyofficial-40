interface Review {
  name: string;
  comment: string;
  rating: number;
}

interface CheckoutReviewsProps {
  title: string;
  reviews: Review[];
}

export const CheckoutReviews = ({ title, reviews }: CheckoutReviewsProps) => {
  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        {reviews?.map((review, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold">{review.name}</h4>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-2 text-gray-600">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};