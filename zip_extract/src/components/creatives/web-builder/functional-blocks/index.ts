// Legacy functional blocks
export { ContactForm } from './ContactForm';
export { BookingWidget } from './BookingWidget';
export { PaymentButton } from './PaymentButton';
export { ProductCard } from './ProductCard';
export { ShoppingCart } from './ShoppingCart';
export { OpenStreetMap } from './OpenStreetMap';
export { WorkflowButton } from './WorkflowButton';

// Intent-based functional blocks (LIVE - connected to backend)
export { IntentContactForm } from './IntentContactForm';
export { IntentNewsletterForm } from './IntentNewsletterForm';
export { IntentBookingForm } from './IntentBookingForm';

// Smart template intent components
export { TemplateIntentButton, TemplateIntentForm } from './TemplateIntentButton';

// Re-export intent types and utilities for convenience
export { 
  TEMPLATE_CTA_CONFIGS,
  getCTAConfigForCategory,
  getIntentsForCategory,
  getAllTemplateIntents,
  matchLabelToIntent,
  analyzeTemplateForCTAs,
  type TemplateCategory,
  type IntentConfig,
  type TemplateCTAConfig,
} from '@/runtime/templateIntentConfig';
