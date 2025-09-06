'use client';

import { FC, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { format } from 'date-fns';

interface AppointmentCardProps {
  data: {
    id: string;
    date: string;
    duration: number;
    status: string;
    therapistName: string;
    therapistId: string;
    therapistPhoto?: string;
    patientName?: string;
    patientPhoto?: string;
    notes?: string;
    canceled?: boolean;
    cancellationReason?: string;
  };
  handleQuickAction: (action: string) => void;
}

const AppointmentCard: FC<AppointmentCardProps> = ({data:appointment, handleQuickAction}) => {
  return (
    <Card key={appointment.id} className="p-3 !shadow-none border-0 bg-card/50 hover:bg-card/80 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Therapist Photo (back) */}
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={appointment.therapistPhoto}
                alt={`Dr. ${appointment.therapistName}`}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {appointment.therapistName
                  ? appointment.therapistName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                  : 'DR'}
              </AvatarFallback>
            </Avatar>
            {/* Patient Photo (front, slightly offset) */}
            {appointment.patientPhoto && (
              <Avatar className="h-8 w-8 absolute -bottom-1 -right-1 border-2 border-white">
                <AvatarImage
                  src={appointment.patientPhoto}
                  alt={`${appointment.patientName || 'Patient'}`}
                />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  {appointment.patientName
                    ? appointment.patientName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                    : 'P'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(appointment.date), 'MMM dd, yyyy HH:mm')}
            </p>
            <p className="text-sm text-muted-foreground">
              with {appointment.therapistName}
            </p>
            <p className="text-sm text-muted-foreground">
              Duration: {appointment.duration} minutes
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleQuickAction(
                    `Cancel my appointment with ${
                      appointment.therapistName
                    } on ${format(new Date(appointment.date), 'MMM dd, yyyy')}`,
                  )
                }
                disabled={appointment.status === 'cancelled'}
              >
                Join Call
              </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleQuickAction(
                      `Cancel my appointment with ${
                        appointment.therapistName
                      } on ${format(
                        new Date(appointment.date),
                        'MMM dd, yyyy',
                      )}`,
                    )
                  }
                  disabled={appointment.status === 'cancelled'}
                >
                  Cancel
                </Button>
            </div>
          </div>
        </div>
        <div className="h-full">
          <Badge
            variant={
              appointment.status === 'scheduled'
                ? 'default'
                : appointment.status === 'cancelled'
                ? 'destructive'
                : 'secondary'
            }
            className="text-xs mt-1"
          >
            {appointment.status}
          </Badge>
        </div>
      </div>
    </Card>
  );
};


export default memo(AppointmentCard)