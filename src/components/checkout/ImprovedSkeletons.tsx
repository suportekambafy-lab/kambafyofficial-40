import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const CheckoutLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Loading Message */}
      <div className="text-center py-8">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
          Carregando seu checkout personalizado...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Estamos preparando a melhor experiência para você
        </p>
      </div>

      {/* Product Header Skeleton */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3">
            <div className="w-full h-48 md:h-64 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded-lg" />
          </div>
          <div className="w-full md:w-2/3 space-y-4">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-24" />
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-3/4" />
            <div className="space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-full" />
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-2/3" />
            </div>
            <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-32" />
          </div>
        </div>
      </div>

      {/* Form Skeleton */}
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded mb-2 w-24" />
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods Skeleton */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded mb-4 w-40" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 border-2 border-gray-200 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded" />
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
