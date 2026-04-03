import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

export type ActivityState = 'idle' | 'working' | 'attention';

interface AIActivityIndicatorProps {
  state: ActivityState;
  count?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Minimal AI activity indicator for the top bar.
 * Shows: idle (static), working (pulse), attention (badge with count).
 */
export function AIActivityIndicator({
  state,
  count = 0,
  onClick,
  className,
}: AIActivityIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all',
        'text-xs font-medium select-none',
        'hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        state === 'idle' && 'text-muted-foreground',
        state === 'working' && 'text-chart-1',
        state === 'attention' && 'text-primary',
        className
      )}
      title={
        state === 'idle'
          ? 'AI Idle'
          : state === 'working'
          ? 'AI Processing...'
          : `${count} AI event${count !== 1 ? 's' : ''} need attention`
      }
    >
      <Zap
        className={cn(
          'h-3.5 w-3.5',
          state === 'working' && 'animate-pulse'
        )}
      />
      <span>
        {state === 'idle' && 'AI'}
        {state === 'working' && 'AI Working'}
        {state === 'attention' && `${count} AI event${count !== 1 ? 's' : ''}`}
      </span>
      
      {/* Attention dot */}
      {state === 'attention' && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
      )}
    </button>
  );
}
