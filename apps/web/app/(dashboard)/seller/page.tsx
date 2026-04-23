import { Plus, Package, GitMerge, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/ui/KPICard';
import { SkeletonRow, SkeletonBlock } from '@/components/ui/SkeletonRow';

export default function SellerDashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-secondary text-sm mt-1">Manage your lots and track your matches.</p>
        </div>
        <Link href="/dashboard/seller/lots/new">
          <Button variant="primary" size="md" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Publish New Lot
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Active Lots" value="—" sub="Loading..." icon={<Package className="w-4 h-4" />} />
        <KPICard label="Pending Matches" value="—" sub="Loading..." icon={<GitMerge className="w-4 h-4" />} />
        <KPICard label="Completed Sales" value="—" sub="Loading..." icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Lots */}
        <div className="lg:col-span-2 bg-surface rounded-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">Active Lots</h2>
            <Link href="/dashboard/seller/lots" className="text-xs text-secondary hover:underline font-medium">
              View All Lots
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['LOT ID', 'PRODUCT', 'QUANTITY', 'STATUS'].map((h) => (
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
