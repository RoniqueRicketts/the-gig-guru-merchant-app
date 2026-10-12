import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, PageHeader, Surface } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';

export default function ActivityScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader eyebrow="KEEP THINGS MOVING" title="Activity" subtitle="Check your appointments and order fulfillment." />
        <Surface style={styles.feature}>
          <Text style={styles.featureEyebrow}>CUSTOMER BOOKINGS</Text>
          <Text style={styles.featureTitle}>Stay on top of the day.</Text>
          <Text style={styles.featureCopy}>See upcoming visits, update appointment status or reschedule when plans change.</Text>
          <AppButton label="View appointments" onPress={() => router.navigate('/appointments')} />
        </Surface>
        <Surface style={styles.card}>
          <View style={styles.icon}><Text style={styles.iconText}>▣</Text></View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Orders</Text>
            <Text style={styles.cardText}>Review incoming orders and update fulfillment status.</Text>
          </View>
          <AppButton label="Open" onPress={() => router.navigate('/orders')} variant="secondary" />
        </Surface>
        <Text style={styles.note}>Payment collection, checkout and refunds are not available in the current API. This app only displays records supported by your merchant API.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 19, paddingBottom: 34, gap: 12 },
  feature: { backgroundColor: Brand.deep, padding: 19 },
  featureEyebrow: { color: '#A6E6A0', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  featureTitle: { color: Brand.white, fontSize: 22, fontWeight: '900', marginTop: 7 },
  featureCopy: { color: '#D5E6D3', fontSize: 13, lineHeight: 19, marginVertical: 9 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Brand.softGreen, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: Brand.deep, fontSize: 22, fontWeight: '800' },
  copy: { flex: 1 },
  cardTitle: { color: Brand.deep, fontWeight: '800', fontSize: 14 },
  cardText: { color: Brand.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  note: { color: Brand.muted, fontSize: 11, lineHeight: 17, paddingHorizontal: 2, marginTop: 4 },
});
