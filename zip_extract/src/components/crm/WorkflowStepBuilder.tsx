import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  Mail,
  UserPlus,
  Clock,
  GitBranch,
  Webhook,
  Edit2,
  ArrowDown,
  CheckCircle,
} from "lucide-react";

export interface WorkflowStep {
  id: string;
  action_type: string;
  action_config: Record<string, any>;
  order: number;
}

interface WorkflowStepBuilderProps {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
}

const ACTION_TYPES = [
  { value: "create_contact", label: "Create Contact", icon: UserPlus, color: "bg-green-500" },
  { value: "update_contact", label: "Update Contact", icon: Edit2, color: "bg-blue-500" },
  { value: "send_email", label: "Send Email", icon: Mail, color: "bg-purple-500" },
  { value: "delay", label: "Wait/Delay", icon: Clock, color: "bg-orange-500" },
  { value: "condition", label: "Condition", icon: GitBranch, color: "bg-yellow-500" },
  { value: "webhook", label: "Call Webhook", icon: Webhook, color: "bg-pink-500" },
  { value: "create_lead", label: "Create Lead", icon: UserPlus, color: "bg-teal-500" },
  { value: "update_lead", label: "Update Lead Status", icon: Edit2, color: "bg-indigo-500" },
  { value: "create_activity", label: "Log Activity", icon: CheckCircle, color: "bg-cyan-500" },
];

export function WorkflowStepBuilder({ steps, onStepsChange }: WorkflowStepBuilderProps) {
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stepConfig, setStepConfig] = useState<Record<string, any>>({});

  const addStep = (actionType: string) => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      action_type: actionType,
      action_config: {},
      order: steps.length,
    };
    onStepsChange([...steps, newStep]);
    setEditingStep(newStep);
    setStepConfig({});
    setEditDialogOpen(true);
  };

  const updateStep = (stepId: string, config: Record<string, any>) => {
    const updatedSteps = steps.map((s) =>
      s.id === stepId ? { ...s, action_config: config } : s
    );
    onStepsChange(updatedSteps);
  };

  const deleteStep = (stepId: string) => {
    const filtered = steps.filter((s) => s.id !== stepId);
    const reordered = filtered.map((s, i) => ({ ...s, order: i }));
    onStepsChange(reordered);
  };

  const moveStep = (stepId: string, direction: "up" | "down") => {
    const index = steps.findIndex((s) => s.id === stepId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    )
      return;

    const newSteps = [...steps];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
    const reordered = newSteps.map((s, i) => ({ ...s, order: i }));
    onStepsChange(reordered);
  };

  const openEditDialog = (step: WorkflowStep) => {
    setEditingStep(step);
    setStepConfig(step.action_config || {});
    setEditDialogOpen(true);
  };

  const saveStepConfig = () => {
    if (editingStep) {
      updateStep(editingStep.id, stepConfig);
    }
    setEditDialogOpen(false);
    setEditingStep(null);
    setStepConfig({});
  };

  const getActionInfo = (actionType: string) => {
    return ACTION_TYPES.find((a) => a.value === actionType) || ACTION_TYPES[0];
  };

  const renderConfigFields = () => {
    if (!editingStep) return null;

    switch (editingStep.action_type) {
      case "send_email":
        return (
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Input
                value={stepConfig.subject || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                value={stepConfig.body || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, body: e.target.value })}
                placeholder="Email body (supports {{contact.email}}, {{contact.first_name}} variables)"
                rows={4}
              />
            </div>
            <div>
              <Label>To (optional override)</Label>
              <Input
                value={stepConfig.to || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, to: e.target.value })}
                placeholder="Leave empty to use contact email"
              />
            </div>
          </div>
        );

      case "delay":
        return (
          <div className="space-y-3">
            <div>
              <Label>Delay Duration</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={stepConfig.duration || 1}
                  onChange={(e) => setStepConfig({ ...stepConfig, duration: parseInt(e.target.value) })}
                  className="w-24"
                />
                <Select
                  value={stepConfig.unit || "minutes"}
                  onValueChange={(v) => setStepConfig({ ...stepConfig, unit: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "condition":
        return (
          <div className="space-y-3">
            <div>
              <Label>Field</Label>
              <Input
                value={stepConfig.field || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, field: e.target.value })}
                placeholder="e.g., contact.tags, lead.status"
              />
            </div>
            <div>
              <Label>Operator</Label>
              <Select
                value={stepConfig.operator || "equals"}
                onValueChange={(v) => setStepConfig({ ...stepConfig, operator: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                value={stepConfig.value || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, value: e.target.value })}
                placeholder="Value to compare"
              />
            </div>
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-3">
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={stepConfig.url || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={stepConfig.method || "POST"}
                onValueChange={(v) => setStepConfig({ ...stepConfig, method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Headers (JSON)</Label>
              <Textarea
                value={stepConfig.headers || "{}"}
                onChange={(e) => setStepConfig({ ...stepConfig, headers: e.target.value })}
                placeholder='{"Authorization": "Bearer ..."}'
                rows={2}
              />
            </div>
          </div>
        );

      case "create_contact":
      case "update_contact":
        return (
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input
                value={stepConfig.email || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, email: e.target.value })}
                placeholder="{{trigger.email}} or static email"
              />
            </div>
            <div>
              <Label>First Name</Label>
              <Input
                value={stepConfig.first_name || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, first_name: e.target.value })}
                placeholder="{{trigger.first_name}}"
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={stepConfig.last_name || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, last_name: e.target.value })}
                placeholder="{{trigger.last_name}}"
              />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={stepConfig.tags || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, tags: e.target.value })}
                placeholder="lead, newsletter"
              />
            </div>
          </div>
        );

      case "create_lead":
        return (
          <div className="space-y-3">
            <div>
              <Label>Lead Title</Label>
              <Input
                value={stepConfig.title || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, title: e.target.value })}
                placeholder="New Lead from {{trigger.source}}"
              />
            </div>
            <div>
              <Label>Source</Label>
              <Input
                value={stepConfig.source || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, source: e.target.value })}
                placeholder="website, referral, etc."
              />
            </div>
            <div>
              <Label>Initial Status</Label>
              <Select
                value={stepConfig.status || "new"}
                onValueChange={(v) => setStepConfig({ ...stepConfig, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "update_lead":
        return (
          <div className="space-y-3">
            <div>
              <Label>New Status</Label>
              <Select
                value={stepConfig.status || "contacted"}
                onValueChange={(v) => setStepConfig({ ...stepConfig, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "create_activity":
        return (
          <div className="space-y-3">
            <div>
              <Label>Activity Type</Label>
              <Select
                value={stepConfig.activity_type || "note"}
                onValueChange={(v) => setStepConfig({ ...stepConfig, activity_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={stepConfig.title || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, title: e.target.value })}
                placeholder="Activity title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={stepConfig.description || ""}
                onChange={(e) => setStepConfig({ ...stepConfig, description: e.target.value })}
                placeholder="Activity details"
                rows={2}
              />
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            No additional configuration needed for this action.
          </p>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Workflow Steps</h3>
        <Badge variant="secondary">{steps.length} steps</Badge>
      </div>

      {/* Visual Step Flow */}
      <div className="space-y-2">
        {steps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No steps yet. Add your first action below.
              </p>
            </CardContent>
          </Card>
        ) : (
          steps
            .sort((a, b) => a.order - b.order)
            .map((step, index) => {
              const actionInfo = getActionInfo(step.action_type);
              const Icon = actionInfo.icon;
              return (
                <div key={step.id} className="relative">
                  {index > 0 && (
                    <div className="absolute left-6 -top-2 flex justify-center">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="cursor-grab">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div
                          className={`p-2 rounded-lg ${actionInfo.color} text-white`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{actionInfo.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {Object.keys(step.action_config).length > 0
                              ? JSON.stringify(step.action_config).slice(0, 50) + "..."
                              : "Click to configure"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStep(step.id, "up")}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStep(step.id, "down")}
                            disabled={index === steps.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(step)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteStep(step.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
        )}
      </div>

      {/* Add Step Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Add Step</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {ACTION_TYPES.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.value}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 flex flex-col items-center gap-1"
                  onClick={() => addStep(action.value)}
                >
                  <div className={`p-1.5 rounded ${action.color} text-white`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-xs">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Step Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configure {editingStep && getActionInfo(editingStep.action_type).label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderConfigFields()}
            <Button onClick={saveStepConfig} className="w-full">
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
