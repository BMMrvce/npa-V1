import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import type { LoginVariant } from './components/LoginPage';
import { LoginSelectPage } from './components/LoginSelectPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { OrgLoginPage } from './components/OrgLoginPage';
import { TechLoginPage } from './components/TechLoginPage';
import { Dashboard } from './components/Dashboard';
import { OrgPortal } from './components/OrgPortal';
import { TechPortal } from './components/TechPortal';
import { Toaster } from './components/ui/sonner';
import { createClient } from './utils/supabase/client';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [role, setRole] = useState<'admin' | 'organization' | 'technician'>('admin');
  const [loginScreen, setLoginScreen] = useState<'select' | LoginVariant>('select');

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    (async () => {
      try {
        setRoleLoading(true);
        const res = await fetch('http://localhost:8000/make-server-60660975/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data?.role) {
          setRole(data.role);
        } else {
          setRole('admin');
        }
      } catch (e) {
        console.error('Error loading role:', e);
        setRole('admin');
      } finally {
        setRoleLoading(false);
      }
    })();
  }, [isAuthenticated, token]);

  const checkSession = async () => {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session && session.access_token) {
        setToken(session.access_token);
        setUser(session.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (accessToken: string, userData: any) => {
    setToken(accessToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setToken('');
      setUser(null);
      setIsAuthenticated(false);
      setLoginScreen('select');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        role === 'organization' ? (
          <OrgPortal token={token} user={user} onLogout={handleLogout} />
        ) : role === 'technician' ? (
          <TechPortal token={token} user={user} onLogout={handleLogout} />
        ) : (
          <Dashboard token={token} user={user} onLogout={handleLogout} />
        )
      ) : (
        loginScreen === 'select' ? (
          <LoginSelectPage onSelect={(v) => setLoginScreen(v)} />
        ) : loginScreen === 'organization' ? (
          <OrgLoginPage onLoginSuccess={handleLoginSuccess} onBack={() => setLoginScreen('select')} />
        ) : loginScreen === 'technician' ? (
          <TechLoginPage onLoginSuccess={handleLoginSuccess} onBack={() => setLoginScreen('select')} />
        ) : (
          <AdminLoginPage onLoginSuccess={handleLoginSuccess} onBack={() => setLoginScreen('select')} />
        )
      )}
      <Toaster />
    </>
  );
}
