'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent,  CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Therapist, useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { Calendar, Clock, User, Star, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

export function AppointmentModal() {
  const {
    isAppointmentModalOpen,
    setAppointmentModalOpen,
    therapists,
    isLoadingTherapists,
    fetchTherapists,
    bookAppointment,
  } = useAppStore();

  const [selectedTherapist, setSelectedTherapist] = useState<Therapist>();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (isAppointmentModalOpen && therapists.length === 0) {
      fetchTherapists().catch((error) => {
        console.error('Failed to fetch therapists:', error);
        toast.error('Failed to load therapists');
      });
    }
  }, [isAppointmentModalOpen, therapists.length, fetchTherapists]);

  const handleBookAppointment = async () => {
    if (!selectedTherapist || !selectedDate || !selectedTime) {
      toast.error('Please select a therapist, date, and time');
      return;
    }

    setIsBooking(true);
    try {
      await bookAppointment(selectedTherapist._id, selectedDate, selectedTime);
      toast.success('Appointment booked successfully!');
      setAppointmentModalOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to book appointment');
    } finally {
      setIsBooking(false);
    }
  };

  const resetForm = () => {
    setSelectedTherapist(undefined);
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
  };

  const handleClose = () => {
    setAppointmentModalOpen(false);
    resetForm();
  };

  // Generate available time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  // Generate available dates (next 30 days)
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'MMM dd, yyyy'),
      day: format(date, 'EEEE')
    };
  });

  return (
    <Dialog open={isAppointmentModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book an Appointment</DialogTitle>
          <DialogDescription>
            Select a therapist and choose your preferred date and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Therapist Selection - Full Width */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Therapist</label>
            {isLoadingTherapists ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading therapists...</span>
              </div>
            ) : (
              <Select
                value={selectedTherapist?._id || ''}
                onValueChange={(value) => {
                  const therapist = therapists.find(t => t._id === value);
                  setSelectedTherapist(therapist || undefined);
                }}
              >
                <SelectTrigger className="h-14 w-full">
                  <SelectValue placeholder="Choose a therapist">
                    {selectedTherapist && (
                      <span className="font-medium text-sm">
                        <span className="text-foreground">Dr. {selectedTherapist.firstName} {selectedTherapist.lastName}</span>
                        <span className="text-muted-foreground"> • {selectedTherapist.specialization} • {selectedTherapist.experience} years exp</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {therapists.map((therapist) => (
                    <SelectItem key={therapist._id} value={therapist._id} className="py-3">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            Dr. {therapist.firstName} {therapist.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {therapist.specialization} • {therapist.experience} years exp
                          </span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{therapist.rating}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date and Time Selection - Two Columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Date</label>
              <Select
                value={selectedDate}
                onValueChange={setSelectedDate}
              >
                <SelectTrigger className="h-14 w-full">
                  <SelectValue placeholder="Choose a date">
                    {selectedDate && (
                      <span className="font-medium text-sm">
                        <span className="text-foreground">{format(new Date(selectedDate), 'MMM dd, yyyy')}</span>
                        <span className="text-muted-foreground"> • {format(new Date(selectedDate), 'EEEE')}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map((date) => (
                    <SelectItem key={date.value} value={date.value} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{date.label}</span>
                        <span className="text-xs text-muted-foreground">{date.day}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Time</label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
                disabled={!selectedDate}
              >
                <SelectTrigger className="h-14 w-full">
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time} className="py-3">
                      <span className="font-medium text-sm">{time}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Input
              placeholder="Any specific concerns or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-14"
            />
          </div>

          {/* Booking Summary */}
          {selectedTherapist && selectedDate && selectedTime && (
            <Card className="bg-muted/50 !gap-4">
              <CardHeader>
                <CardTitle className="text-base">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Dr. {selectedTherapist.firstName} {selectedTherapist.lastName}</p>
                    <p className="text-sm text-muted-foreground">{selectedTherapist.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(selectedDate), 'EEEE, MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedTime}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleBookAppointment}
              disabled={!selectedTherapist || !selectedDate || !selectedTime || isBooking}
              className="flex-1"
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                'Book Appointment'
              )}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
