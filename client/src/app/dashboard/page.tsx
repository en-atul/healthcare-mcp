'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { AppointmentsPanel } from '@/components/dashboard/appointments-panel';
import { ChatInterface } from '@/components/dashboard/chat-interface';
import { AppointmentModal } from '@/components/modals/appointment-modal';
import { useAuth } from '@/hooks/use-auth';
import { useAppStore } from '@/stores/app-store';

export default function Dashboard() {
  const { isAuthenticated, user, token, isHydrated } = useAuth();
  const router = useRouter();
  const { fetchAppointments } = useAppStore();

  useEffect(() => {
    if (!isHydrated) return;

    console.log('Dashboard - Auth state:', { isAuthenticated, user: !!user, token: !!token });
    
    if (!isAuthenticated || !user || !token) {
      router.push('/auth');
    }
  }, [isAuthenticated, user, token, isHydrated, router]);

  useEffect(() => {
    if (isAuthenticated && user && token) {
      fetchAppointments().catch((error) => {
        console.error('Failed to load appointments:', error);
      });
          }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, token]); 

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="container mx-auto px-4 py-4 h-[calc(100vh-5rem)] min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,30%)_1fr] gap-6 h-full min-h-0">
          <div className="h-full overflow-hidden min-w-0">
            <AppointmentsPanel />
          </div>
          
          <div className="h-full overflow-hidden min-w-0">
            <ChatInterface />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AppointmentModal />
    </div>
  );
}
