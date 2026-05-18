import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-badge border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary-foreground',
        secondary: 'border-transparent bg-secondary/10 text-secondary',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'text-foreground border-border',
        delivered: 'border-transparent bg-emerald-50 text-emerald-700',
        'in-transit': 'border-transparent bg-blue-50 text-blue-700',
        funding: 'border-transparent bg-amber-50 text-amber-700',
        cancelled: 'border-transparent bg-red-50 text-red-700',
        pending: 'border-transparent bg-orange-50 text-orange-700',
        committed: 'border-transparent bg-emerald-50 text-emerald-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
