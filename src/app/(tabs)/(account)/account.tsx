import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { Avatar, Icon, ListGroup, ListRow, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { useAppLock } from '@/lib/app-lock';
import { useAuth } from '@/lib/auth';
import { str, type Row } from '@/lib/format';

export default function AccountScreen() {
  const { session, signOut } = useAuth();
  const { enabled: lockEnabled } = useAppLock();
  const company = useQuery<Row | null>('/companies');
  const name = str(company.data?.name) || 'Your business';
  const verified = company.data?.isVerified === true;

  return (
    <Screen>
      <ListGroup>
        <ListRow
          leading={<Avatar dark name={name} size={52} />}
          onPress={() => router.push('/company')}
          subtitle={session?.email}
          title={name}
          trailing={
            verified ? (
              <View style={styles.verified}>
                <Icon color={Colors.primary} name="shield" size={14} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : undefined
          }
        />
      </ListGroup>

      <ListGroup style={styles.group} title="Your business">
        <ListRow icon="catalog" onPress={() => router.push('/catalog')} subtitle="Services and products" title="Catalog" />
        <ListRow icon="hours" onPress={() => router.push('/hours')} subtitle="Opening hours and booking rules" title="Business hours" />
        <ListRow icon="location" onPress={() => router.push('/branches')} subtitle="Where you work" title="Locations" />
        <ListRow icon="mail" onPress={() => router.push('/addresses')} subtitle="Saved and default addresses" title="Addresses" />
        <ListRow icon="company" onPress={() => router.push('/company')} subtitle="Name, contact and logo" title="Business profile" />
      </ListGroup>

      <ListGroup style={styles.group} title="Operations">
        <ListRow icon="team" onPress={() => router.push('/team')} subtitle="Staff, roles and access" title="Team" />
        <ListRow icon="queue" onPress={() => router.push('/queues')} subtitle="Walk-in lines and live calling" title="Queues" />
        <ListRow icon="clock" onPress={() => router.push('/attendance')} subtitle="Who's on shift and hours worked" title="Attendance" />
        <ListRow icon="truck" onPress={() => router.push('/deliveries')} subtitle="Request and track couriers" title="Deliveries" />
      </ListGroup>

      <ListGroup style={styles.group} title="Money">
        <ListRow icon="invoice" onPress={() => router.navigate({ pathname: '/sales', params: { tab: 'invoices' } })} title="Invoices" />
        <ListRow icon="receipt" onPress={() => router.push('/receipts')} subtitle="Paid storefront sales" title="Sales receipts" />
        <ListRow icon="payment" onPress={() => router.push('/billing')} subtitle="Your GigGuru plan payments" title="Billing history" />
      </ListGroup>

      <ListGroup style={styles.group} title="Security">
        <ListRow icon="lock" onPress={() => router.push('/security')} title="Login & security" value={lockEnabled ? 'App lock on' : undefined} />
      </ListGroup>

      <ListGroup style={styles.group}>
        <ListRow
          chevron={false}
          destructive
          icon="sign.out"
          onPress={() => confirmAction('Sign out?', "You'll need your password to sign back in.", 'Sign out', () => void signOut())}
          title="Sign out"
        />
      </ListGroup>

      <Text style={styles.footer}>GigGuru Merchant · v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: Spacing.xxl },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  footer: { textAlign: 'center', color: Colors.textFaint, fontSize: 12, marginTop: Spacing.xxl },
});
