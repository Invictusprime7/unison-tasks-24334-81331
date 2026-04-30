/**
 * Business OS Packs — Industry-specific module + recipe presets that augment a
 * BusinessBlueprint at install time.
 *
 * A pack does NOT replace the blueprint. It declares which modules to enable,
 * a CRM pipeline preset, and a setup-task list. The installer (installBusinessOSPack)
 * applies these on top of `createBusinessOSProfileFromBlueprint`.
 */

import type { BusinessOSModuleId } from "@/types/businessOS";

export interface BusinessOSPack {
  id: string;
  label: string;
  industry: string;
  systemType: string;
  description: string;
  modules: BusinessOSModuleId[];
  funnels: Array<{
    id: string;
    name: string;
    goal: "lead_capture" | "booking" | "purchase" | "quote_request";
    steps: string[];
  }>;
  crm: {
    pipelineName: string;
    stages: string[];
    defaultStage: string;
  };
  automations: Array<{
    id: string;
    label: string;
    trigger: string;
    actions: string[];
  }>;
  setupTasks: Array<{
    id: string;
    label: string;
    module: BusinessOSModuleId;
    required: boolean;
  }>;
}

export const contractorPack: BusinessOSPack = {
  id: "contractor_growth",
  label: "Contractor Growth OS",
  industry: "contractor",
  systemType: "appointment_service",
  description: "Quote-driven local-service business with CRM pipeline and review automation.",
  modules: ["website", "pages", "funnels", "forms", "crm", "pipeline", "automations", "inbox", "reviews", "analytics", "settings"],
  funnels: [
    {
      id: "quote_funnel",
      name: "Quote Request",
      goal: "quote_request",
      steps: ["landing", "quote_form", "thank_you", "review_request"],
    },
  ],
  crm: {
    pipelineName: "Contractor Pipeline",
    stages: ["New Lead", "Qualified", "Quote Sent", "Won", "Lost"],
    defaultStage: "New Lead",
  },
  automations: [
    { id: "quote_followup", label: "Quote follow-up", trigger: "quote.request", actions: ["send_email"] },
    { id: "review_request", label: "Review request", trigger: "lead.won", actions: ["send_email"] },
    { id: "missed_call_text", label: "Missed-call text-back", trigger: "call.missed", actions: ["send_sms"] },
  ],
  setupTasks: [
    { id: "notification_email", label: "Confirm notification email", module: "settings", required: true },
    { id: "service_areas", label: "Add service areas", module: "settings", required: false },
  ],
};

export const salonPack: BusinessOSPack = {
  id: "salon_rebooking",
  label: "Salon Rebooking OS",
  industry: "salon",
  systemType: "appointment_service",
  description: "Appointment-first business with rebooking reminders and review capture.",
  modules: ["website", "pages", "funnels", "bookings", "crm", "pipeline", "automations", "reviews", "analytics", "settings"],
  funnels: [
    {
      id: "booking_funnel",
      name: "Book Appointment",
      goal: "booking",
      steps: ["landing", "services", "booking", "confirmation"],
    },
  ],
  crm: {
    pipelineName: "Client Pipeline",
    stages: ["New", "Booked", "Completed", "Rebooked", "Lapsed"],
    defaultStage: "New",
  },
  automations: [
    { id: "booking_reminder", label: "Booking reminder", trigger: "booking.confirmed", actions: ["send_sms"] },
    { id: "rebooking", label: "Rebooking nudge", trigger: "booking.completed", actions: ["send_email"] },
    { id: "review_request", label: "Review request", trigger: "booking.completed", actions: ["send_email"] },
  ],
  setupTasks: [
    { id: "calendar_availability", label: "Add booking availability", module: "bookings", required: true },
    { id: "deposit_policy", label: "Set deposit policy", module: "payments", required: false },
  ],
};

export const creatorPack: BusinessOSPack = {
  id: "creator_welcome",
  label: "Creator Welcome OS",
  industry: "creator",
  systemType: "portfolio_creator",
  description: "Portfolio + newsletter funnel for solo creators and coaches.",
  modules: ["website", "pages", "funnels", "forms", "crm", "automations", "analytics", "settings"],
  funnels: [
    {
      id: "newsletter_funnel",
      name: "Newsletter Welcome",
      goal: "lead_capture",
      steps: ["landing", "newsletter_form", "thank_you"],
    },
  ],
  crm: {
    pipelineName: "Audience Pipeline",
    stages: ["Subscriber", "Engaged", "Buyer"],
    defaultStage: "Subscriber",
  },
  automations: [
    { id: "welcome_email", label: "Welcome email", trigger: "newsletter.subscribe", actions: ["send_email"] },
  ],
  setupTasks: [
    { id: "branding", label: "Upload logo + brand colors", module: "settings", required: false },
  ],
};

export const restaurantPack: BusinessOSPack = {
  id: "restaurant_reservation",
  label: "Restaurant Reservation OS",
  industry: "restaurant",
  systemType: "restaurant_hospitality",
  description: "Reservation-first hospitality OS with confirmation and review flows.",
  modules: ["website", "pages", "funnels", "bookings", "crm", "automations", "reviews", "analytics", "settings"],
  funnels: [
    {
      id: "reservation_funnel",
      name: "Reservation",
      goal: "booking",
      steps: ["landing", "menu", "reservation", "confirmation"],
    },
  ],
  crm: {
    pipelineName: "Guest Pipeline",
    stages: ["New", "Reserved", "Visited", "Repeat"],
    defaultStage: "New",
  },
  automations: [
    { id: "reservation_confirmation", label: "Reservation confirmation", trigger: "booking.confirmed", actions: ["send_email"] },
    { id: "review_request", label: "Review request", trigger: "booking.completed", actions: ["send_email"] },
  ],
  setupTasks: [
    { id: "hours", label: "Add operating hours", module: "settings", required: true },
    { id: "menu", label: "Upload menu", module: "settings", required: false },
  ],
};

export const BUSINESS_OS_PACKS: Record<string, BusinessOSPack> = {
  [contractorPack.id]: contractorPack,
  [salonPack.id]: salonPack,
  [creatorPack.id]: creatorPack,
  [restaurantPack.id]: restaurantPack,
};

/** Resolve a pack from an industry slug. Returns undefined if no pack matches. */
export function resolvePackForIndustry(industry: string): BusinessOSPack | undefined {
  const lower = (industry || "").toLowerCase();
  for (const pack of Object.values(BUSINESS_OS_PACKS)) {
    if (pack.industry === lower) return pack;
  }
  return undefined;
}
