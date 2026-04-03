import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePluginState, type PluginState } from '@/hooks/usePluginState';
import { Brain, TrendingUp, Tag, Clock } from 'lucide-react';

interface PluginStateDisplayProps {
  pluginInstanceId: string;
  stateKey?: string;
  compact?: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const getVariant = () => {
    if (score >= 80) return 'default';
    if (score >= 50) return 'secondary';
    return 'outline';
  };

  const getLabel = () => {
    if (score >= 80) return 'Hot Lead';
    if (score >= 50) return 'Qualified';
    return 'New';
  };

  return (
    <Badge variant={getVariant()} className="gap-1">
      <TrendingUp className="h-3 w-3" />
      {score}% - {getLabel()}
    </Badge>
  );
}

function StateContent({ state, compact }: { state: PluginState; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {state.score !== undefined && <ScoreBadge score={state.score} />}
        {state.tags?.map((tag) => (
          <Badge key={tag} variant="outline" className="gap-1">
            <Tag className="h-3 w-3" />
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Lead Score</span>
        {state.score !== undefined ? (
          <ScoreBadge score={state.score} />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Stage</span>
        <Badge variant="secondary">{state.stage || 'pending'}</Badge>
      </div>

      {state.tags && state.tags.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Tags</span>
          <div className="flex flex-wrap gap-1">
            {state.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {state.notes && (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">AI Notes</span>
          <p className="text-sm bg-muted/50 rounded p-2">{state.notes}</p>
        </div>
      )}

      {state.lastProcessedAt && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last updated: {new Date(state.lastProcessedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function PluginStateDisplay({
  pluginInstanceId,
  stateKey = 'latest_analysis',
  compact = false,
}: PluginStateDisplayProps) {
  const { state, isLoading, error } = usePluginState({ pluginInstanceId, stateKey });

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-6 w-32" />
    ) : (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading AI state: {error.message}
      </div>
    );
  }

  if (!state) {
    return compact ? null : (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No AI analysis yet</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return <StateContent state={state} compact />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StateContent state={state} />
      </CardContent>
    </Card>
  );
}
