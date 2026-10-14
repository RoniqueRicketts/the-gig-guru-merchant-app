import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, AppIcon, FormField, InlineNotice, PageHeader, Surface, type AppIconName } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { session, signOut, changePassword } = useAuth();
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const updatePassword = async () => {
    setError(null);
    setMessage(null);
    if (!currentPassword || !newPassword) {
      setError('Enter your current and new password.');
      return;
    }
    setWorking(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Your password has been changed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change your password.');
    } finally {
      setWorking(false);
    }
  };

  const logOut = async () => {
    setWorking(true);
    setError(null);
    try {
      await signOut();
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'You were signed out locally, but the server could not revoke the session.');
      router.replace('/');
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="GIGGURU MERCHANT" title="More" subtitle="Business tools, your account and settings." />
        {error ? <InlineNotice message={error} /> : null}
        {message ? <InlineNotice message={message} tone="info" /> : null}
        <Surface style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{session?.email.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.identityCopy}>
            <Text style={styles.identityName}>{session?.email}</Text>
            <Text style={styles.identitySub}>Signed in to GigGuru Merchant</Text>
          </View>
        </Surface>
        <Text style={styles.groupTitle}>BUSINESS TOOLS</Text>
        <Surface style={styles.actionCard}>
          <SettingRow title="Appointments" detail="Open your calendar and manage bookings" icon="calendar" onPress={() => router.navigate('/(tabs)/manage')} />
          <View style={styles.divider} />
          <SettingRow title="Services" detail="Edit your service menu and pricing" icon="sparkles" onPress={() => router.navigate('/services')} />
          <View style={styles.divider} />
          <SettingRow title="Products" detail="Browse and update your product catalog" icon="shippingbox.fill" onPress={() => router.navigate('/products')} />
          <View style={styles.divider} />
          <SettingRow title="Orders" detail="Review orders and fulfillment status" icon="bag.fill" onPress={() => router.navigate('/orders')} />
          <View style={styles.divider} />
          <SettingRow title="Invoices" detail="Check amounts, due dates and payment status" icon="doc.text.fill" onPress={() => router.navigate('/(tabs)/invoices')} />
          <View style={styles.divider} />
          <SettingRow title="Schedule" detail="Set your business hours and availability" icon="clock.fill" onPress={() => router.navigate('/schedules')} />
          <View style={styles.divider} />
          <SettingRow title="Branches" detail="Manage your business locations" icon="mappin.and.ellipse" onPress={() => router.navigate('/branches')} />
          <View style={styles.divider} />
          <SettingRow title="Company profile" detail="Business name, contact and appearance" icon="building.2.fill" onPress={() => router.navigate('/company')} />
          <View style={styles.divider} />
          <SettingRow title="Addresses" detail="Saved and default business addresses" icon="mappin.and.ellipse" onPress={() => router.navigate('/addresses')} />
        </Surface>
        <Text style={styles.groupTitle}>SECURITY</Text>
        <Surface style={styles.actionCard}>
          <SettingRow title="Change password" detail="Update your sign-in credentials" icon="lock.fill" onPress={() => setPasswordModal(true)} />
          <View style={styles.divider} />
          <SettingRow title="Privacy & data" detail="Your session tokens are stored securely on this device." icon="hand.raised.fill" />
        </Surface>
        <AppButton label="Sign out" loading={working} onPress={() => void logOut()} variant="danger" style={styles.signOut} />
        <Text style={styles.footer}>YOUR BUSINESS. YOUR WAY.</Text>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setPasswordModal(false)} transparent visible={passwordModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
          <View style={styles.scrim} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Change password</Text>
            {error ? <InlineNotice message={error} /> : null}
            <FormField autoCapitalize="none" label="Current password" onChangeText={setCurrentPassword} secureTextEntry value={currentPassword} />
            <FormField autoCapitalize="none" label="New password" onChangeText={setNewPassword} secureTextEntry value={newPassword} hint="At least 8 characters with uppercase, lowercase, number and symbol." />
            <AppButton label="Save password" loading={working} onPress={() => void updatePassword()} />
            <AppButton label="Cancel" onPress={() => setPasswordModal(false)} variant="quiet" />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SettingRow({ title, detail, icon, onPress }: { title: string; detail: string; icon: AppIconName; onPress?: () => void }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}><AppIcon name={icon} color={Brand.green} size={18} /></View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      {onPress ? <AppButton icon="chevron.right" label="Open" onPress={onPress} variant="quiet" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 19, paddingBottom: 38 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 19 },
  avatar: { width: 51, height: 51, borderRadius: 17, backgroundColor: Brand.deep, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Brand.white, fontSize: 20, fontWeight: '800' },
  identityCopy: { flex: 1 },
  identityName: { color: Brand.deep, fontSize: 14, fontWeight: '800' },
  identitySub: { color: Brand.muted, fontSize: 11, marginTop: 4 },
  groupTitle: { color: Brand.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8, marginTop: 9, marginLeft: 3 },
  actionCard: { paddingHorizontal: 14, paddingVertical: 2 },
  settingRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: Brand.softGreen, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1 },
  settingTitle: { color: Brand.deep, fontSize: 13, fontWeight: '800' },
  settingDetail: { color: Brand.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  divider: { height: 1, backgroundColor: '#EEF3ED', marginLeft: 46 },
  signOut: { marginTop: 21 },
  footer: { color: Brand.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 24 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,20,0,0.38)' },
  sheet: { backgroundColor: Brand.canvas, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 4, backgroundColor: '#C6D4C4', alignSelf: 'center', marginBottom: 15 },
  modalTitle: { color: Brand.deep, fontSize: 20, fontWeight: '800', marginBottom: 16 },
});
