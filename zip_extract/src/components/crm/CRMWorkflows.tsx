import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Play, Trash2, Edit, Workflow, Clock, Zap, Settings, MousePointer, CreditCard, Calendar, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { WorkflowStepBuilder, WorkflowStep } from "./WorkflowStepBuilder";

interface WorkflowType {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  steps: Record<string, any>[];
  is_active: boolean;
  created_at: string;
}

const triggerIcons: Record<string, typeof Zap> = {
  manual: Play,
  webhook: Zap,
  schedule: Clock,
  form_submit: Workflow,
  button_click: MousePointer,
  payment: CreditCard,
  booking: Calendar,
  checkout: ShoppingCart,
};

export function CRMWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "manual",
    cron: "",
    formId: "",
  });
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      const { data, error } = await supabase
        .from("crm_workflows")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkflows((data || []) as WorkflowType[]);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const triggerConfig: any = {};
      if (formData.trigger_type === "schedule" && formData.cron) {
        triggerConfig.cron = formData.cron;
      }
      if (formData.trigger_type === "form_submit" && formData.formId) {
        triggerConfig.formId = formData.formId;
      }

      const workflowData = {
        name: formData.name,
        description: formData.description || null,
        trigger_type: formData.trigger_type,
        trigger_config: triggerConfig,
        steps: workflowSteps.map((s) => ({
          action_type: s.action_type,
          action_config: s.action_config,
          order: s.order,
        })),
      };

      if (editingWorkflow) {
        const { error } = await supabase
          .from("crm_workflows")
          .update(workflowData)
          .eq("id", editingWorkflow.id);

        if (error) throw error;
        toast.success("Workflow updated");
      } else {
        const { error } = await supabase
          .from("crm_workflows")
          .insert(workflowData);

        if (error) throw error;
        toast.success("Workflow created");
      }

      setDialogOpen(false);
      setEditingWorkflow(null);
      setFormData({ name: "", description: "", trigger_type: "manual", cron: "", formId: "" });
      setWorkflowSteps([]);
      fetchWorkflows();
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error("Failed to save workflow");
    }
  }

  async function toggleWorkflow(id: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from("crm_workflows")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(isActive ? "Workflow activated" : "Workflow deactivated");
      fetchWorkflows();
    } catch (error) {
      console.error("Error toggling workflow:", error);
      toast.error("Failed to update workflow");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workflow?")) return;

    try {
      const { error } = await supabase.from("crm_workflows").delete().eq("id", id);
      if (error) throw error;
      toast.success("Workflow deleted");
      fetchWorkflows();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error("Failed to delete workflow");
    }
  }

  async function triggerWorkflow(workflow: WorkflowType) {
    try {
      const { error } = await supabase.functions.invoke("workflow-trigger", {
        body: { workflowId: workflow.id, triggerData: { triggered_by: "manual" } },
      });

      if (error) throw error;
      toast.success("Workflow triggered");
    } catch (error) {
      console.error("Error triggering workflow:", error);
      toast.error("Failed to trigger workflow");
    }
  }

  function openEditDialog(workflow: WorkflowType) {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || "",
      trigger_type: workflow.trigger_type,
      cron: workflow.trigger_config?.cron || "",
      formId: workflow.trigger_config?.formId || "",
    });
    // Convert stored steps to WorkflowStep format
    const existingSteps: WorkflowStep[] = (workflow.steps || []).map((s: any, i: number) => ({
      id: crypto.randomUUID(),
      action_type: s.action_type || "send_email",
      action_config: s.action_config || {},
      order: s.order ?? i,
    }));
    setWorkflowSteps(existingSteps);
    setDialogOpen(true);
  }

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingWorkflow(null);
              setFormData({ name: "", description: "", trigger_type: "manual", cron: "", formId: "" });
              setWorkflowSteps([]);
            }}>
              <Plus className="h-4 w-4 mr-1" /> Add Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWorkflow ? "Edit Workflow" : "Create Workflow"}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-1" /> Settings
                </TabsTrigger>
                <TabsTrigger value="steps">
                  <Workflow className="h-4 w-4 mr-1" /> Steps
                </TabsTrigger>
              </TabsList>
              <TabsContent value="settings">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Workflow name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What does this workflow do?"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger Type</Label>
                    <Select
                      value={formData.trigger_type}
                      onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="schedule">Scheduled</SelectItem>
                        <SelectItem value="form_submit">Form Submission</SelectItem>
                        <SelectItem value="button_click">Button Click</SelectItem>
                        <SelectItem value="payment">Payment Completed</SelectItem>
                        <SelectItem value="booking">Booking Created</SelectItem>
                        <SelectItem value="checkout">Cart Checkout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.trigger_type === "schedule" && (
                    <div className="space-y-2">
                      <Label>Schedule</Label>
                      <Select
                        value={formData.cron}
                        onValueChange={(v) => setFormData({ ...formData, cron: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="*/5">Every 5 minutes</SelectItem>
                          <SelectItem value="*/15">Every 15 minutes</SelectItem>
                          <SelectItem value="*/30">Every 30 minutes</SelectItem>
                          <SelectItem value="@hourly">Every hour</SelectItem>
                          <SelectItem value="@daily">Daily</SelectItem>
                          <SelectItem value="@weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.trigger_type === "form_submit" && (
                    <div className="space-y-2">
                      <Label>Form ID</Label>
                      <Input
                        value={formData.formId}
                        onChange={(e) => setFormData({ ...formData, formId: e.target.value })}
                        placeholder="contact-form, newsletter, etc."
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full">
                    {editingWorkflow ? "Update Workflow" : "Create Workflow"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="steps" className="mt-4">
                <WorkflowStepBuilder
                  steps={workflowSteps}
                  onStepsChange={setWorkflowSteps}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflows Grid */}
      {filteredWorkflows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No workflows found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => {
            const TriggerIcon = triggerIcons[workflow.trigger_type] || Workflow;
            return (
              <Card key={workflow.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <TriggerIcon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">{workflow.name}</CardTitle>
                    </div>
                    <Switch
                      checked={workflow.is_active}
                      onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workflow.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workflow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{workflow.trigger_type}</Badge>
                    {workflow.steps?.length > 0 && (
                      <Badge variant="secondary">{workflow.steps.length} steps</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    {workflow.trigger_type === "manual" && workflow.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerWorkflow(workflow)}
                      >
                        <Play className="h-3 w-3 mr-1" /> Run
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(workflow)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(workflow.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
