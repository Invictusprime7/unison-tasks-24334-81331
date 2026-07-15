/**
 * Inline "create business" form embedded inside BusinessSelector's popover.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createBusinessInline } from '@/services/businessMembership';

interface Props {
  userId: string;
  onCreated: (id: string, name: string) => void;
  onCancel: () => void;
}

export function CreateBusinessInline({ userId, onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    if (!userId) {
      toast.error('Sign in to create a business');
      return;
    }
    setSaving(true);
    try {
      const created = await createBusinessInline({ userId, name, industry: industry.trim() || null });
      if (created) {
        toast.success(`Created “${created.name}”`);
        onCreated(created.id, created.name);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not create business');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
        New business profile
      </div>
      <Input
        autoFocus
        placeholder="Business name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-[#0d0d18] border-cyan-500/20 text-cyan-100 h-8"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Input
        placeholder="Industry (optional)"
        value={industry}
        onChange={(e) => setIndustry(e.target.value)}
        className="bg-[#0d0d18] border-cyan-500/20 text-cyan-100 h-8"
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 px-2 text-cyan-100/60 hover:text-cyan-100"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={saving || !name.trim()}
          className="h-7 px-3 bg-cyan-500 text-black hover:bg-cyan-400"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
        </Button>
      </div>
    </div>
  );
}
