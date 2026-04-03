import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { handleIntent } from '@/runtime/intentRouter';
import { Mail, CheckCircle, Loader2, Sparkles } from 'lucide-react';

interface IntentNewsletterFormProps {
  businessId: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  variant?: 'card' | 'inline' | 'minimal';
  className?: string;
}

export const IntentNewsletterForm: React.FC<IntentNewsletterFormProps> = ({
  businessId,
  title = 'Stay Updated',
  description = 'Get the latest news and updates delivered to your inbox.',
  submitButtonText = 'Subscribe',
  variant = 'card',
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const result = await handleIntent('newsletter.subscribe', {
      businessId,
      email,
      name: name || undefined,
      source: 'newsletter',
    });

    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      toast.success('Successfully subscribed!');
    } else {
      toast.error(result.error || 'Failed to subscribe');
    }
  };

  if (submitted) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">You're Subscribed!</h3>
          <p className="text-sm text-muted-foreground">
            Thanks for joining! Check your inbox for a confirmation.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`w-full max-w-lg ${className}`}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                {submitButtonText}
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`w-full max-w-md ${className}`}>
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Your email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {submitButtonText}
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newsletter-name">Name (optional)</Label>
            <Input
              id="newsletter-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newsletter-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="newsletter-email"
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {submitButtonText}
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            No spam, unsubscribe anytime.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
