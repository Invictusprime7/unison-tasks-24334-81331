import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Bot,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  Mail,
  Bell,
  Webhook,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmConfig {
  pipeline_stages: string[];
  custom_fields: Array<{ key: string; label: string; type: string }>;
  lead_sources: string[];
  auto_assign: boolean;
}

interface AutomationConfig {
  welcome_email: boolean;
  lead_notification: boolean;
  booking_confirmation: boolean;
  follow_up_sequence: boolean;
  workflows: Array<{ id: string; name: string; enabled: boolean }>;
}

interface GeneralSettings {
  notifications: { email: boolean; sms: boolean };
  integrations: Record<string, unknown>;
  domain: string | null;
  analytics_enabled: boolean;
}

interface ProjectSettings {
  id: string;
  project_id: string;
  crm_config: CrmConfig;
  automation_config: AutomationConfig;
  settings: GeneralSettings;
}

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  id: "",
  project_id: "",
  crm_config: {
    pipeline_stages: ["Lead", "Qualified", "Proposal", "Won"],
    custom_fields: [],
    lead_sources: ["Website", "Referral", "Email"],
    auto_assign: false,
  },
  automation_config: {
    welcome_email: false,
    lead_notification: true,
    booking_confirmation: true,
    follow_up_sequence: false,
    workflows: [],
  },
  settings: {
    notifications: {
      email: true,
      sms: false,
    },
    integrations: {},
    domain: null,
    analytics_enabled: true,
  },
};

function mergeProjectSettings(
  projectId: string,
  data?: Partial<ProjectSettings> | null
): ProjectSettings {
  return {
    ...DEFAULT_PROJECT_SETTINGS,
    ...data,
    project_id: projectId,
    crm_config: {
      ...DEFAULT_PROJECT_SETTINGS.crm_config,
      ...(data?.crm_config || {}),
    },
    automation_config: {
      ...DEFAULT_PROJECT_SETTINGS.automation_config,
      ...(data?.automation_config || {}),
      workflows: data?.automation_config?.workflows || DEFAULT_PROJECT_SETTINGS.automation_config.workflows,
    },
    settings: {
      ...DEFAULT_PROJECT_SETTINGS.settings,
      ...(data?.settings || {}),
      notifications: {
        ...DEFAULT_PROJECT_SETTINGS.settings.notifications,
        ...(data?.settings?.notifications || {}),
      },
      integrations: data?.settings?.integrations || DEFAULT_PROJECT_SETTINGS.settings.integrations,
    },
  };
}

// ─── Pipeline Stage Editor ────────────────────────────────────────────────────

function PipelineStageEditor({
  stages,
  onChange,
}: {
  stages: string[];
  onChange: (stages: string[]) => void;
}) {
  const [newStage, setNewStage] = useState("");

  const addStage = () => {
    const trimmed = newStage.trim();
    if (trimmed && !stages.includes(trimmed)) {
      onChange([...stages, trimmed]);
      setNewStage("");
    }
  };

  const removeStage = (idx: number) => {
    onChange(stages.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
        Pipeline Stages
      </label>
      <div className="space-y-1.5">
        {stages.map((stage, idx) => (
          <div
            key={`${stage}-${idx}`}
            className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-lg px-3 py-2"
          >
            <GripVertical className="h-3.5 w-3.5 text-white/20 shrink-0" />
            <span className="text-sm text-white/80 flex-1">{stage}</span>
            <Badge
              variant="secondary"
              className="text-[10px] bg-white/5 text-white/30 border-0 mr-1"
            >
              #{idx + 1}
            </Badge>
            <button
              onClick={() => removeStage(idx)}
              className="text-white/20 hover:text-red-400 transition-colors"
              aria-label={`Remove ${stage}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newStage}
          onChange={e => setNewStage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addStage()}
          placeholder="New stage name..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-8"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={addStage}
          disabled={!newStage.trim()}
          className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-8"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Lead Sources Editor ──────────────────────────────────────────────────────

function LeadSourcesEditor({
  sources,
  onChange,
}: {
  sources: string[];
  onChange: (sources: string[]) => void;
}) {
  const [newSource, setNewSource] = useState("");

  const add = () => {
    const t = newSource.trim();
    if (t && !sources.includes(t)) {
      onChange([...sources, t]);
      setNewSource("");
    }
  };

  const remove = (src: string) => onChange(sources.filter(s => s !== src));

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
        Lead Sources
      </label>
      <div className="flex flex-wrap gap-1.5">
        {sources.map(src => (
          <Badge
            key={src}
            className="bg-cyan-400/10 text-cyan-400 border-cyan-400/20 text-xs cursor-pointer hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/20 transition-colors group"
            onClick={() => remove(src)}
          >
            {src}
            <span className="ml-1.5 text-[10px] group-hover:visible invisible">×</span>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newSource}
          onChange={e => setNewSource(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Add source..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-8"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={add}
          disabled={!newSource.trim()}
          className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-8"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Automation Toggle Row ────────────────────────────────────────────────────

function AutomationToggle({
  label,
  description,
  icon: Icon,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white/3 border border-white/5 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 text-white/40 shrink-0" />
        <div>
          <p className="text-sm text-white/80 font-medium">{label}</p>
          <p className="text-xs text-white/40">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-cyan-500 shrink-0"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProjectSettingsPanelProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsPanel({
  projectId,
  open,
  onOpenChange,
}: ProjectSettingsPanelProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("project_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      console.error("project_settings load error:", error);
    }
    setSettings(mergeProjectSettings(projectId, data as unknown as Partial<ProjectSettings> | null));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("project_settings")
      .upsert(
        {
          project_id: projectId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          crm_config: settings.crm_config as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          automation_config: settings.automation_config as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settings: settings.settings as any,
        },
        { onConflict: "project_id" }
      )
      .select("*")
      .single();

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setSettings(mergeProjectSettings(projectId, data as unknown as Partial<ProjectSettings> | null));
      toast({ title: "Settings saved" });
    }
    setSaving(false);
  };

  const updateCrm = (patch: Partial<CrmConfig>) =>
    setSettings(prev =>
      prev ? { ...prev, crm_config: { ...prev.crm_config, ...patch } } : prev
    );

  const updateAutomation = (patch: Partial<AutomationConfig>) =>
    setSettings(prev =>
      prev ? { ...prev, automation_config: { ...prev.automation_config, ...patch } } : prev
    );

  const updateGeneral = (patch: Partial<GeneralSettings>) =>
    setSettings(prev =>
      prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-[#0a0a14] border-l border-white/8 text-white overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b border-white/5">
          <SheetTitle className="text-white flex items-center gap-2">
            <Settings className="h-4 w-4 text-cyan-400" />
            Project Settings
          </SheetTitle>
          <SheetDescription className="text-white/40">
            Configure CRM, automations, and general settings for this project.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Zap className="h-6 w-6 text-cyan-400 animate-pulse" />
          </div>
        ) : settings ? (
          <div className="pt-6">
            <Tabs defaultValue="crm">
              <TabsList className="bg-white/5 border border-white/10 p-0.5 rounded-lg mb-6">
                <TabsTrigger value="crm" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-md">
                  <Users className="h-3.5 w-3.5 mr-1.5" />CRM
                </TabsTrigger>
                <TabsTrigger value="automations" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-md">
                  <Bot className="h-3.5 w-3.5 mr-1.5" />Automations
                </TabsTrigger>
                <TabsTrigger value="general" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-md">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />General
                </TabsTrigger>
              </TabsList>

              {/* ── CRM Tab ── */}
              <TabsContent value="crm" className="space-y-6 mt-0">
                <PipelineStageEditor
                  stages={settings.crm_config.pipeline_stages}
                  onChange={stages => updateCrm({ pipeline_stages: stages })}
                />

                <LeadSourcesEditor
                  sources={settings.crm_config.lead_sources}
                  onChange={sources => updateCrm({ lead_sources: sources })}
                />

                <div className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm text-white/80 font-medium">Auto-assign leads</p>
                    <p className="text-xs text-white/40">Automatically assign new leads to team members</p>
                  </div>
                  <Switch
                    checked={settings.crm_config.auto_assign}
                    onCheckedChange={checked => updateCrm({ auto_assign: checked })}
                    className="data-[state=checked]:bg-cyan-500"
                  />
                </div>
              </TabsContent>

              {/* ── Automations Tab ── */}
              <TabsContent value="automations" className="space-y-3 mt-0">
                <AutomationToggle
                  label="Welcome Email"
                  description="Send a welcome email when a new lead is created"
                  icon={Mail}
                  checked={settings.automation_config.welcome_email}
                  onToggle={() => updateAutomation({ welcome_email: !settings.automation_config.welcome_email })}
                />
                <AutomationToggle
                  label="Lead Notification"
                  description="Notify team when a new lead comes in"
                  icon={Bell}
                  checked={settings.automation_config.lead_notification}
                  onToggle={() => updateAutomation({ lead_notification: !settings.automation_config.lead_notification })}
                />
                <AutomationToggle
                  label="Booking Confirmation"
                  description="Auto-send confirmation when a booking is made"
                  icon={Zap}
                  checked={settings.automation_config.booking_confirmation}
                  onToggle={() => updateAutomation({ booking_confirmation: !settings.automation_config.booking_confirmation })}
                />
                <AutomationToggle
                  label="Follow-up Sequence"
                  description="Automated follow-up emails after initial contact"
                  icon={Webhook}
                  checked={settings.automation_config.follow_up_sequence}
                  onToggle={() => updateAutomation({ follow_up_sequence: !settings.automation_config.follow_up_sequence })}
                />

                {settings.automation_config.workflows.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Custom Workflows
                    </label>
                    {settings.automation_config.workflows.map((wf, idx) => (
                      <div key={wf.id} className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg px-4 py-3">
                        <span className="text-sm text-white/80">{wf.name}</span>
                        <Switch
                          checked={wf.enabled}
                          onCheckedChange={checked => {
                            const wfs = [...settings.automation_config.workflows];
                            wfs[idx] = { ...wfs[idx], enabled: checked };
                            updateAutomation({ workflows: wfs });
                          }}
                          className="data-[state=checked]:bg-cyan-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── General Tab ── */}
              <TabsContent value="general" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    Custom Domain
                  </label>
                  <Input
                    value={settings.settings.domain ?? ""}
                    onChange={e => updateGeneral({ domain: e.target.value || null })}
                    placeholder="mysite.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    Notifications
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: "email" as const, label: "Email notifications" },
                      { key: "sms" as const, label: "SMS notifications" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg px-4 py-3">
                        <span className="text-sm text-white/80">{label}</span>
                        <Switch
                          checked={settings.settings.notifications[key]}
                          onCheckedChange={checked =>
                            updateGeneral({
                              notifications: { ...settings.settings.notifications, [key]: checked },
                            })
                          }
                          className="data-[state=checked]:bg-cyan-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm text-white/80 font-medium">Analytics</p>
                    <p className="text-xs text-white/40">Enable traffic & conversion tracking</p>
                  </div>
                  <Switch
                    checked={settings.settings.analytics_enabled}
                    onCheckedChange={checked => updateGeneral({ analytics_enabled: checked })}
                    className="data-[state=checked]:bg-cyan-500"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Save button */}
            <div className="pt-6 border-t border-white/5 mt-6">
              <Button
                onClick={save}
                disabled={saving}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-white/40 text-sm">
            Select a project to manage workspace settings.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ProjectSettingsPanel;
