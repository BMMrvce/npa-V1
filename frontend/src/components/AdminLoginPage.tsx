import React from 'react';
import { LoginPage } from './LoginPage';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBack: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onBack }) => {
  return <LoginPage variant="admin" onLoginSuccess={onLoginSuccess} onBack={onBack} />;
};
