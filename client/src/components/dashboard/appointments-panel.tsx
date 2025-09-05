'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { Calendar, Clock, User, X, Plus } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

export function AppointmentsPanel() {
  const {
    appointments,
    isLoadingAppointments,
    fetchAppointments,
    cancelAppointment,
    setAppointmentModalOpen,
  } = useAppStore();

  useEffect(() => {
    fetchAppointments().catch((error) => {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    });
  }, [fetchAppointments]);

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await cancelAppointment(appointmentId);
      toast.success('Appointment cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-600';
      case 'completed':
        return 'bg-green-500/20 text-green-600';
      case 'cancelled':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const formatAppointmentDate = (appointmentDate: string) => {
    const date = parseISO(appointmentDate);
    const time = format(date, 'HH:mm');
    
    if (isToday(date)) {
      return `Today at ${time}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${time}`;
    } else {
      return `${format(date, 'MMM dd')} at ${time}`;
    }
  };

  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'scheduled' && !isPast(parseISO(apt.appointmentDate)))
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
    .slice(0, 5);

  const pastAppointments = appointments
    .filter(apt => apt.status === 'completed' || isPast(parseISO(apt.appointmentDate)))
    .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
    .slice(0, 3);

  if (isLoadingAppointments) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 border rounded-lg bg-card p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Appointments</h2>
        <Button
          onClick={() => setAppointmentModalOpen(true)}
          size="sm"
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          Book
        </Button>
      </div>

      {/* Upcoming Appointments */}
      <Card className="flex-1 !shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming</CardTitle>
          <CardDescription>
            {upcomingAppointments.length} appointment{upcomingAppointments.length !== 1 ? 's' : ''} scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 overflow-y-auto max-h-64">
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
              <Button
                onClick={() => setAppointmentModalOpen(true)}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Book your first appointment
              </Button>
            </div>
          ) : (
            upcomingAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm truncate">
                      Dr. {appointment.therapistName || 'Therapist'}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getStatusColor(appointment.status)} text-white`}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatAppointmentDate(appointment.appointmentDate)}</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleCancelAppointment(appointment._id)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Appointments */}
      {pastAppointments.length > 0 && (
        <Card className='!shadow-none'>
          <CardHeader>
            <CardTitle className="text-base">Recent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 overflow-y-auto max-h-32">
            {pastAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      Dr. {appointment.therapistName || 'Therapist'}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getStatusColor(appointment.status)}`}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatAppointmentDate(appointment.appointmentDate)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
