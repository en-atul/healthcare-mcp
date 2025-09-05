'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { AppointmentsPanel } from '@/components/dashboard/appointments-panel';
import { ChatInterface } from '@/components/dashboard/chat-interface';
import { AppointmentModal } from '@/components/modals/appointment-modal';
import { useAuth } from '@/hooks/use-auth';

export default function Dashboard() {
  const { isAuthenticated, user, token, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    console.log('Dashboard - Auth state:', { isAuthenticated, user: !!user, token: !!token });
    
    if (!isAuthenticated || !user || !token) {
      router.push('/login');
    }
  }, [isAuthenticated, user, token, isHydrated, router]);

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
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6 h-[calc(100vh-8rem)]">
          {/* Appointments Panel - 30% */}
          <div className="h-full">
            <AppointmentsPanel />
          </div>
          
          {/* Chat Interface - 70% */}
          <div className="h-full">
            <ChatInterface />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AppointmentModal />
    </div>
  );
}
