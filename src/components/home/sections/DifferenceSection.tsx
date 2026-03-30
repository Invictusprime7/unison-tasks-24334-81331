import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

const INDUSTRY_STATS = [
  { name: "Salon & Spa", templates: 2, premium: true },
  { name: "Restaurant", templates: 2, premium: true },
  { name: "Agency", templates: 2, premium: true },
  { name: "E-commerce", templates: 2, premium: true },
  { name: "Contractor", templates: 2, premium: true },
  { name: "Portfolio", templates: 1, premium: false },
  { name: "Landing", templates: 1, premium: false },
  { name: "Blog", templates: 1, premium: false },
  { name: "Medical", templates: 1, premium: false },
  { name: "SaaS", templates: 1, premium: false },
  { name: "Startup", templates: 1, premium: false },
];

export function DifferenceSection() {
  return (
    <section className="bg-[#0d0d18] py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border border-purple-500/30">Why Unison Tasks</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Two ways to launch. <span className="text-lime-400 drop-shadow-[0_0_20px_rgba(132,204,22,0.5)]">Both work instantly.</span>
            </h2>
            <p className="text-lg text-gray-400">
              Browse handcrafted templates or let AI build from your description — either way, everything is wired.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Path A: Templates */}
            <Card className="border-lime-500/50 bg-lime-500/5 shadow-[0_0_20px_rgba(132,204,22,0.1)]">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layout className="h-5 w-5 text-lime-400" />
                  <h3 className="text-lg text-lime-400 font-semibold">Browse & Launch</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>• Pick from 11 industry-specific templates</p>
                  <p>• Premium tiers with advanced layouts</p>
                  <p>• Apply design presets before install</p>
                  <p>• AI edit surface for pre-launch tweaks</p>
                  <p>• Backend packs auto-provisioned</p>
                </div>
              </div>
            </Card>

            {/* Path B: AI Generate */}
            <Card className="border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-lg text-cyan-400 font-semibold">Describe & Generate</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>• Describe your business in plain English</p>
                  <p>• AI generates full multi-page site</p>
                  <p>• Intent-wired buttons and forms</p>
                  <p>• Industry-aware styling and content</p>
                  <p>• Opens directly in the live builder</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Template Catalog Strip */}
          <div className="rounded-xl border border-white/10 bg-[#12121e] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Template Catalog</h3>
              <span className="text-xs text-muted-foreground">11 industries · standard + premium</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {INDUSTRY_STATS.map((ind) => (
                <div
                  key={ind.name}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-center transition-colors",
                    ind.premium
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-white/5 bg-white/[0.02]"
                  )}
                >
                  <p className="text-xs font-medium text-white">{ind.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">{ind.templates} template{ind.templates > 1 ? 's' : ''}</span>
                    {ind.premium && <Crown className="h-2.5 w-2.5 text-yellow-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
