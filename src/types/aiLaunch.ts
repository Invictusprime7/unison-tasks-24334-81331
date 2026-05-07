/**
 * AILaunchBrief — structured launch contract produced by the homepage AI chat
 * and consumed by launchSiteEngine. This is the AI-native replacement for the
 * step-by-step wizard's manual selections.
 *
 * The chat extracts a brief from natural-language input. The engine then maps
 * the brief into WizardSelections and runs the canonical pipeline. This keeps
 * the AI front door but reuses the deterministic Wizard backend shell.
 */

import type { BusinessSystemType } from "@/data/templates/types";

export type AILaunchStage =
  | "idle"
  | "extracting"
  | "asking_questions"
  | "ready_to_launch"
  | "generating"
  | "opening_builder"
  | "error";

export type AILaunchPrimaryGoal =
  | "collect_leads"
  | "book_appointments"
  | "sell_offers"
  | "showcase_work"
  | "drive_calls"
  | "grow_email_list";

export interface AILaunchBrief {
  rawPrompt: string;

  businessName: string;
  industry: string; // canonical industry slug (e.g. "salon", "local-service")
  systemType: BusinessSystemType;

  primaryGoal: AILaunchPrimaryGoal;
  secondaryGoals: string[];

  selectedPages: string[];

  needsBooking: boolean;
  sellsProducts: boolean;
  wantsLeadCapture: boolean;

  templateId?: string;
  templateCategory?: string;
  themeId?: string;

  location?: string;
  services?: string[];
  offers?: string[];
  targetAudience?: string;

  /** AI's confidence (0..1) in the extracted brief */
  confidence: number;
  /** Field IDs the chat should still ask the user about */
  missingFields: string[];
}

export interface AILaunchIntakeResponse {
  reply: string;
  brief: AILaunchBrief;
  nextQuestions: string[];
  readyToLaunch: boolean;
}

export interface AILaunchProgress {
  stage: AILaunchStage;
  /** Human-readable progress label, e.g. "Planning pages" */
  label?: string;
  /** Optional 0..1 progress hint */
  progress?: number;
}
