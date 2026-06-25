import type { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset password | Project Fit',
  description: 'Set a new password for your Project Fit account.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
