import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProfilePageClient from './ProfilePageClient';

export const metadata: Metadata = {
  title: 'Profile | Project Fit',
  description: 'Manage your Project Fit profile details.',
};

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageClient />
    </Suspense>
  );
}
