/**
 * Confirmation Dialog Component
 * Shows a summary of form data before submitting
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, User, Mail, Phone, MessageSquare, Briefcase, Calendar } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  data: Record<string, unknown>;
  fields?: string[];
  onConfirm: () => Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
}

const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  name: User,
  email: Mail,
  phone: Phone,
  message: MessageSquare,
  service: Briefcase,
  date: Calendar,
  time: Calendar,
  customerName: User,
  customerEmail: Mail,
  customerPhone: Phone,
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  message: 'Message',
  service: 'Service',
  date: 'Date',
  time: 'Time',
  customerName: 'Name',
  customerEmail: 'Email',
  customerPhone: 'Phone',
  serviceName: 'Service',
  notes: 'Notes',
  company: 'Company',
  subject: 'Subject',
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title = 'Confirm Submission',
  description = 'Please review your information before submitting.',
  data,
  fields,
  onConfirm,
  confirmLabel = 'Confirm & Submit',
  cancelLabel = 'Go Back',
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  // Get fields to display
  const displayFields = fields || Object.keys(data).filter(
    key => !['businessId', 'intent', '_source', 'templateId', 'projectId', 'visitorId'].includes(key) &&
           data[key] !== undefined && 
           data[key] !== null && 
           data[key] !== ''
  );

  const renderFieldValue = (key: string, value: unknown): string => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-center">Submitted Successfully!</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              We've received your information and will be in touch soon.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {displayFields.map((field) => {
            const value = data[field];
            if (value === undefined || value === null || value === '') return null;
            
            const Icon = FIELD_ICONS[field] || MessageSquare;
            const label = FIELD_LABELS[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
            const displayValue = renderFieldValue(field, value);

            return (
              <div key={field} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {label}
                  </p>
                  <p className="text-sm mt-0.5 break-words">
                    {displayValue}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
