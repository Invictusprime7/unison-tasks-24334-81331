import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAIEvent } from '@/hooks/useAIEvent';
import { useAgentRunner } from '@/hooks/useAgentRunner';
import { Loader2, Send, Play, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AIEventTriggerProps {
  businessId: string;
  pluginInstanceId?: string;
  defaultIntent?: string;
  onEventEmitted?: (eventId: string) => void;
  onRunCompleted?: (result: { score: number; stage: string; tags: string[] }) => void;
}

export function AIEventTrigger({
  businessId,
  pluginInstanceId,
  defaultIntent = 'contact.submit',
  onEventEmitted,
  onRunCompleted,
}: AIEventTriggerProps) {
  const { emitEvent, isEmitting, lastEventId } = useAIEvent();
  const { triggerRun, isRunning, lastResult } = useAgentRunner();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      // Emit the event
      const { eventId } = await emitEvent({
        businessId,
        intent: defaultIntent,
        payload: formData,
        pluginInstanceId,
      });

      toast.success('Event queued for AI processing');
      onEventEmitted?.(eventId);

      // Optionally trigger immediate processing
      const result = await triggerRun(eventId);
      
      if (result.status === 'completed' && result.result) {
        toast.success(`Lead scored: ${result.result.score}%`);
        onRunCompleted?.(result.result);
      }

      // Clear form
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Event trigger error:', err);
      toast.error('Failed to process event');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Event Trigger</CardTitle>
        <CardDescription>
          Test the AI agent pipeline by submitting a simulated form
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="I'm interested in your services..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isEmitting || isRunning}>
              {isEmitting || isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit & Process
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => triggerRun()}
              disabled={isRunning}
            >
              <Play className="h-4 w-4 mr-2" />
              Process Queue
            </Button>
          </div>

          {/* Status display */}
          {lastResult && (
            <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                {lastResult.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : lastResult.status === 'failed' ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : null}
                <span className="text-sm font-medium capitalize">{lastResult.status}</span>
                {lastResult.latencyMs && (
                  <Badge variant="outline" className="text-xs">
                    {lastResult.latencyMs}ms
                  </Badge>
                )}
              </div>

              {lastResult.result && (
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge>Score: {lastResult.result.score}%</Badge>
                  <Badge variant="secondary">{lastResult.result.stage}</Badge>
                  {lastResult.result.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {lastResult.toolCalls && lastResult.toolCalls.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Tools executed: {lastResult.toolCalls.map((t) => t.tool).join(', ')}
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
