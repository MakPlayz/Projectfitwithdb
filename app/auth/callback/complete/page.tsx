import { Suspense } from 'react';
import AuthCallbackCompleteClient from './AuthCallbackCompleteClient';

export default function AuthCallbackCompletePage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackCompleteClient />
    </Suspense>
  );
}
