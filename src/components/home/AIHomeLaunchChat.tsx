/**
 * AIHomeLaunchChat — chat-first homepage launch surface.
 *
 * Flow:
 *   user describes business → ai-launch-intake → AILaunchBrief card
 *   → "Launch Website" → launchSiteEngine → navigate to /web-builder
 *
 * Stays UI-only: all backend orchestration lives in launchSiteEngine.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, ArrowRight, Check, Send, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLaunch } from "@/contexts/useLaunchHooks";
import { launchSiteEngine, aiLaunchBriefToLaunchInput } from "@/services/launchSiteEngine";
import type { AILaunchBrief, AILaunchProgress, AILaunchStage } from "@/types/aiLaunch";

interface AIHomeLaunchChatProps {
  user: User | null;
  onAuthRequired: () => void;
}

const QUICK_CHIPS: { label: string; prompt: string }[] = [
  { label: "💇 Salon", prompt: "I run a hair salon and want clients to book appointments online with a gallery." },
  { label: "🔧 Local service", prompt: "I run a mobile car detailing business; I need bookings, service packages and quote requests." },
  { label: "🎯 Coaching", prompt: "I'm a business coach selling 1:1 sessions and group programs; collect leads and book discovery calls." },
  { label: "🛍️ Store", prompt: "I sell handmade jewelry online and want a storefront with product pages and checkout." },
  { label: "🎨 Portfolio", prompt: "I'm a photographer; showcase my portfolio, gallery, and inquiry form." },
];

const STAGE_LABEL: Record<AILaunchStage, string> = {
  idle: "",
  extracting: "Understanding your business…",
  asking_questions: "Need a couple of details…",
  ready_to_launch: "Ready to launch",
  generating: "Generating your site…",
  opening_builder: "Opening builder…",
  error: "Something went wrong",
};

export const AIHomeLaunchChat = ({ user, onAuthRequired }: AIHomeLaunchChatProps) => {
  const navigate = useNavigate();
  const { setLaunch } = useLaunch();

  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [brief, setBrief] = useState<AILaunchBrief | null>(null);
  const [reply, setReply] = useState<string>("");
  const [nextQuestions, setNextQuestions] = useState<string[]>([]);
  const [stage, setStage] = useState<AILaunchStage>("idle");
  const [stageLabel, setStageLabel] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleProgress = (p: AILaunchProgress) => {
    setStage(p.stage);
    setStageLabel(p.label || STAGE_LABEL[p.stage]);
  };

  const runIntake = async (userPrompt: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }
    setIsExtracting(true);
    setStage("extracting");
    setStageLabel(STAGE_LABEL.extracting);
    try {
      const newHistory = [...history, { role: "user" as const, content: userPrompt }];
      const { data, error } = await supabase.functions.invoke("ai-launch-intake", {
        body: { prompt: userPrompt, history },
      });
      if (error) throw error;

      const result = data as {
        reply: string;
        brief: AILaunchBrief;
        nextQuestions: string[];
        readyToLaunch: boolean;
      };

      setBrief(result.brief);
      setReply(result.reply);
      setNextQuestions(result.nextQuestions || []);
      setHistory([...newHistory, { role: "assistant", content: result.reply }]);
      setStage(result.readyToLaunch ? "ready_to_launch" : "asking_questions");
      setStageLabel(STAGE_LABEL[result.readyToLaunch ? "ready_to_launch" : "asking_questions"]);
      setPrompt("");
    } catch (e: any) {
      console.error("[AIHomeLaunchChat] intake error", e);
      toast.error(e?.message || "Couldn't understand the prompt. Try again.");
      setStage("error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLaunch = async () => {
    if (!brief) return;
    if (!user) {
      onAuthRequired();
      return;
    }
    if (!brief.businessName.trim()) {
      toast.error("Please add your business name to continue");
      return;
    }
    try {
      setStage("generating");
      setStageLabel(STAGE_LABEL.generating);
      const input = aiLaunchBriefToLaunchInput(brief, "homepage-ai", handleProgress);
      const { launchState, navigationState } = await launchSiteEngine(input);
      setLaunch(launchState);
      toast.success("Site ready! Opening builder…");
      navigate("/web-builder", { state: navigationState });
    } catch (e: any) {
      const code = e?.code;
      if (code === "AUTH_REQUIRED") {
        onAuthRequired();
      } else if (code === "RATE_LIMITED") {
        toast.error("AI is rate-limited. Please wait a moment and try again.");
      } else if (code === "PAYMENT_REQUIRED") {
        toast.error("AI credits required. Please add credits to continue.");
      } else {
        toast.error(e?.message || "Launch failed");
      }
      setStage("error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isExtracting) return;
    runIntake(prompt.trim());
  };

  const handleChipClick = (chipPrompt: string) => {
    setPrompt(chipPrompt);
    textareaRef.current?.focus();
  };

  const updateBriefName = (name: string) => {
    if (!brief) return;
    setBrief({
      ...brief,
      businessName: name,
      missingFields: brief.missingFields.filter((f) => f !== "businessName"),
    });
  };

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-[#0a0a12] relative overflow-hidden">
      {/* Glow backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-500/[0.05] rounded-full blur-[140px]" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
            <Sparkles className="h-3 w-3" />
            <span>AI Launch — beta</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Tell us what business you're launching
          </h2>
          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto">
            Describe your business in your own words. We'll plan the pages, wire the backend, and open the builder.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto bg-white/[0.02] border-white/[0.06] backdrop-blur-sm">
          {/* Prompt input */}
          {!brief && (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. I run a hair salon in Brooklyn — clients book online, browse stylists, and see a portfolio gallery."
                rows={4}
                disabled={isExtracting}
                className="bg-[#07080F] border-white/[0.08] text-white placeholder:text-white/25 resize-none focus-visible:ring-cyan-500/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as any);
                }}
              />

              <div className="flex flex-wrap gap-1.5 mt-3">
                {QUICK_CHIPS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => handleChipClick(c.prompt)}
                    disabled={isExtracting}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/55 hover:text-white hover:border-cyan-500/30 transition-colors"
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-[11px] text-white/30">⌘/Ctrl + Enter to send</p>
                <Button
                  type="submit"
                  disabled={!prompt.trim() || isExtracting}
                  className="bg-cyan-500 text-[#07080F] hover:bg-cyan-400 font-semibold disabled:opacity-40"
                >
                  {isExtracting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Understanding…</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Generate launch plan</>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Launch Brief card */}
          <AnimatePresence>
            {brief && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 sm:p-6"
              >
                {reply && (
                  <p className="text-sm text-white/70 mb-4 italic">"{reply}"</p>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Detected Launch Plan</h3>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-white/30">
                    Confidence {Math.round(brief.confidence * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <BriefRow label="Industry" value={brief.industry} />
                  <BriefRow label="System" value={brief.systemType} />
                  <BriefRow label="Primary goal" value={brief.primaryGoal.replace(/_/g, " ")} />
                  <BriefRow label="Pages" value={brief.selectedPages.join(" · ") || "—"} />
                </div>

                {brief.missingFields.includes("businessName") ? (
                  <div className="mb-4">
                    <label className="block text-xs text-white/50 mb-1.5">Business name</label>
                    <Input
                      value={brief.businessName}
                      onChange={(e) => updateBriefName(e.target.value)}
                      placeholder="e.g. Halo Hair Studio"
                      className="bg-[#07080F] border-white/[0.08] text-white"
                    />
                  </div>
                ) : (
                  <BriefRow label="Business name" value={brief.businessName} className="mb-4" />
                )}

                {nextQuestions.length > 0 && stage === "asking_questions" && (
                  <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Want to refine?</p>
                    <ul className="space-y-1.5">
                      {nextQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-white/70">• {q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {stageLabel && stage !== "ready_to_launch" && stage !== "asking_questions" && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-cyan-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{stageLabel}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Button
                    onClick={handleLaunch}
                    disabled={
                      stage === "generating" ||
                      stage === "opening_builder" ||
                      !brief.businessName.trim()
                    }
                    className="bg-cyan-500 text-[#07080F] hover:bg-cyan-400 font-semibold disabled:opacity-40"
                  >
                    {stage === "generating" || stage === "opening_builder" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Launching…</>
                    ) : (
                      <><Check className="mr-2 h-4 w-4" /> Launch Website</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setBrief(null);
                      setReply("");
                      setNextQuestions([]);
                      setStage("idle");
                      setStageLabel("");
                    }}
                    className="text-white/50 hover:text-white hover:bg-white/[0.04]"
                  >
                    Start over
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </section>
  );
};

function BriefRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]", className)}>
      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className="text-sm text-white/85 capitalize">{value}</p>
    </div>
  );
}

export default AIHomeLaunchChat;
