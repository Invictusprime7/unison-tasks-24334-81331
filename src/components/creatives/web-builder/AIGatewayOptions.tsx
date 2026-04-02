import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Settings2,
  Zap,
  Brain,
  Gauge,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Model definitions matching providerRouter.ts ────────────────────────────

export interface GatewayModel {
  id: string;
  label: string;
  provider: "google" | "openai";
  tier: "lite" | "fast" | "standard" | "pro";
  description: string;
  maxTokens: number;
  supportsReasoning: boolean;
}

const AVAILABLE_MODELS: GatewayModel[] = [
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    provider: "google",
    tier: "lite",
    description: "Fastest. Best for simple edits & classification.",
    maxTokens: 12000,
    supportsReasoning: false,
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    tier: "fast",
    description: "Balanced speed & quality. Default for most tasks.",
    maxTokens: 32000,
    supportsReasoning: true,
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    provider: "google",
    tier: "fast",
    description: "Next-gen speed. Great for iterative edits.",
    maxTokens: 32000,
    supportsReasoning: true,
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    tier: "pro",
    description: "Top-tier reasoning. Complex code & multi-file edits.",
    maxTokens: 32000,
    supportsReasoning: true,
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    provider: "openai",
    tier: "standard",
    description: "Strong reasoning at lower cost. Good all-rounder.",
    maxTokens: 32000,
    supportsReasoning: true,
  },
  {
    id: "openai/gpt-5",
    label: "GPT-5",
    provider: "openai",
    tier: "pro",
    description: "Maximum quality. Best for complex architecture.",
    maxTokens: 32000,
    supportsReasoning: true,
  },
];

export type ReasoningEffort = "none" | "low" | "medium" | "high";

export interface GatewayConfig {
  selectedModelId: string;
  reasoningEffort: ReasoningEffort;
  timeoutMs: number;
  autoModelSelection: boolean;
  streamResponse: boolean;
  maxTokens: number;
}

const DEFAULT_CONFIG: GatewayConfig = {
  selectedModelId: "google/gemini-2.5-flash",
  reasoningEffort: "medium",
  timeoutMs: 25000,
  autoModelSelection: true,
  streamResponse: true,
  maxTokens: 32000,
};

interface AIGatewayOptionsProps {
  config?: GatewayConfig;
  onChange?: (config: GatewayConfig) => void;
  className?: string;
  compact?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  lite: "bg-muted text-muted-foreground",
  fast: "bg-primary/15 text-primary",
  standard: "bg-accent text-accent-foreground",
  pro: "bg-secondary text-secondary-foreground",
};

const REASONING_OPTIONS: { value: ReasoningEffort; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "none", label: "Off", icon: <Zap className="h-3 w-3" />, desc: "No extra reasoning" },
  { value: "low", label: "Light", icon: <Activity className="h-3 w-3" />, desc: "Quick think-through" },
  { value: "medium", label: "Balanced", icon: <Brain className="h-3 w-3" />, desc: "Default reasoning" },
  { value: "high", label: "Deep", icon: <Sparkles className="h-3 w-3" />, desc: "Max reasoning depth" },
];

export const AIGatewayOptions = ({
  config: externalConfig,
  onChange,
  className,
  compact = false,
}: AIGatewayOptionsProps) => {
  const [internalConfig, setInternalConfig] = useState<GatewayConfig>(DEFAULT_CONFIG);
  const [isOpen, setIsOpen] = useState(false);

  const config = externalConfig ?? internalConfig;

  const updateConfig = useCallback(
    (patch: Partial<GatewayConfig>) => {
      const next = { ...config, ...patch };
      if (onChange) {
        onChange(next);
      } else {
        setInternalConfig(next);
      }
    },
    [config, onChange],
  );

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === config.selectedModelId);
  const timeoutSeconds = Math.round(config.timeoutMs / 1000);

  const handleReset = () => {
    updateConfig(DEFAULT_CONFIG);
  };

  // ─── Compact inline variant ──────────────────────────────────────────────
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 gap-1 cursor-default border-border"
              >
                {selectedModel?.provider === "google" ? (
                  <Zap className="h-2.5 w-2.5 text-primary" />
                ) : (
                  <Brain className="h-2.5 w-2.5 text-primary" />
                )}
                {selectedModel?.label ?? "Auto"}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {selectedModel?.description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {config.reasoningEffort !== "none" && (
          <Badge
            variant="secondary"
            className="text-[10px] h-5 px-1.5 gap-1"
          >
            <Brain className="h-2.5 w-2.5" />
            {config.reasoningEffort}
          </Badge>
        )}

        {config.autoModelSelection && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            Auto
          </Badge>
        )}
      </div>
    );
  }

  // ─── Full collapsible panel ──────────────────────────────────────────────
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-between h-8 px-2 text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted/50",
            className,
          )}
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            AI Gateway
            {config.autoModelSelection && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                Auto
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            {selectedModel && (
              <Badge
                variant="outline"
                className={cn("text-[9px] h-4 px-1 border-border", TIER_COLORS[selectedModel.tier])}
              >
                {selectedModel.label}
              </Badge>
            )}
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Card className="mx-1 mt-1 mb-2 border-border bg-card/50">
          <CardContent className="p-3 space-y-4">
            {/* ── Auto Selection Toggle ───────────────────────────────── */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Auto-select model
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Let the task classifier choose the best model
                </p>
              </div>
              <Switch
                checked={config.autoModelSelection}
                onCheckedChange={(v) => updateConfig({ autoModelSelection: v })}
              />
            </div>

            {/* ── Model Selector ──────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Gauge className="h-3 w-3 text-primary" />
                Model
              </Label>
              <Select
                value={config.selectedModelId}
                onValueChange={(v) => {
                  const model = AVAILABLE_MODELS.find((m) => m.id === v);
                  updateConfig({
                    selectedModelId: v,
                    maxTokens: model?.maxTokens ?? 32000,
                  });
                }}
                disabled={config.autoModelSelection}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="py-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-4 px-1 shrink-0",
                            TIER_COLORS[model.tier],
                          )}
                        >
                          {model.tier}
                        </Badge>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{model.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {model.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Reasoning Effort ────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Brain className="h-3 w-3 text-primary" />
                Reasoning effort
              </Label>
              <div className="grid grid-cols-4 gap-1">
                {REASONING_OPTIONS.map((opt) => {
                  const isActive = config.reasoningEffort === opt.value;
                  const isDisabled =
                    !selectedModel?.supportsReasoning && opt.value !== "none";

                  return (
                    <TooltipProvider key={opt.value} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            disabled={isDisabled}
                            onClick={() =>
                              updateConfig({ reasoningEffort: opt.value })
                            }
                            className={cn(
                              "h-7 text-[10px] px-1.5 gap-1",
                              isActive && "bg-primary text-primary-foreground",
                              isDisabled && "opacity-40",
                            )}
                          >
                            {opt.icon}
                            {opt.label}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {isDisabled
                            ? "This model doesn't support reasoning"
                            : opt.desc}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>

            {/* ── Timeout ─────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-primary" />
                  Timeout
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {timeoutSeconds}s
                </span>
              </div>
              <Slider
                min={10000}
                max={60000}
                step={5000}
                value={[config.timeoutMs]}
                onValueChange={([v]) => updateConfig({ timeoutMs: v })}
                className="py-1"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>10s</span>
                <span>60s</span>
              </div>
            </div>

            {/* ── Stream toggle ────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-primary" />
                Stream response
              </Label>
              <Switch
                checked={config.streamResponse}
                onCheckedChange={(v) => updateConfig({ streamResponse: v })}
              />
            </div>

            {/* ── Reset ────────────────────────────────────────────────── */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Reset to defaults
            </Button>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export { AVAILABLE_MODELS, DEFAULT_CONFIG };
