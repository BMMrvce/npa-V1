import React from 'react';
import { LoginPage } from './LoginPage';

interface OrgLoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBack: () => void;
}

export const OrgLoginPage: React.FC<OrgLoginPageProps> = ({ onLoginSuccess, onBack }) => {
  return <LoginPage variant="organization" onLoginSuccess={onLoginSuccess} onBack={onBack} />;
};
