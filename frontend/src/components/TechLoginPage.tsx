import React from 'react';
import { LoginPage } from './LoginPage';

interface TechLoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBack: () => void;
}

export const TechLoginPage: React.FC<TechLoginPageProps> = ({ onLoginSuccess, onBack }) => {
  return <LoginPage variant="technician" onLoginSuccess={onLoginSuccess} onBack={onBack} />;
};
