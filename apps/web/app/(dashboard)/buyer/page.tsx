import { Plus, TrendingUp, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/ui/KPICard';
import { SkeletonRow, SkeletonBlock } from '@/components/ui/SkeletonRow';

export default function BuyerDashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-secondary text-sm mt-1">Here&apos;s what&apos;s happening with your orders.</p>
        </div>
        <Link href="/dashboard/buyer/orders/new">
          <Button variant="primary" size="md" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Order
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Orders in Progress" value="—" sub="Loading..." icon={<Clock className="w-4 h-4" />} />
        <KPICard label="Total Value in Escrow" value="—" sub="Loading..." icon={<DollarSign className="w-4 h-4" />} />
        <KPICard label="Pending Deliveries" value="—" sub="Loading..." icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Orders Summary */}
        <div className="lg:col-span-2 bg-surface rounded-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">Active Orders Summary</h2>
            <Link href="/dashboard/buyer/orders" className="text-xs text-secondary hover:underline font-medium">
              View All Orders
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['ORDER ID', 'PRODUCT', 'COVERAGE', 'STATUS'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <SkeletonRow cols={4} />
              <SkeletonRow cols={4} />
              <SkeletonRow cols={4} />
            </tbody>
          </table>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <p className="text-xs text-secondary text-center mt-2">Activity will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
