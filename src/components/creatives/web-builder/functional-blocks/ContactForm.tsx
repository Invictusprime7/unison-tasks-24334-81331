import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import type { UnisonRuntimeContext } from '@/platform/core/runtimeManifest';
const supabase = supabaseClient as any;
import { Send, CheckCircle } from 'lucide-react';

interface ContactFormProps {
  formId?: string;
  formName?: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  primaryColor?: string;
  workflowId?: string;
  runtimeContext?: UnisonRuntimeContext;
  intent?: 'contact.submit' | 'quote.request' | 'booking.request' | 'newsletter.subscribe' | 'application.submit';
  pageId?: string;
  componentId?: string;
  consentMetadata?: Record<string, unknown>;
  fields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'textarea';
    required?: boolean;
    placeholder?: string;
  }>;
  onSubmit?: (data: Record<string, string>) => void;
}

const defaultFields = [
  { name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'Your name' },
  { name: 'email', label: 'Email', type: 'email' as const, required: true, placeholder: 'your@email.com' },
  { name: 'phone', label: 'Phone', type: 'phone' as const, required: false, placeholder: '(555) 123-4567' },
  { name: 'message', label: 'Message', type: 'textarea' as const, required: true, placeholder: 'How can we help you?' }
];

export const ContactForm: React.FC<ContactFormProps> = ({
  formId = 'contact-form',
  formName = 'Contact Form',
  title = 'Get in Touch',
  description = 'Fill out the form below and we\'ll get back to you soon.',
  submitButtonText = 'Send Message',
  primaryColor = '#3b82f6',
  runtimeContext,
  intent = 'contact.submit',
  pageId,
  componentId,
  consentMetadata = {},
  fields = defaultFields,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const idempotencyKeyRef = useRef(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `form-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!runtimeContext) {
        throw new Error('This form is missing its canonical runtime context.');
      }
      const url = new URL(window.location.href);
      const { error } = await supabase.functions.invoke('form-submit', {
        body: {
          businessId: runtimeContext.businessId,
          projectId: runtimeContext.projectId,
          siteId: runtimeContext.siteId,
          snapshotId: runtimeContext.snapshotId,
          formId,
          formName,
          intent,
          pageId,
          componentId,
          data: formData,
          sourceUrl: window.location.href,
          referrer: document.referrer || undefined,
          utmSource: url.searchParams.get('utm_source') || undefined,
          utmMedium: url.searchParams.get('utm_medium') || undefined,
          utmCampaign: url.searchParams.get('utm_campaign') || undefined,
          consentMetadata,
          idempotencyKey: idempotencyKeyRef.current,
          honeypot,
        }
      });

      if (error) throw error;

      // Call custom onSubmit handler if provided
      if (onSubmit) {
        onSubmit(formData);
      }

      setSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: primaryColor }} />
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="text-muted-foreground">
            Your message has been received. We'll get back to you soon.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSubmitted(false);
              setFormData({});
              idempotencyKeyRef.current = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `form-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            }}
          >
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="sr-only" aria-hidden="true">
            <Label htmlFor={`${formId}-website`}>Website</Label>
            <Input
              id={`${formId}-website`}
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  rows={4}
                />
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type === 'phone' ? 'tel' : field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? (
              'Sending...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {submitButtonText}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
