import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, PageHeader, Surface } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';

const sections = [
  { title: 'Appointments', detail: 'Bookings, status and rescheduling', icon: 'calendar', href: '/appointments', color: '#EAF4E9' },
  { title: 'Services', detail: 'Your service menu and pricing', icon: 'sparkles', href: '/services', color: '#EEF6E8' },
  { title: 'Products', detail: 'Catalog, prices and branch stock', icon: 'shippingbox.fill', href: '/products', color: '#F1F5E9' },
  { title: 'Schedule', detail: 'Business hours, breaks and limits', icon: 'clock.fill', href: '/schedules', color: '#EDF6F1' },
  { title: 'Branches', detail: 'Your business work locations', icon: 'mappin.and.ellipse', href: '/branches', color: '#F2F6E9' },
  { title: 'Addresses', detail: 'Saved and default addresses', icon: 'mappin', href: '/addresses', color: '#EEF5ED' },
  { title: 'Company profile', detail: 'Business name and contact details', icon: 'building.2.fill', href: '/company', color: '#ECF4E8' },
];

export default function ManageScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="YOUR BUSINESS" title="Manage" subtitle="Everything for your business, in one place." />
        <View style={styles.list}>
          {sections.map((section) => (
            <Surface key={section.title} style={styles.card}>
              <View style={[styles.icon, { backgroundColor: section.color }]}>
                <Text style={styles.iconText}>{section.icon === 'calendar' ? '◷' : section.icon === 'clock.fill' ? '◴' : section.icon === 'mappin' || section.icon === 'mappin.and.ellipse' ? '⌖' : section.icon === 'building.2.fill' ? '▦' : section.icon === 'shippingbox.fill' ? '□' : '✳'}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{section.title}</Text>
                <Text style={styles.detail}>{section.detail}</Text>
              </View>
              <AppButton icon="chevron.right" label="Open" onPress={() => router.navigate(section.href as never)} variant="quiet" />
            </Surface>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 19, paddingBottom: 34 },
  list: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 11 },
  icon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  iconText: { color: Brand.deep, fontSize: 21, fontWeight: '800' },
  copy: { flex: 1 },
  title: { color: Brand.deep, fontSize: 14, fontWeight: '800' },
  detail: { color: Brand.muted, fontSize: 11, marginTop: 4 },
});
