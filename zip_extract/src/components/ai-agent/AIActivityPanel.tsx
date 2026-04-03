import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AIActivityIndicator, type ActivityState } from './AIActivityIndicator';
import { 
  type AIActivityEvent, 
  type AIActivityStatus,
} from '@/hooks/useAIActivityMonitor';
import { 
  Check, 
  Loader2, 
  XCircle, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AIActivityPanelProps {
  events: AIActivityEvent[];
  activityState: ActivityState;
  attentionCount: number;
  isLoading?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

// Status icon and color mapping
function StatusIcon({ status }: { status: AIActivityStatus }) {
  switch (status) {
    case 'success':
      return <Check className="h-3.5 w-3.5 text-primary" />;
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 text-chart-1 animate-spin" />;
    case 'blocked':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case 'waiting':
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }
}

function statusBgClass(status: AIActivityStatus): string {
  switch (status) {
    case 'success':
      return 'bg-primary/10';
    case 'running':
      return 'bg-chart-1/10';
    case 'blocked':
      return 'bg-destructive/10';
    default:
      return 'bg-muted/50';
  }
}

interface EventRowProps {
  event: AIActivityEvent;
}

function EventRow({ event }: EventRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = event.score !== undefined || event.tags?.length || event.stage || event.notes || event.error;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
          'hover:bg-white/5',
          statusBgClass(event.status)
        )}
        disabled={!hasDetails}
      >
        <StatusIcon status={event.status} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {event.agentName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {event.statusLabel}
          </p>
        </div>
        
        {hasDetails && (
          <ChevronRight 
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )} 
          />
        )}
      </CollapsibleTrigger>
      
      {hasDetails && (
        <CollapsibleContent className="px-3 pb-2">
          <div className="ml-6 pl-3 border-l border-white/10 space-y-2 py-2">
            {/* Score */}
            {event.score !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Score:</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {event.score}
                  {event.score >= 80 ? ' (Hot lead)' : event.score >= 50 ? ' (Qualified)' : ' (New)'}
                </Badge>
              </div>
            )}
            
            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Tags:</span>
                {event.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="h-5 px-1.5 text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Stage */}
            {event.stage && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Action:</span>
                <span className="text-foreground capitalize">{event.stage.replace(/_/g, ' ')}</span>
              </div>
            )}
            
            {/* Notes */}
            {event.notes && (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                {event.notes}
              </p>
            )}
            
            {/* Error */}
            {event.error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                {event.error}
              </p>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

/**
 * AI Activity dropdown panel.
 * Shows recent agent activity with expandable details.
 */
export function AIActivityPanel({
  events,
  activityState,
  attentionCount,
  isLoading,
  onViewDetails,
  className,
}: AIActivityPanelProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <AIActivityIndicator
            state={activityState}
            count={attentionCount}
            className={className}
          />
        </div>
      </PopoverTrigger>
      
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 bg-card border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-foreground">AI Activity</h3>
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
        </div>
        
        {/* Event List */}
        <ScrollArea className="max-h-[320px]">
          {events.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No AI activity yet
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        {onViewDetails && events.length > 0 && (
          <div className="px-4 py-3 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              View details
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
