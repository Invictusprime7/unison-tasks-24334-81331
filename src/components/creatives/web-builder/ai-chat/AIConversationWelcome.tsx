/**
 * AIConversationWelcome — Empty-state welcome screen for AI Builder
 * Modern, conversational onboarding with contextual suggestions.
 */

import React from 'react';
import { Sparkles, Code2, Bug, Paintbrush, Zap, LayoutGrid, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onSelectPrompt: (prompt: string) => void;
  templateName?: string | null;
  className?: string;
}

const SUGGESTION_GROUPS = [
  {
    label: 'Build',
    icon: Code2,
    items: [
      'Add a hero section with a CTA button',
      'Create a pricing table with 3 tiers',
      'Build a testimonials carousel',
    ],
  },
  {
    label: 'Design',
    icon: Paintbrush,
    items: [
      'Make it more modern and minimal',
      'Add smooth scroll animations',
      'Switch to a dark color scheme',
    ],
  },
  {
    label: 'Fix & Optimize',
    icon: Zap,
    items: [
      'Make it fully mobile responsive',
      'Wire up the contact form',
      'Fix layout issues in the navbar',
    ],
  },
];

export const AIConversationWelcome: React.FC<Props> = ({ onSelectPrompt, templateName, className }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-8", className)}>
      {/* Logo / Avatar */}
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center mb-4 shadow-sm">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>

      {/* Greeting */}
      <h3 className="text-base font-semibold text-foreground mb-1">
        Hi, I'm your AI Builder
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-[260px] mb-6 leading-relaxed">
        I can help you build, modify, and debug your site. Just describe what you want.
      </p>

      {/* Suggestion groups */}
      <div className="w-full space-y-3">
        {SUGGESTION_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <group.icon className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                {group.label}
              </span>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item}
                  onClick={() => onSelectPrompt(item)}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border/50 bg-card hover:bg-accent/50 hover:border-border text-foreground/80 hover:text-foreground transition-all duration-150 group"
                >
                  <span className="group-hover:translate-x-0.5 inline-block transition-transform duration-150">
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Context hint */}
      {templateName && (
        <p className="text-[10px] text-muted-foreground/40 mt-4 text-center">
          Working on: {templateName}
        </p>
      )}
    </div>
  );
};
