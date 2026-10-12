import { Redirect } from 'expo-router';
import React from 'react';

import { useSession } from '../src/store/session';

export default function Index() {
  const status = useSession((s) => s.status);
  if (status === 'boot') return null;
  return <Redirect href={status === 'authed' ? '/(tabs)' : '/(auth)/welcome'} />;
}
