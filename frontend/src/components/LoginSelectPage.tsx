import React from 'react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { LoginVariant } from './LoginPage';

interface LoginSelectPageProps {
  onSelect: (variant: LoginVariant) => void;
}

export const LoginSelectPage: React.FC<LoginSelectPageProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-gray-900 mb-2">Choose Login</h2>
            <p className="text-gray-600">Select which portal you want to access.</p>
          </div>

          <div className="space-y-3">
            <Button className="w-full h-12" onClick={() => onSelect('admin')}>
              Admin Login
            </Button>
            <Button className="w-full h-12" variant="outline" onClick={() => onSelect('organization')}>
              Organization Login
            </Button>
            <Button className="w-full h-12" variant="outline" onClick={() => onSelect('technician')}>
              Technician Login
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-yellow-300/40 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-orange-600/40 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-amber-500/30 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="text-white text-center max-w-lg">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm mb-8">
              <ImageWithFallback
                src="/npa-logo.png"
                alt="Brand Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
            <h2 className="text-4xl mb-4 text-white">NPA Portal</h2>
            <p className="text-xl text-white/90 mb-8">
              Admin, organization, and technician portals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
