// Reusable Loading Skeleton Components
// Used across app for better perceived performance

export const CardSkeleton = () => (
  <div className="card animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
  </div>
);

export const TableRowSkeleton = () => (
  <tr className="border-b dark:border-gray-700 animate-pulse">
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
    <td className="py-3 px-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto"></div></td>
    <td className="py-3 px-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto"></div></td>
  </tr>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b dark:border-gray-700">
          <th className="text-left py-3 px-4 text-sm"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div></th>
          <th className="text-left py-3 px-4 text-sm"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div></th>
          <th className="text-left py-3 px-4 text-sm hidden sm:table-cell"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div></th>
          <th className="text-left py-3 px-4 text-sm"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div></th>
          <th className="text-right py-3 px-4 text-sm"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 ml-auto"></div></th>
          <th className="text-right py-3 px-4 text-sm"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 ml-auto"></div></th>
        </tr>
      </thead>
      <tbody>
        {[...Array(rows)].map((_, i) => <TableRowSkeleton key={i} />)}
      </tbody>
    </table>
  </div>
);

export const GoalCardSkeleton = () => (
  <div className="card animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3"></div>
    <div className="flex justify-between">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
    </div>
  </div>
);

export const BudgetCardSkeleton = () => (
  <div className="card animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3"></div>
    <div className="flex justify-between">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse"></div>
    
    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      ))}
    </div>
    
    {/* Chart Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export const ListSkeleton = ({ items = 5 }) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Inline skeleton for small components
export const InlineSkeleton = ({ width = 'w-20' }) => (
  <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${width} animate-pulse`}></div>
);

