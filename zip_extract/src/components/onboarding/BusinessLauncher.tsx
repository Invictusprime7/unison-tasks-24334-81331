import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  X,
  Loader2,
  FileText,
  Zap,
  Settings,
  Building2,
  Scissors,
  Utensils,
  ShoppingBag,
  Palette,
  Users,
  Home,
  Heart
} from "lucide-react";

// Industry chip configurations
const industryChips = [
  { id: "local_service", label: "Local Service", icon: Settings, examples: "Plumber, Electrician, Cleaner" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, examples: "Hair, Nails, Massage" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, examples: "Cafe, Bakery, Food Truck" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, examples: "Online Store, Boutique" },
  { id: "creator_portfolio", label: "Creator", icon: Palette, examples: "Designer, Photographer" },
  { id: "coaching_consulting", label: "Coaching", icon: Users, examples: "Coach, Consultant, Trainer" },
  { id: "real_estate", label: "Real Estate", icon: Home, examples: "Agent, Property Manager" },
  { id: "nonprofit", label: "Nonprofit", icon: Heart, examples: "Charity, Foundation" },
];

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: "boolean" | "text" | "select";
  default?: unknown;
  options?: string[];
}

interface ClassifyResponse {
  industry: string;
  business_model: string;
  confidence: number;
  clarifying_questions: ClarifyingQuestion[];
  extracted?: {
    business_name?: string;
    location?: string;
    services?: string[];
  };
}

interface PreviewSummary {
  pages: string[];
  intents: string[];
  automations: string[];
}

interface CompileResponse {
  blueprint: unknown;
  preview_summary: PreviewSummary;
}

type FlowStep = "prompt" | "clarify" | "preview" | "building" | "complete";

interface BusinessLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessLauncher({ open, onOpenChange }: BusinessLauncherProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Flow state
  const [step, setStep] = useState<FlowStep>("prompt");
  const [prompt, setPrompt] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Classify response
  const [classifyResult, setClassifyResult] = useState<ClassifyResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  
  // Compile response
  const [blueprint, setBlueprint] = useState<unknown>(null);
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null);
  
  // Building progress
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatus, setBuildStatus] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  const resetFlow = useCallback(() => {
    setStep("prompt");
    setPrompt("");
    setSelectedChip(null);
    setClassifyResult(null);
    setAnswers({});
    setBlueprint(null);
    setPreviewSummary(null);
    setBuildProgress(0);
    setBuildStatus("");
    setProjectId(null);
  }, []);

  const handleClose = useCallback(() => {
    resetFlow();
    onOpenChange(false);
  }, [resetFlow, onOpenChange]);

  const handleChipClick = (chipId: string) => {
    setSelectedChip(chipId);
    const chip = industryChips.find(c => c.id === chipId);
    if (chip) {
      setPrompt(prev => prev ? `${prev} (${chip.label})` : `I need a website for my ${chip.label.toLowerCase()} business`);
    }
  };

  const handleClassify = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please describe your business", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // For demo/development, use local classification
      if (!isSupabaseConfigured || !session) {
        // Simulate classification locally
        const mockResult: ClassifyResponse = simulateClassify(prompt);
        setClassifyResult(mockResult);
        
        // Initialize answers with defaults
        const defaultAnswers: Record<string, unknown> = {};
        mockResult.clarifying_questions.forEach(q => {
          if (q.default !== undefined) {
            defaultAnswers[q.id] = q.default;
          }
        });
        setAnswers(defaultAnswers);
        
        //  If no questions or confidence is high, skip to compile
        if (mockResult.clarifying_questions.length === 0 || mockResult.confidence > 0.9) {
          await handleCompile(mockResult, defaultAnswers);
        } else {
          setStep("clarify");
        }
        return;
      }

      // Call the classify endpoint
      const response = await supabase.functions.invoke("systems-classify", {
        body: { prompt, context: { locale: "en-US" } },
      });

      if (response.error) throw response.error;
      
      const result = response.data as ClassifyResponse;
      setClassifyResult(result);
      
      // Initialize answers with defaults
      const defaultAnswers: Record<string, unknown> = {};
      result.clarifying_questions.forEach(q => {
        if (q.default !== undefined) {
          defaultAnswers[q.id] = q.default;
        }
      });
      setAnswers(defaultAnswers);
      
      // If no questions or confidence is very high, skip to compile
      if (result.clarifying_questions.length === 0 || result.confidence > 0.9) {
        await handleCompile(result, defaultAnswers);
      } else {
        setStep("clarify");
      }
    } catch (error) {
      console.error("Classification error:", error);
      toast({ title: "Failed to analyze business", description: "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompile = async (classifyData?: ClassifyResponse, answerData?: Record<string, unknown>) => {
    setIsLoading(true);
    
    const finalClassify = classifyData || classifyResult;
    const finalAnswers = answerData || answers;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // For demo/development
      if (!isSupabaseConfigured || !session) {
        const mockCompile = simulateCompile(prompt, finalClassify, finalAnswers);
        setBlueprint(mockCompile.blueprint);
        setPreviewSummary(mockCompile.preview_summary);
        setStep("preview");
        return;
      }

      const response = await supabase.functions.invoke("systems-compile", {
        body: {
          prompt,
          answers: finalAnswers,
          constraints: {
            preferred_template_style: "modern_clean",
            primary_goal: "get_bookings",
            content_tone: "confident_friendly",
          },
        },
      });

      if (response.error) throw response.error;
      
      const result = response.data as CompileResponse;
      setBlueprint(result.blueprint);
      setPreviewSummary(result.preview_summary);
      setStep("preview");
    } catch (error) {
      console.error("Compile error:", error);
      toast({ title: "Failed to generate blueprint", description: "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuild = async () => {
    setStep("building");
    setBuildProgress(0);
    setBuildStatus("Initializing...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to auth, then come back
        toast({ title: "Please sign in to build your project" });
        navigate("/auth", { state: { returnTo: "/", launchData: { prompt, blueprint } } });
        return;
      }

      // Simulate progress for UX
      const progressSteps = [
        { progress: 15, status: "Creating your business..." },
        { progress: 30, status: "Setting up CRM..." },
        { progress: 50, status: "Generating pages..." },
        { progress: 70, status: "Wiring buttons & forms..." },
        { progress: 85, status: "Activating automations..." },
        { progress: 95, status: "Final touches..." },
      ];

      for (const step of progressSteps) {
        setBuildProgress(step.progress);
        setBuildStatus(step.status);
        await new Promise(r => setTimeout(r, 600));
      }

      // Call provision endpoint
      const response = await supabase.functions.invoke("builder-provision", {
        body: {
          owner_id: session.user.id,
          blueprint,
          options: {
            create_demo_content: true,
            provision_mode: "shadow_automations",
          },
        },
      });

      if (response.error) throw response.error;
      
      setBuildProgress(100);
      setBuildStatus("Complete!");
      setProjectId(response.data.project_id);
      setStep("complete");
    } catch (error) {
      console.error("Build error:", error);
      toast({ title: "Failed to build project", description: "Please try again", variant: "destructive" });
      setStep("preview");
    }
  };

  const handleOpenBuilder = () => {
    if (projectId) {
      navigate(`/web-builder?id=${projectId}`);
      handleClose();
    }
  };

  // Mock functions for demo/development
  const simulateClassify = (prompt: string): ClassifyResponse => {
    const promptLower = prompt.toLowerCase();
    
    let industry = "local_service";
    let businessModel = "lead_generation";
    let confidence = 0.7;
    
    if (/salon|spa|hair|barber|nail|beauty|massage/.test(promptLower)) {
      industry = "salon_spa";
      businessModel = "appointment_service";
      confidence = 0.85;
    } else if (/restaurant|cafe|coffee|bakery|pizza|food/.test(promptLower)) {
      industry = "restaurant";
      businessModel = "appointment_service";
      confidence = 0.85;
    } else if (/shop|store|sell|ecommerce|retail/.test(promptLower)) {
      industry = "ecommerce";
      businessModel = "product_sales";
      confidence = 0.85;
    } else if (/coach|consult|mentor|trainer/.test(promptLower)) {
      industry = "coaching_consulting";
      businessModel = "appointment_service";
      confidence = 0.85;
    } else if (/portfolio|creative|designer|photographer/.test(promptLower)) {
      industry = "creator_portfolio";
      businessModel = "lead_generation";
      confidence = 0.85;
    } else if (/real estate|realtor|property/.test(promptLower)) {
      industry = "real_estate";
      businessModel = "appointment_service";
      confidence = 0.85;
    }
    
    // Extract business name
    let businessName: string | undefined;
    const quotedMatch = prompt.match(/["']([^"']+)["']/);
    const calledMatch = prompt.match(/called\s+([A-Z][A-Za-z\s&']+)/i);
    if (quotedMatch) businessName = quotedMatch[1];
    else if (calledMatch) businessName = calledMatch[1];
    
    const questions: ClarifyingQuestion[] = [];
    
    if (industry === "local_service" || industry === "salon_spa" || industry === "coaching_consulting") {
      questions.push({
        id: "booking_required",
        question: "Do you want customers to book appointments online?",
        type: "boolean",
        default: true,
      });
    }
    
    if (industry === "local_service") {
      questions.push({
        id: "quotes_enabled",
        question: "Do you provide quotes or estimates?",
        type: "boolean",
        default: true,
      });
    }
    
    if (industry === "restaurant") {
      questions.push({
        id: "reservations_enabled",
        question: "Do you accept table reservations?",
        type: "boolean",
        default: true,
      });
    }
    
    return {
      industry,
      business_model: businessModel,
      confidence,
      clarifying_questions: questions,
      extracted: { business_name: businessName },
    };
  };

  const simulateCompile = (
    prompt: string, 
    classify: ClassifyResponse | null, 
    answers: Record<string, unknown>
  ): CompileResponse => {
    const industry = classify?.industry || "local_service";
    const businessName = classify?.extracted?.business_name || "My Business";
    
    // Determine pages based on industry
    let pages = ["Home", "About", "Contact"];
    let intents = ["lead.capture", "contact.submit"];
    let automations = ["Lead Follow-up"];
    
    if (answers.booking_required || answers.reservations_enabled) {
      pages.splice(2, 0, "Book Now");
      intents.push("booking.create");
      automations.push("Booking Confirmation");
    }
    
    if (industry === "salon_spa") {
      pages = ["Home", "Services", "Pricing", "Book Appointment", "Contact"];
      intents = ["lead.capture", "booking.create", "call.now"];
      automations = ["Appointment Confirmation", "Lead Follow-up"];
    } else if (industry === "restaurant") {
      pages = ["Home", "Menu", "Reservations", "Contact"];
      intents = ["booking.create", "call.now"];
      automations = ["Reservation Confirmation"];
    } else if (industry === "ecommerce") {
      pages = ["Home", "Shop", "Cart", "About", "Contact"];
      intents = ["shop.add_to_cart", "shop.checkout", "newsletter.subscribe"];
      automations = ["Order Confirmation", "Newsletter Welcome"];
    }
    
    return {
      blueprint: {
        version: "1.0.0",
        identity: { industry, business_model: classify?.business_model || "lead_generation" },
        brand: { business_name: businessName },
        site: { pages: pages.map(p => ({ title: p })) },
        intents: intents.map(i => ({ intent: i })),
        automations: { rules: automations.map(a => ({ name: a })) },
      },
      preview_summary: {
        pages,
        intents,
        automations,
      },
    };
  };

  const renderPromptStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Describe your business</h2>
        <p className="text-muted-foreground">Tell us about your business and we'll build a working system for you.</p>
      </div>
      
      <div className="relative">
        <Input
          placeholder="e.g., Mobile car detailing in Chicago. I want booking and quotes."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleClassify()}
          className="pr-12 py-6 text-lg"
        />
        <Button 
          size="icon" 
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleClassify}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">Or choose a category:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {industryChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                onClick={() => handleChipClick(chip.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                  selectedChip === chip.id 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background hover:bg-muted border-border hover:border-primary/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderClarifyStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setStep("prompt")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Quick questions</h2>
          <p className="text-sm text-muted-foreground">Help us customize your system</p>
        </div>
      </div>
      
      {classifyResult?.extracted?.business_name && (
        <Badge variant="secondary" className="w-full justify-center py-2">
          <Building2 className="h-4 w-4 mr-2" />
          {classifyResult.extracted.business_name}
        </Badge>
      )}
      
      <div className="space-y-4">
        {classifyResult?.clarifying_questions.map((q) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{q.question}</p>
                {q.type === "boolean" && (
                  <div className="flex gap-2">
                    <Button
                      variant={answers[q.id] === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: true }))}
                    >
                      <Check className="h-4 w-4 mr-1" /> Yes
                    </Button>
                    <Button
                      variant={answers[q.id] === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: false }))}
                    >
                      <X className="h-4 w-4 mr-1" /> No
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button className="w-full" onClick={() => handleCompile()} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setStep(classifyResult?.clarifying_questions.length ? "clarify" : "prompt")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Your system includes</h2>
          <p className="text-sm text-muted-foreground">Review what we'll build for you</p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {/* Pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Pages
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {previewSummary?.pages.map((page) => (
                <Badge key={page} variant="secondary">{page}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Buttons/Intents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Wired Buttons
            </CardTitle>
            <CardDescription className="text-xs">These work automatically</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {previewSummary?.intents.map((intent) => (
                <Badge key={intent} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {formatIntent(intent)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Automations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Automations
            </CardTitle>
            <CardDescription className="text-xs">Running in shadow mode until you connect email</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {previewSummary?.automations.map((auto) => (
                <Badge key={auto} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {auto}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Button className="w-full" size="lg" onClick={handleBuild}>
        <Sparkles className="h-4 w-4 mr-2" />
        Build My Business
      </Button>
    </div>
  );

  const renderBuildingStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div 
          className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ animationDuration: '1s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-2">Building your system</h2>
        <p className="text-muted-foreground">{buildStatus}</p>
      </div>
      
      <Progress value={buildProgress} className="w-full" />
      
      <div className="text-sm text-muted-foreground space-y-1">
        {buildProgress >= 15 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Business created</p>}
        {buildProgress >= 30 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> CRM configured</p>}
        {buildProgress >= 50 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Pages generated</p>}
        {buildProgress >= 70 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Buttons wired</p>}
        {buildProgress >= 85 && <p className="flex items-center justify-center gap-2"><Check className="h-4 w-4 text-green-500" /> Automations active</p>}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
        <Check className="h-10 w-10 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Your system is ready!</h2>
        <p className="text-muted-foreground">Everything is set up and working. Open the builder to customize your site.</p>
      </div>
      
      <div className="space-y-3">
        <Button className="w-full" size="lg" onClick={handleOpenBuilder}>
          Open in Builder
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button variant="outline" className="w-full" onClick={handleClose}>
          Close
        </Button>
      </div>
    </div>
  );

  const formatIntent = (intent: string): string => {
    const map: Record<string, string> = {
      "lead.capture": "Get Quote",
      "booking.create": "Book Now",
      "contact.submit": "Contact Us",
      "call.now": "Call Now",
      "newsletter.subscribe": "Subscribe",
      "shop.add_to_cart": "Add to Cart",
      "shop.checkout": "Checkout",
    };
    return map[intent] || intent.replace(".", " ").replace(/_/g, " ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Launch Your Business</DialogTitle>
          <DialogDescription>Create a working business system in minutes</DialogDescription>
        </DialogHeader>
        
        {step === "prompt" && renderPromptStep()}
        {step === "clarify" && renderClarifyStep()}
        {step === "preview" && renderPreviewStep()}
        {step === "building" && renderBuildingStep()}
        {step === "complete" && renderCompleteStep()}
      </DialogContent>
    </Dialog>
  );
}

export default BusinessLauncher;
