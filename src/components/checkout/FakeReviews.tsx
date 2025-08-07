
import React from 'react';
import { Star, User } from 'lucide-react';

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  timeAgo: string;
  verified?: boolean;
  avatar?: string;
}

interface FakeReviewsProps {
  reviews: Review[];
  title?: string;
}

const FakeReviews: React.FC<FakeReviewsProps> = ({
  reviews,
  title = "Depoimento de clientes"
}) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-4 text-center">
        {title}
      </h3>
      
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-lg p-3 border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {review.avatar ? (
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{review.name}</span>
                  {review.verified && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      ✓ Compra Verificada
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-gray-500">{review.timeAgo}</span>
                </div>
                
                <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FakeReviews;
