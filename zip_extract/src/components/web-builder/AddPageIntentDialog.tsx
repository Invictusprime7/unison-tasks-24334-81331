import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, FileText, Calendar, ShoppingBag, Mail, HelpCircle, Users, Image, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Industry } from "@/schemas/BusinessBlueprint";

/**
 * =========================================
 * AddPageIntent Component
 * "Add Page should ask for intent, not layout"
 * =========================================
 */

interface PageIntentOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  industries: Industry[] | "all";
}

const PAGE_INTENTS: PageIntentOption[] = [
  {
    id: "booking.start",
    label: "Booking / Appointments",
    description: "Let customers book services or appointments",
    icon: Calendar,
    industries: ["salon_spa", "restaurant", "coaching_consulting", "local_service"],
  },
  {
    id: "services.browse",
    label: "Services / Programs",
    description: "Showcase what you offer with pricing",
    icon: FileText,
    industries: ["salon_spa", "local_service", "coaching_consulting"],
  },
  {
    id: "shop.browse",
    label: "Shop / Products",
    description: "Display products for purchase",
    icon: ShoppingBag,
    industries: ["ecommerce"],
  },
  {
    id: "menu.view",
    label: "Menu",
    description: "Display food/drink menu with categories",
    icon: FileText,
    industries: ["restaurant"],
  },
  {
    id: "gallery.view",
    label: "Gallery / Portfolio",
    description: "Showcase your work with images",
    icon: Image,
    industries: "all",
  },
  {
    id: "team.view",
    label: "Team / About Us",
    description: "Introduce your team members",
    icon: Users,
    industries: "all",
  },
  {
    id: "pricing.view",
    label: "Pricing",
    description: "Display pricing plans or packages",
    icon: DollarSign,
    industries: "all",
  },
  {
    id: "faq.view",
    label: "FAQ",
    description: "Answer common questions",
    icon: HelpCircle,
    industries: "all",
  },
  {
    id: "contact.view",
    label: "Contact",
    description: "Contact form, map, and business info",
    icon: Mail,
    industries: "all",
  },
  {
    id: "custom",
    label: "Custom Page",
    description: "Describe what you need in your own words",
    icon: Sparkles,
    industries: "all",
  },
];

interface AddPageIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industry: Industry;
  onSubmit: (data: { intent: string; label: string; path: string; customPrompt?: string }) => Promise<void>;
}

export function AddPageIntentDialog({
  open,
  onOpenChange,
  industry,
  onSubmit,
}: AddPageIntentDialogProps) {
  const [step, setStep] = useState<"intent" | "details">("intent");
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter intents by industry
  const availableIntents = PAGE_INTENTS.filter(intent => 
    intent.industries === "all" || intent.industries.includes(industry)
  );
  
  const handleIntentSelect = useCallback((intentId: string) => {
    setSelectedIntent(intentId);
    
    // Pre-fill label and path from intent
    const intent = PAGE_INTENTS.find(i => i.id === intentId);
    if (intent && intentId !== "custom") {
      setLabel(intent.label.split("/")[0].trim());
      setPath(`/${intentId.split(".")[0].toLowerCase()}`);
    }
    
    if (intentId === "custom") {
      setStep("details");
    } else {
      setStep("details");
    }
  }, []);
  
  const handleBack = useCallback(() => {
    setStep("intent");
    setCustomPrompt("");
  }, []);
  
  const handleSubmit = useCallback(async () => {
    if (!selectedIntent) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        intent: selectedIntent,
        label,
        path: path.startsWith("/") ? path : `/${path}`,
        customPrompt: selectedIntent === "custom" ? customPrompt : undefined,
      });
      
      // Reset state
      setStep("intent");
      setSelectedIntent(null);
      setCustomPrompt("");
      setLabel("");
      setPath("");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to add page:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIntent, label, path, customPrompt, onSubmit, onOpenChange]);
  
  const handleClose = useCallback(() => {
    setStep("intent");
    setSelectedIntent(null);
    setCustomPrompt("");
    setLabel("");
    setPath("");
    onOpenChange(false);
  }, [onOpenChange]);
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "intent" ? "What kind of page do you need?" : "Page Details"}
          </DialogTitle>
        </DialogHeader>
        
        {step === "intent" && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {availableIntents.map((intent) => {
              const Icon = intent.icon;
              return (
                <button
                  key={intent.id}
                  onClick={() => handleIntentSelect(intent.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    selectedIntent === intent.id && "border-primary bg-primary/10"
                  )}
                >
                  <div className="mt-0.5 p-2 rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{intent.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {intent.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {step === "details" && (
          <div className="space-y-4 py-4">
            {selectedIntent === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customPrompt">Describe what you need</Label>
                <Textarea
                  id="customPrompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., I need a page for catering inquiries with a form for event details, date, and guest count..."
                  className="min-h-[100px]"
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">Page Name</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Catering"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="path">URL Path</Label>
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g., /catering"
                />
              </div>
            </div>
            
            {selectedIntent && selectedIntent !== "custom" && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 inline-block mr-2 text-primary" />
                This page will be automatically configured with the right sections and features
                based on your business type.
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          {step === "details" && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
          
          {step === "details" && (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !label || !path || (selectedIntent === "custom" && !customPrompt)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Page
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddPageIntentDialog;
