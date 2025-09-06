'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode') || 'login';

  const switchMode = (newMode: 'login' | 'register') => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', newMode);
    router.push(`/auth?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-400 bg-clip-text text-transparent mb-2">
            Healthcare MCP
          </h1>
          <p className="text-gray-600 text-sm">
            Your AI-powered healthcare assistant
          </p>
        </div>
        {mode === 'login' ? (
          <LoginForm onSwitchToRegister={() => switchMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => switchMode('login')} />
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
