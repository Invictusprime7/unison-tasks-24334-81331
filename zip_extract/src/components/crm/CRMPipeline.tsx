import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  expected_close_date: string | null;
  contact_id: string | null;
  lead_id: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface Lead {
  id: string;
  title: string;
}

interface AutomationCondition {
  field: string;
  operator?: string;
  value: string;
}

interface AutomationAction {
  type: string;
  config?: Record<string, any>;
}

const stages = [
  { id: "prospecting", label: "Prospecting", color: "bg-blue-100 border-blue-300" },
  { id: "negotiation", label: "Negotiation", color: "bg-yellow-100 border-yellow-300" },
  { id: "closed_won", label: "Closed Won", color: "bg-green-100 border-green-300" },
  { id: "closed_lost", label: "Closed Lost", color: "bg-red-100 border-red-300" },
];

export function CRMPipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    value: "",
    expected_close_date: "",
    contact_id: "",
    lead_id: "",
    stage: "prospecting",
  });

  useEffect(() => {
    fetchDeals();
    fetchContacts();
    fetchLeads();
  }, []);

  async function fetchDeals() {
    try {
      const { data, error } = await supabase
        .from("crm_deals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error fetching deals:", error);
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }

  async function fetchContacts() {
    try {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, first_name, last_name, email")
        .limit(100);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  }

  async function fetchLeads() {
    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, title")
        .limit(100);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const dealData = {
        title: formData.title,
        stage: formData.stage,
        value: formData.value ? parseFloat(formData.value) : null,
        expected_close_date: formData.expected_close_date || null,
        contact_id: formData.contact_id || null,
        lead_id: formData.lead_id || null,
      };

      const { error } = await supabase.from("crm_deals").insert(dealData);

      if (error) throw error;
      toast.success("Deal created");

      setDialogOpen(false);
      setFormData({
        title: "",
        value: "",
        expected_close_date: "",
        contact_id: "",
        lead_id: "",
        stage: "prospecting",
      });
      fetchDeals();
    } catch (error) {
      console.error("Error creating deal:", error);
      toast.error("Failed to create deal");
    }
  }

  async function updateDealStage(dealId: string, newStage: string, oldStage: string) {
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({ stage: newStage })
        .eq("id", dealId);

      if (error) throw error;

      // Trigger automation for stage change
      await triggerStageChangeAutomation(dealId, oldStage, newStage);

      toast.success(`Deal moved to ${stages.find(s => s.id === newStage)?.label}`);
      fetchDeals();
    } catch (error) {
      console.error("Error updating deal stage:", error);
      toast.error("Failed to update deal stage");
    }
  }

  async function triggerStageChangeAutomation(dealId: string, oldStage: string, newStage: string) {
    try {
      // Check for active automations for this trigger
      const { data: automations, error } = await supabase
        .from("crm_automations")
        .select("*")
        .eq("trigger_event", "deal_stage_changed")
        .eq("is_active", true);

      if (error) throw error;

      // Trigger workflows based on conditions
      for (const automation of automations || []) {
        const conditions = Array.isArray(automation.conditions) 
          ? (automation.conditions as unknown as AutomationCondition[]) 
          : [];
        
        // Check if all conditions are satisfied
        const shouldTrigger = conditions.length === 0 || conditions.every((condition) => {
          // Check each condition based on its field
          if (condition.field === "old_stage") {
            return condition.value === oldStage;
          }
          if (condition.field === "new_stage" || condition.field === "stage") {
            return condition.value === newStage;
          }
          // Unknown condition field - skip this condition
          return true;
        });

        if (shouldTrigger) {
          // Execute automation actions
          const actions = Array.isArray(automation.actions) 
            ? (automation.actions as unknown as AutomationAction[]) 
            : [];
          await executeAutomationActions(actions, dealId);
        }
      }
    } catch (error) {
      console.error("Error triggering automation:", error);
    }
  }

  async function executeAutomationActions(actions: AutomationAction[], dealId: string) {
    try {
      for (const action of actions) {
        if (action.type === "send_email") {
          // TODO: Implement email sending via email service
          console.log("TODO: Send email for deal:", dealId, action);
        } else if (action.type === "create_task") {
          // TODO: Create task in crm_activities table
          console.log("TODO: Create task for deal:", dealId, action);
        } else if (action.type === "update_field") {
          // TODO: Update deal fields based on action config
          console.log("TODO: Update field for deal:", dealId, action);
        }
      }
    } catch (error) {
      console.error("Error executing automation actions:", error);
    }
  }

  function handleDragStart(deal: Deal) {
    setDraggedDeal(deal);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, newStage: string) {
    e.preventDefault();
    if (draggedDeal && draggedDeal.stage !== newStage) {
      updateDealStage(draggedDeal.id, newStage, draggedDeal.stage);
    }
    setDraggedDeal(null);
  }

  const filteredDeals = deals.filter((deal) =>
    deal.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDealsByStage = (stageId: string) =>
    filteredDeals.filter((deal) => deal.stage === stageId);

  const getTotalValue = (stageId: string) =>
    getDealsByStage(stageId).reduce((sum, deal) => sum + (deal.value || 0), 0);

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
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Deal title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value ($)</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Close Date</Label>
                  <Input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_close_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Create Deal
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          const totalValue = getTotalValue(stage.id);

          return (
            <div
              key={stage.id}
              className={cn("rounded-lg border-2 p-4", stage.color)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="mb-3">
                <h3 className="font-semibold text-sm mb-1">{stage.label}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{stageDeals.length} deals</span>
                  <span className="flex items-center gap-0.5">
                    <DollarSign className="h-3 w-3" />
                    {totalValue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {stageDeals.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      draggable
                      onDragStart={() => handleDragStart(deal)}
                      className="cursor-move hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                          {deal.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-1">
                        {deal.value && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">
                              {deal.value.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {deal.expected_close_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(deal.expected_close_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Deals</p>
          <p className="text-2xl font-bold">{filteredDeals.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pipeline Value</p>
          <p className="text-2xl font-bold">
            ${filteredDeals.reduce((sum, deal) => sum + (deal.value || 0), 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Won Deals</p>
          <p className="text-2xl font-bold text-green-600">
            {getDealsByStage("closed_won").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold">
            {filteredDeals.length > 0
              ? Math.round((getDealsByStage("closed_won").length / filteredDeals.length) * 100)
              : 0}
            %
          </p>
        </Card>
      </div>
    </div>
  );
}
