'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { Calendar, Clock, X, Plus } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isBefore } from 'date-fns';

export function AppointmentsPanel() {
  const {
    appointments,
    isLoadingAppointments,
    cancelAppointment,
    setAppointmentModalOpen,
  } = useAppStore();


  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '?';
    const last = lastName?.[0] || '?';
    return `${first}${last}`;
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await cancelAppointment(appointmentId);
      toast.success('Appointment cancelled successfully');
    } catch {
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

  const todaysAppointments = appointments
    .filter(
      (apt) =>
        apt.status === 'scheduled' && isToday(parseISO(apt.appointmentDate)),
    )
    .sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime(),
    )
    .slice(0, 5);

  const upcomingAppointments = appointments
    .filter((apt) => {
      const appointmentDate = parseISO(apt.appointmentDate);
      const now = new Date();

      return apt.status === 'scheduled' && appointmentDate > now;
    })
    .sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime(),
    )
    .slice(0, 3);

  const pastAppointments = appointments
    .filter((apt) => {
      const appointmentDate = parseISO(apt.appointmentDate);
      const now = new Date();

      return isBefore(appointmentDate, now);
    })
    .sort(
      (a, b) =>
        new Date(b.appointmentDate).getTime() -
        new Date(a.appointmentDate).getTime(),
    )
    .slice(0, 3);

  if (isLoadingAppointments) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Loading appointments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 border-0 rounded-xl bg-gradient-to-br from-card/50 to-card/30 p-6 overflow-hidden shadow-sm min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            My Appointments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your healthcare schedule
          </p>
        </div>
        <Button
          onClick={() => setAppointmentModalOpen(true)}
          size="sm"
          className="h-9 px-4 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Book
        </Button>
      </div>

      {/* Today's Appointments */}
      <Card className="flex-1 !shadow-none border-0 bg-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <CardTitle className="text-lg font-medium">
              Today&apos;s Appointment
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground/80">
            {todaysAppointments.length} appointment
            {todaysAppointments.length !== 1 ? 's' : ''} scheduled for today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto max-h-64 custom-scrollbar">
          {todaysAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground mb-4">
                No appointments scheduled for today
              </p>
              <Button
                onClick={() => setAppointmentModalOpen(true)}
                variant="outline"
                size="sm"
                className="hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Book an appointment
              </Button>
            </div>
          ) : (
            todaysAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-card/30 to-card/50 hover:from-card/50 hover:to-card/70 transition-all duration-300 hover:shadow-md border border-transparent hover:border-card/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    {/* Therapist Photo (back) */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={appointment.therapistId?.photo}
                        alt={`Dr. ${appointment.therapistId?.firstName || ''} ${appointment.therapistId?.lastName || ''}`}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(appointment.therapistId?.firstName, appointment.therapistId?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <Avatar className="h-8 w-8 absolute -bottom-1 -right-1 border-2 border-white">
                      <AvatarImage
                        src={appointment.patientId?.photo}
                        alt={`${appointment.patientId?.firstName || ''} ${appointment.patientId?.lastName || ''}`}
                      />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {getInitials(appointment.patientId?.firstName, appointment.patientId?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        Dr. {appointment.therapistId?.firstName || 'Unknown'}{' '}
                        {appointment.therapistId?.lastName || 'Therapist'}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium px-2 py-1 ${getStatusColor(
                          appointment.status,
                        )} text-white shadow-sm`}
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatAppointmentDate(appointment.appointmentDate)}
                      </span>
                    </div>
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

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <Card className="!shadow-none border-0 bg-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              <CardTitle className="text-lg font-medium">Upcoming</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground/80">
              Your future scheduled appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 overflow-y-auto max-h-64 custom-scrollbar pb-5">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-50/50 to-orange-100/30 hover:from-orange-100/50 hover:to-orange-200/40 transition-all duration-300 hover:shadow-md border border-orange-200/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    {/* Therapist Photo (back) */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={appointment.therapistId?.photo}
                        alt={`Dr. ${appointment.therapistId?.firstName || ''} ${appointment.therapistId?.lastName || ''}`}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(appointment.therapistId?.firstName, appointment.therapistId?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Patient Photo (front, slightly offset) */}
                    <Avatar className="h-8 w-8 absolute -bottom-1 -right-1 border-2 border-white">
                      <AvatarImage
                        src={appointment.patientId?.photo}
                        alt={`${appointment.patientId?.firstName || ''} ${appointment.patientId?.lastName || ''}`}
                      />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {getInitials(appointment.patientId?.firstName, appointment.patientId?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        Dr. {appointment.therapistId?.firstName || 'Unknown'}{' '}
                        {appointment.therapistId?.lastName || 'Therapist'}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium px-2 py-1 ${getStatusColor(
                          appointment.status,
                        )} text-white shadow-sm`}
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatAppointmentDate(appointment.appointmentDate)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelAppointment(appointment._id)}
                  className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card className="!shadow-none border-0 bg-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <CardTitle className="text-lg font-medium">
                Past Appointments
              </CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground/80">
              Your completed and previous appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 overflow-y-auto max-h-64 custom-scrollbar pb-5">
            {pastAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/10 to-muted/20 hover:from-muted/20 hover:to-muted/30 transition-all duration-300 hover:shadow-md border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={appointment.therapistId?.photo}
                        alt={`Dr. ${appointment.therapistId?.firstName || ''} ${appointment.therapistId?.lastName || ''}`}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(appointment.therapistId?.firstName, appointment.therapistId?.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <Avatar className="h-6 w-6 absolute -bottom-0.5 -right-0.5 border border-white">
                      <AvatarImage
                        src={appointment.patientId?.photo}
                        alt={`${appointment.patientId?.firstName || ''} ${appointment.patientId?.lastName || ''}`}
                      />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {getInitials(appointment.patientId?.firstName, appointment.patientId?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        Dr. {appointment.therapistId?.firstName || 'Unknown'}{' '}
                        {appointment.therapistId?.lastName || 'Therapist'}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium px-2 py-1 ${getStatusColor(
                          appointment.status,
                        )} shadow-sm`}
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAppointmentDate(appointment.appointmentDate)}
                    </div>
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
