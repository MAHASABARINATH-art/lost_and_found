import type { ClaimStatus, ItemStatus, FoundItemStatus } from '@/types';

const statusStyles: Record<string, string> = {
  Lost: 'bg-blue-100 text-blue-700 border-blue-200',
  Found: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Returned: 'bg-amber-100 text-amber-700 border-amber-200',
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Archived: 'bg-gray-100 text-gray-500 border-gray-200',
  Claimed: 'bg-purple-100 text-purple-700 border-purple-200',
  'Claim Submitted': 'bg-blue-100 text-blue-700 border-blue-200',
  'Under Review': 'bg-amber-100 text-amber-700 border-amber-200',
  Approved: 'bg-green-100 text-green-700 border-green-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
};

export default function StatusBadge({
  status,
}: {
  status: ItemStatus | FoundItemStatus | ClaimStatus | string;
}) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}
    >
      {status}
    </span>
  );
}
