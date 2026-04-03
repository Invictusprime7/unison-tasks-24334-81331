/**
 * Intent Pipeline Overlay
 * Shows a dynamic overlay when users click template buttons,
 * displaying intent-specific pipelines (booking flow, lead capture, checkout, etc.)
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  User, 
  Clock, 
  ShoppingCart, 
  CreditCard,
  CheckCircle,
  Loader2,
  MessageSquare,
  FileText,
  ArrowRight,
  Phone,
  Mail,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleIntent, IntentPayload, getIntentPack, isDemoModeActive } from '@/runtime/intentRouter';
import { toast } from 'sonner';

export interface PipelineConfig {
  intent: string;
  payload?: IntentPayload;
}

interface IntentPipelineOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  config: PipelineConfig | null;
  onSuccess?: (data: unknown) => void;
}

// Pipeline step definitions by intent pack
interface PipelineStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  fields: PipelineField[];
}

interface PipelineField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'date' | 'time' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

// Get pipeline configuration based on intent
function getPipelineConfig(intent: string): { title: string; description: string; steps: PipelineStep[] } {
  const pack = getIntentPack(intent);

  // SUBSCRIBE / WAITLIST: keep this ultra-light (email only)
  if (intent === 'newsletter.subscribe' || intent === 'join.waitlist') {
    return {
      title: intent === 'newsletter.subscribe' ? 'Subscribe' : 'Join the Waitlist',
      description: intent === 'newsletter.subscribe'
        ? 'Get updates in your inbox.'
        : 'Get early access when we launch.',
      steps: [
        {
          id: 'email',
          title: 'Your Email',
          icon: <Mail className="w-5 h-5" />,
          fields: [
            { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com', required: true },
          ],
        },
      ],
    };
  }
  
  // BOOKING PIPELINES
  if (pack === 'booking' || intent.includes('booking') || intent.includes('calendar') || intent.includes('consultation')) {
    return {
      title: getBookingTitle(intent),
      description: 'Complete your reservation in just a few steps',
      steps: [
        {
          id: 'contact',
          title: 'Your Information',
          icon: <User className="w-5 h-5" />,
          fields: [
            { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com', required: true },
            { name: 'phone', label: 'Phone Number', type: 'phone', placeholder: '+1 (555) 123-4567' },
          ]
        },
        {
          id: 'schedule',
          title: 'Select Date & Time',
          icon: <CalendarIcon className="w-5 h-5" />,
          fields: [
            { name: 'date', label: 'Preferred Date', type: 'date', required: true },
            { name: 'time', label: 'Preferred Time', type: 'time', required: true },
          ]
        },
        {
          id: 'details',
          title: 'Additional Details',
          icon: <MessageSquare className="w-5 h-5" />,
          fields: [
            { name: 'service', label: 'Service Type', type: 'select', options: [
              { value: 'consultation', label: 'Consultation' },
              { value: 'appointment', label: 'Appointment' },
              { value: 'meeting', label: 'Meeting' },
            ]},
            { name: 'notes', label: 'Special Requests', type: 'textarea', placeholder: 'Any special requirements or notes...' },
          ]
        }
      ]
    };
  }
  
  // LEAD CAPTURE PIPELINES
  if (pack === 'leads') {
    return {
      title: getLeadTitle(intent),
      description: getLeadDescription(intent),
      steps: [
        {
          id: 'contact',
          title: 'Contact Information',
          icon: <Mail className="w-5 h-5" />,
          fields: [
            { name: 'name', label: 'Your Name', type: 'text', placeholder: 'Jane Smith', required: true },
            { name: 'email', label: 'Email Address', type: 'email', placeholder: 'jane@company.com', required: true },
            { name: 'phone', label: 'Phone (Optional)', type: 'phone', placeholder: '+1 (555) 987-6543' },
          ]
        },
        {
          id: 'details',
          title: 'Tell Us More',
          icon: <FileText className="w-5 h-5" />,
          fields: getLeadFields(intent),
        }
      ]
    };
  }
  
  // E-COMMERCE PIPELINES
  if (pack === 'ecommerce') {
    return {
      title: getEcommerceTitle(intent),
      description: 'Complete your purchase securely',
      steps: [
        {
          id: 'cart',
          title: 'Your Items',
          icon: <ShoppingCart className="w-5 h-5" />,
          fields: [
            { name: 'quantity', label: 'Quantity', type: 'number', placeholder: '1', required: true },
          ]
        },
        {
          id: 'shipping',
          title: 'Shipping Details',
          icon: <Building className="w-5 h-5" />,
          fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'address', label: 'Address', type: 'text', placeholder: '123 Main St' },
          ]
        },
        {
          id: 'payment',
          title: 'Payment',
          icon: <CreditCard className="w-5 h-5" />,
          fields: [
            { name: 'paymentMethod', label: 'Payment Method', type: 'select', options: [
              { value: 'card', label: 'Credit/Debit Card' },
              { value: 'paypal', label: 'PayPal' },
              { value: 'applepay', label: 'Apple Pay' },
            ]},
          ]
        }
      ]
    };
  }
  
  // AUTH PIPELINES
  if (pack === 'auth') {
    const isSignUp = intent === 'auth.signup';
    return {
      title: isSignUp ? 'Create Account' : 'Sign In',
      description: isSignUp ? 'Join us today - it only takes a minute' : 'Welcome back! Enter your credentials',
      steps: [
        {
          id: 'credentials',
          title: isSignUp ? 'Create Your Account' : 'Enter Credentials',
          icon: <User className="w-5 h-5" />,
          fields: [
            { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', required: true },
            { name: 'password', label: 'Password', type: 'text', placeholder: '••••••••', required: true },
            ...(isSignUp ? [{ name: 'name', label: 'Full Name', type: 'text' as const, placeholder: 'Your Name' }] : []),
          ]
        }
      ]
    };
  }
  
  // RESTAURANT PIPELINES
  if (pack === 'restaurant') {
    return {
      title: getRestaurantTitle(intent),
      description: 'Place your order for pickup or delivery',
      steps: [
        {
          id: 'order',
          title: 'Order Type',
          icon: <ShoppingCart className="w-5 h-5" />,
          fields: [
            { name: 'orderType', label: 'How would you like your order?', type: 'select', options: [
              { value: 'pickup', label: 'Pickup' },
              { value: 'delivery', label: 'Delivery' },
              { value: 'dine-in', label: 'Dine In' },
            ], required: true },
          ]
        },
        {
          id: 'contact',
          title: 'Contact Details',
          icon: <Phone className="w-5 h-5" />,
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'phone', label: 'Phone', type: 'phone', required: true },
            { name: 'specialInstructions', label: 'Special Instructions', type: 'textarea' },
          ]
        }
      ]
    };
  }
  
  // DEFAULT / GENERIC PIPELINE
  return {
    title: formatIntentTitle(intent),
    description: 'Complete the form below to continue',
    steps: [
      {
        id: 'info',
        title: 'Your Information',
        icon: <User className="w-5 h-5" />,
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'message', label: 'Message', type: 'textarea' },
        ]
      }
    ]
  };
}

// Helper functions for pipeline configuration
function getBookingTitle(intent: string): string {
  if (intent.includes('consultation')) return 'Book Consultation';
  if (intent.includes('calendar')) return 'Schedule Meeting';
  if (intent.includes('reschedule')) return 'Reschedule Booking';
  if (intent.includes('cancel')) return 'Cancel Booking';
  return 'Make a Reservation';
}

function getLeadTitle(intent: string): string {
  const titles: Record<string, string> = {
    'contact.submit': 'Get in Touch',
    'newsletter.subscribe': 'Subscribe to Newsletter',
    'join.waitlist': 'Join the Waitlist',
    'beta.apply': 'Apply for Beta Access',
    'trial.start': 'Start Your Free Trial',
    'demo.request': 'Request a Demo',
    'sales.contact': 'Contact Sales',
    'quote.request': 'Get a Quote',
    'project.start': 'Start a Project',
    'project.inquire': 'Project Inquiry',
  };
  return titles[intent] || 'Contact Us';
}

function getLeadDescription(intent: string): string {
  const descriptions: Record<string, string> = {
    'newsletter.subscribe': "Stay updated with our latest news and offers",
    'join.waitlist': "Be the first to know when we launch",
    'trial.start': "No credit card required - get started in minutes",
    'demo.request': "See how our solution can help your business",
    'quote.request': "Get a customized quote for your needs",
  };
  return descriptions[intent] || "We'd love to hear from you";
}

function getLeadFields(intent: string): PipelineField[] {
  const baseFields: PipelineField[] = [];
  
  if (intent === 'quote.request' || intent === 'project.start' || intent === 'project.inquire') {
    baseFields.push(
      { name: 'company', label: 'Company Name', type: 'text', placeholder: 'Acme Inc.' },
      { name: 'budget', label: 'Budget Range', type: 'select', options: [
        { value: 'under5k', label: 'Under $5,000' },
        { value: '5k-15k', label: '$5,000 - $15,000' },
        { value: '15k-50k', label: '$15,000 - $50,000' },
        { value: 'over50k', label: 'Over $50,000' },
      ]},
      { name: 'description', label: 'Project Description', type: 'textarea', placeholder: 'Tell us about your project...' }
    );
  } else if (intent === 'demo.request' || intent === 'sales.contact') {
    baseFields.push(
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'role', label: 'Your Role', type: 'text', placeholder: 'e.g., Marketing Manager' },
      { name: 'interests', label: 'What are you interested in?', type: 'textarea' }
    );
  } else if (intent === 'newsletter.subscribe' || intent === 'join.waitlist') {
    // Minimal fields for subscriptions
  } else {
    baseFields.push(
      { name: 'message', label: 'Your Message', type: 'textarea', placeholder: 'How can we help you?', required: true }
    );
  }
  
  return baseFields;
}

function getEcommerceTitle(intent: string): string {
  if (intent === 'cart.add') return 'Add to Cart';
  if (intent === 'checkout.start') return 'Checkout';
  if (intent === 'wishlist.add') return 'Save for Later';
  return 'Complete Purchase';
}

function getRestaurantTitle(intent: string): string {
  if (intent === 'order.pickup') return 'Order for Pickup';
  if (intent === 'order.delivery') return 'Order for Delivery';
  return 'Place Order';
}

function formatIntentTitle(intent: string): string {
  return intent.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Time slot options
const TIME_SLOTS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
];

export const IntentPipelineOverlay: React.FC<IntentPipelineOverlayProps> = ({
  isOpen,
  onClose,
  config,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  // Reset state when config changes
  useEffect(() => {
    if (config) {
      setCurrentStep(0);
      setFormData(config.payload || {});
      setIsComplete(false);
      setSelectedDate(undefined);
    }
  }, [config]);

  // Compute pipeline even during the transient render where `config` is null,
  // so hooks below always run in a consistent order.
  const pipelineConfig = config
    ? getPipelineConfig(config.intent)
    : { title: '', description: '', steps: [] as PipelineStep[] };
  // Guard against transient renders where `currentStep` is still pointing at a
  // previous pipeline's step index (React state updates are async).
  const steps = pipelineConfig.steps;
  const activeStep = steps.length === 0 ? 0 : Math.min(Math.max(currentStep, 0), steps.length - 1);
  const currentStepConfig = steps[activeStep];
  const isLastStep = steps.length === 0 ? true : activeStep === steps.length - 1;
  const isDemoMode = isDemoModeActive();

  // If we had to clamp, sync state so UI (step indicator/back button) stays consistent.
  useEffect(() => {
    if (activeStep !== currentStep) setCurrentStep(activeStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  if (!config) return null;
  
  const handleFieldChange = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNext = async () => {
    if (isLastStep) {
      // Submit the form
      setIsSubmitting(true);
      try {
        const result = await handleIntent(config.intent, {
          ...formData,
          intent: config.intent,
        });
        
        if (result.success) {
          setIsComplete(true);
          onSuccess?.(result.data);
          
          // Auto-close after success animation
          setTimeout(() => {
            onClose();
            setIsComplete(false);
          }, 2000);
        } else {
          toast.error(result.error || 'Something went wrong');
        }
      } catch {
        toast.error('Failed to submit. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const renderField = (field: PipelineField) => {
    const value = formData[field.name] as string || '';
    
    switch (field.type) {
      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) handleFieldChange(field.name, format(date, 'yyyy-MM-dd'));
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      
      case 'time':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select value={value} onValueChange={(v) => handleFieldChange(field.name, v)}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map(slot => (
                  <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select value={value} onValueChange={(v) => handleFieldChange(field.name, v)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="min-h-[80px]"
            />
          </div>
        );
      
      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              min={1}
            />
          </div>
        );
      
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  };
  
  // Success State
  if (isComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Success!</h3>
            <p className="text-muted-foreground">
              {isDemoMode 
                ? "Demo completed successfully. In production, this would trigger the actual workflow."
                : "Your request has been submitted successfully."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{pipelineConfig.title}</DialogTitle>
              <DialogDescription>{pipelineConfig.description}</DialogDescription>
            </div>
            {isDemoMode && (
              <span className="px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                Demo Mode
              </span>
            )}
          </div>
        </DialogHeader>
        
        {/* Step Indicator */}
        {steps.length > 1 && (
          <div className="flex items-center gap-2 px-2">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                    idx === activeStep 
                      ? "bg-primary text-primary-foreground" 
                      : idx < activeStep 
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.icon}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        
        {/* Form Fields */}
        <div className="space-y-4 py-4">
          {currentStepConfig ? (
            <>
              <h4 className="font-medium flex items-center gap-2">
                {currentStepConfig.icon}
                {currentStepConfig.title}
              </h4>
              
              <div className="space-y-4">
                {currentStepConfig.fields.map(renderField)}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              This action is not configured yet.
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={activeStep > 0 ? handleBack : onClose}
          >
            {activeStep > 0 ? 'Back' : 'Cancel'}
          </Button>
          
          <Button onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : isLastStep ? (
              'Submit'
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntentPipelineOverlay;
