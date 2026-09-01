import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTemplateAutomation } from '@/hooks/useTemplateAutomation';
import { useWorkflowTrigger } from '@/hooks/useWorkflowTrigger';

interface BookingWidgetProps {
  serviceName?: string;
  servicePrice?: number;
  durationMinutes?: number;
  ghlCalendarId?: string;
  locationId?: string;
  primaryColor?: string;
  workflowId?: string;
  onBookingComplete?: (booking: any) => void;
}

export const BookingWidget: React.FC<BookingWidgetProps> = ({
  serviceName = 'Consultation',
  servicePrice,
  durationMinutes = 60,
  ghlCalendarId,
  locationId,
  primaryColor = '#3b82f6',
  workflowId,
  onBookingComplete
}) => {
  const { createBooking, getAvailableSlots, loading } = useTemplateAutomation();
  const { triggerBookingCreated } = useWorkflowTrigger();
  const [step, setStep] = useState<'date' | 'time' | 'details' | 'confirmed'>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Get next 14 days for date selection
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        });
      }
    }
    return dates;
  };

  useEffect(() => {
    if (selectedDate) {
      getAvailableSlots(selectedDate, durationMinutes).then(setAvailableSlots);
    }
  }, [selectedDate, durationMinutes]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep('time');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const booking = await createBooking({
      serviceName,
      customerName: formData.name,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      bookingDate: selectedDate,
      bookingTime: selectedTime,
      durationMinutes,
      notes: formData.notes,
      ghlCalendarId,
      locationId
    });

    if (booking) {
      setConfirmedBooking(booking);
      setStep('confirmed');
      
      // Trigger CRM workflow
      await triggerBookingCreated({
        bookingId: booking.id,
        serviceName,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        bookingDate: selectedDate,
        bookingTime: selectedTime,
        durationMinutes
      }, workflowId);
      
      onBookingComplete?.(booking);
    }
  };

  const buttonStyle = { backgroundColor: primaryColor };

  if (step === 'confirmed') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
          <p className="text-muted-foreground mb-4">
            Your {serviceName} is scheduled for
          </p>
          <p className="font-medium">
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })} at {selectedTime}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Confirmation sent to {formData.email}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Book {serviceName}
        </CardTitle>
        {servicePrice && (
          <p className="text-lg font-semibold" style={{ color: primaryColor }}>
            ${servicePrice}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {step === 'date' && (
          <div className="space-y-3">
            <Label>Select a Date</Label>
            <div className="grid grid-cols-2 gap-2">
              {getAvailableDates().map(date => (
                <Button
                  key={date.value}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleDateSelect(date.value)}
                >
                  {date.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 'time' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select a Time</Label>
              <Button variant="ghost" size="sm" onClick={() => setStep('date')}>
                Change Date
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', month: 'long', day: 'numeric' 
              })}
            </p>
            {availableSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No available slots for this date
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <Button
                    key={slot.time}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTimeSelect(slot.time)}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {slot.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Your Details</Label>
              <Button variant="ghost" size="sm" onClick={() => setStep('time')}>
                Change Time
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    className="pl-9"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    className="pl-9"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full text-white"
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
