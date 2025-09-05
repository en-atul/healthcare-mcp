'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthDebug() {
  const auth = useAuth();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Auth Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Hydrated:</strong> {auth.isHydrated ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Authenticated:</strong> {auth.isAuthenticated ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Loading:</strong> {auth.isLoading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>User:</strong> {auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : 'None'}
          </div>
          <div>
            <strong>Token:</strong> {auth.token ? 'Present' : 'None'}
          </div>
          <div>
            <strong>LocalStorage:</strong>
            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
              {typeof window !== 'undefined' 
                ? localStorage.getItem('auth-storage') || 'Empty'
                : 'SSR'
              }
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
