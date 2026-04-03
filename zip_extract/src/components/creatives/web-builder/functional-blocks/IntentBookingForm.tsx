import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { handleIntent } from '@/runtime/intentRouter';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, CheckCircle, Loader2, CalendarDays } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  description: string | null;
}

interface AvailabilitySlot {
  id: string;
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
}

interface IntentBookingFormProps {
  businessId: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  className?: string;
}

export const IntentBookingForm: React.FC<IntentBookingFormProps> = ({
  businessId,
  title = 'Book an Appointment',
  description = 'Select a service and time that works for you.',
  submitButtonText = 'Confirm Booking',
  className = '',
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setServices(data);
      }
      setLoading(false);
    };

    fetchServices();
  }, [businessId]);

  // Fetch available slots when service is selected
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedService) {
        setAvailableSlots([]);
        return;
      }

      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_booked', false)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(20);

      if (!error && data) {
        setAvailableSlots(data);
      }
    };

    fetchSlots();
  }, [businessId, selectedService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedSlot) {
      toast.error('Please select a service and time slot');
      return;
    }

    setSubmitting(true);

    const slot = availableSlots.find(s => s.id === selectedSlot);
    const service = services.find(s => s.id === selectedService);

    const result = await handleIntent('booking.create', {
      businessId,
      serviceId: selectedService,
      serviceName: service?.name || 'Service',
      slotId: selectedSlot,
      startsAt: slot?.starts_at,
      endsAt: slot?.ends_at,
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      notes: notes || undefined,
      durationMinutes: service?.duration_minutes,
    });

    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      toast.success('Booking confirmed!');
    } else {
      toast.error(result.error || 'Failed to create booking');
    }
  };

  const formatSlotTime = (startsAt: string) => {
    const date = new Date(startsAt);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  const formatPrice = (cents: number | null) => {
    if (!cents) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (submitted) {
    const service = services.find(s => s.id === selectedService);
    const slot = availableSlots.find(s => s.id === selectedSlot);
    const slotInfo = slot ? formatSlotTime(slot.starts_at) : null;

    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
          <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
            <p className="font-medium">{service?.name}</p>
            {slotInfo && (
              <p className="text-sm text-muted-foreground">
                {slotInfo.date} at {slotInfo.time}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A confirmation email has been sent to {customerEmail}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setSelectedService('');
              setSelectedSlot('');
              setCustomerName('');
              setCustomerEmail('');
              setCustomerPhone('');
              setNotes('');
            }}
          >
            Book Another Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading available services...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label>
              Service <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {service.duration_minutes}min • {formatPrice(service.price_cents)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">No services available</p>
            )}
          </div>

          {/* Time Slot Selection */}
          {selectedService && (
            <div className="space-y-2">
              <Label>
                Date & Time <span className="text-destructive">*</span>
              </Label>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No available time slots. Please check back later.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot) => {
                    const { date, time } = formatSlotTime(slot.starts_at);
                    const isSelected = selectedSlot === slot.id;
                    return (
                      <Button
                        key={slot.id}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="flex flex-col h-auto py-2"
                        onClick={() => setSelectedSlot(slot.id)}
                      >
                        <span className="text-xs">{date}</span>
                        <span className="font-medium">{time}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Customer Info */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="booking-name">
                Your Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="booking-name"
                placeholder="Full name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="booking-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="booking-email"
                type="email"
                placeholder="your@email.com"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="booking-phone">Phone</Label>
              <Input
                id="booking-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !selectedService || !selectedSlot}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                {submitButtonText}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
