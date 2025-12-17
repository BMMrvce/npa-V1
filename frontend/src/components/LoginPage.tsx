import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { ImageWithFallback } from './figma/ImageWithFallback';

export type LoginVariant = 'admin' | 'organization' | 'technician';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  variant?: LoginVariant;
  onBack?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, variant = 'admin', onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Login error:', error);
          toast.error(error.message);
          setLoading(false);
          return;
        }

        if (data?.session?.access_token) {
          toast.success('Login successful!');
          onLoginSuccess(data.session.access_token, data.user);
        }
      } else {
        // Signup
        if (!name) {
          toast.error('Name is required');
          setLoading(false);
          return;
        }

        const { backendUrl } = await import('../utils/supabase/info');
        const response = await fetch(
          `${backendUrl}/make-server-60660975/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error('Signup error:', data.error);
          toast.error(data.error || 'Failed to create account');
          setLoading(false);
          return;
        }

        toast.success('Account created! Please login.');
        setIsLogin(true);
        setName('');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="w-full max-w-md">
          {onBack ? (
            <div className="mb-6">
              <Button variant="ghost" onClick={onBack}>
                Back
              </Button>
            </div>
          ) : null}
          {/* Title (logo removed per request) */}
          {/* <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl font-semibold text-gray-900">NPA</span>
          </div> */}

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-gray-900 mb-2">
              {isLogin
                ? variant === 'organization'
                  ? 'Organization Login'
                  : variant === 'technician'
                    ? 'Technician Login'
                    : 'Admin Login'
                : 'Create Account'}
            </h2>
            <p className="text-gray-600">
              {isLogin ? 'Please login to your account' : 'Sign up to get started'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="h-12 bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder={variant === 'organization' ? 'npa001@npa.com' : 'Enter your email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={variant === 'organization' ? 'NPA001@OrgName' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
              />
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                {/* <div className="text-sm">
                  <button type="button" className="text-amber-600 hover:text-amber-700">
                    Forgot password?
                  </button>
                </div> */}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white" 
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign up')}
            </Button>
          </form>
            {/* uncomment this if you need to enable the signup feature in future */}
          {/* <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-600"
            >
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <span className="text-amber-600 hover:text-amber-700 font-medium">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="text-amber-600 hover:text-amber-700 font-medium">Login</span>
                </>
              )}
            </button>
          </div> */}
        </div>
      </div>

      {/* Right Side - Gradient Background */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-yellow-300/40 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-orange-600/40 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-amber-500/30 to-transparent rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="text-white text-center max-w-lg">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm mb-8">
              <ImageWithFallback
                src="/npa-logo.png"
                alt="Brand Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' , fontWeight:'Bold'}}>
            <h2 className="text-4xl mb-4 text-white ">
              {variant === 'organization'
                ? 'Welcome! ORGANIZATION'
                : variant === 'technician'
                  ? 'Welcome! TECHNICIAN'
                  : 'Welcome! ADMIN'}
            </h2>
            </div>
            <p className="text-xl text-white/90 mb-8">
              Manage your water dispenser systems, track maintenance, and monitor devices all in one place.
            </p>
            {/* <div className="flex gap-4 justify-center">
              <div className="text-center">
                <div className="text-3xl mb-1 text-white">500+</div>
                <div className="text-sm text-white/80">Active Devices</div>
              </div>
              <div className="w-px bg-white/30"></div>
              <div className="text-center">
                <div className="text-3xl mb-1 text-white">100+</div>
                <div className="text-sm text-white/80">Organizations</div>
              </div>
              <div className="w-px bg-white/30"></div>
              <div className="text-center">
                <div className="text-3xl mb-1 text-white">50+</div>
                <div className="text-sm text-white/80">Technicians</div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};
