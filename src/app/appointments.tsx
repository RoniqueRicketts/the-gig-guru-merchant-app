import { useLocalSearchParams } from 'expo-router';

import ResourceScreen from '@/components/resource-screen';

export default function AppointmentsScreen() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  return <ResourceScreen initialCreate={create === 'true'} resource="appointments" />;
}
