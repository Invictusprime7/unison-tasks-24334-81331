/**
 * GhlReactionsManager
 *
 * Lightweight UI to configure rules that fire when a GHL webhook event
 * arrives. Stored in `ghl_event_reactions`. Runner edge function executes
 * each matching rule (`ghl-reactions-runner`).
 */
import { useEffect, useState } from 'react';
import { supabase as _sb } from '@/integrations/supabase/client';
const supabase: any = _sb;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Zap, Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Reaction {
  id: string;
  name: string;
  event_type: string;
  stage_filter: string | null;
  action_type: string;
  action_config: Record<string, unknown>;
  enabled: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
}

const EVENT_TYPES = [
  'ContactCreate', 'ContactUpdate', 'OpportunityCreate',
  'OpportunityStageChange', 'OpportunityStatusChange',
  'WorkflowCompleted', 'AppointmentCreate', 'FormSubmit',
];

const ACTION_TYPES = [
  { value: 'notify', label: 'Send notification' },
  { value: 'create_task', label: 'Create task' },
  { value: 'update_lead', label: 'Update lead stage' },
  { value: 'http', label: 'HTTP webhook' },
];

export function GhlReactionsManager({ businessId }: { businessId?: string | null }) {
  const [rows, setRows] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    event_type: 'OpportunityStageChange',
    stage_filter: '',
    action_type: 'notify',
    action_value: '',
  });

  const refresh = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ghl_event_reactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data || []) as Reaction[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const create = async () => {
    if (!businessId || !draft.name) return;
    setCreating(true);
    const action_config: Record<string, unknown> =
      draft.action_type === 'http' ? { url: draft.action_value } :
      draft.action_type === 'create_task' ? { title: draft.action_value || `GHL ${draft.event_type}` } :
      draft.action_type === 'update_lead' ? { stage: draft.action_value || 'qualified' } :
      { title: draft.action_value || `GHL ${draft.event_type}` };

    const { error } = await supabase.from('ghl_event_reactions').insert([{
      business_id: businessId,
      name: draft.name,
      event_type: draft.event_type,
      stage_filter: draft.stage_filter || null,
      action_type: draft.action_type,
      action_config: action_config as never,
    }]);
    if (error) toast.error(error.message);
    else {
      toast.success('Rule created');
      setDraft({ name: '', event_type: 'OpportunityStageChange', stage_filter: '', action_type: 'notify', action_value: '' });
      refresh();
    }
    setCreating(false);
  };

  const toggle = async (r: Reaction) => {
    const { error } = await supabase
      .from('ghl_event_reactions')
      .update({ enabled: !r.enabled })
      .eq('id', r.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('ghl_event_reactions').delete().eq('id', id);
    if (error) toast.error(error.message);
    else refresh();
  };

  if (!businessId) {
    return (
      <Card><CardContent className="py-6 text-sm text-muted-foreground">
        Connect a business to configure reactions.
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4 h-4 text-primary" />
          GHL Event Reactions
          <Badge variant="secondary" className="ml-auto">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create form */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 rounded-lg border bg-muted/30">
          <Input className="md:col-span-2"
            placeholder="Rule name" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Select value={draft.event_type} onValueChange={(v) => setDraft({ ...draft, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Stage filter (opt)" value={draft.stage_filter}
            onChange={(e) => setDraft({ ...draft, stage_filter: e.target.value })}
          />
          <Select value={draft.action_type} onValueChange={(v) => setDraft({ ...draft, action_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder={draft.action_type === 'http' ? 'https://…' : draft.action_type === 'update_lead' ? 'stage' : 'Title'}
            value={draft.action_value}
            onChange={(e) => setDraft({ ...draft, action_value: e.target.value })}
          />
          <div className="md:col-span-6 flex justify-end">
            <Button size="sm" onClick={create} disabled={creating || !draft.name}>
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add rule
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No reactions yet. Add one above to react to incoming GHL events.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch checked={r.enabled} onCheckedChange={() => toggle(r)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{r.name}</span>
                    <Badge variant="outline" className="text-xs">{r.event_type}</Badge>
                    {r.stage_filter && <Badge variant="secondary" className="text-xs">stage: {r.stage_filter}</Badge>}
                    <Badge className="text-xs">{r.action_type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Triggered {r.trigger_count}× {r.last_triggered_at && `· last ${new Date(r.last_triggered_at).toLocaleString()}`}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
