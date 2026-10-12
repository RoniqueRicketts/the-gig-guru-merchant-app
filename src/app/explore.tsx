import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, MaxContentWidth } from '@/constants/theme';

const merchantAreas = [
  {
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    title: 'Appointments & services',
    description: 'Manage services, schedules and bookings.',
    color: '#A78BFA',
  },
  {
    icon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
    title: 'Orders & products',
    description: 'Keep products and fulfillment organized.',
    color: '#EF9693',
  },
  {
    icon: { ios: 'doc.text', android: 'description', web: 'description' },
    title: 'Invoices & payments',
    description: 'Create invoices and review payment records.',
    color: '#E7CE4A',
  },
  {
    icon: { ios: 'person.2', android: 'group', web: 'group' },
    title: 'Team & locations',
    description: 'Manage staff, roles and business branches.',
    color: '#8FC8F5',
  },
] as const;

const upcomingFeatures = [
  {
    icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
    title: 'Stripe payments',
    description: 'Secure payment collection and clear payment status.',
    color: '#A78BFA',
  },
  {
    icon: { ios: 'map', android: 'map', web: 'map' },
    title: 'Live tracking',
    description: 'Follow services or deliveries on a map.',
    color: '#8FC8F5',
  },
  {
    icon: { ios: 'bolt.horizontal.circle', android: 'bolt', web: 'bolt' },
    title: 'Instant updates',
    description: 'Live status changes over a secure connection.',
    color: '#EF9693',
  },
] as const;

export default function BusinessScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <Image
                accessibilityLabel="GigGuru"
                contentFit="contain"
                source={require('@/assets/images/lime-green-logo.png')}
                style={styles.brandLogo}
              />
              <Text style={styles.brandName}>GigGuru</Text>
            </View>
            <Text style={styles.headerLabel}>MERCHANT HUB</Text>
          </View>

          <View style={styles.pageTitle}>
            <Text style={styles.eyebrow}>YOUR BUSINESS, YOUR WAY</Text>
            <Text style={styles.title}>Business hub</Text>
            <Text style={styles.subtitle}>The tools to keep your work moving.</Text>
          </View>

          <View style={styles.notice}>
            <View style={styles.noticeIcon}>
              <SymbolView
                name={{ ios: 'info', android: 'info', web: 'info' }}
                tintColor={Brand.deep}
                size={18}
              />
            </View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Your account isn&apos;t connected yet</Text>
              <Text style={styles.noticeDescription}>
                These tools are ready to build against the API. No business data or transactions
                are simulated here.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Merchant tools</Text>
              <View style={styles.apiPill}>
                <View style={styles.apiDot} />
                <Text style={styles.apiPillText}>API READY</Text>
              </View>
            </View>
            <Text style={styles.sectionDescription}>
              Supported by your merchant API. Screens and secure account access still need to be
              connected.
            </Text>
            <View style={styles.areaList}>
              {merchantAreas.map((area, index) => (
                <View
                  key={area.title}
                  style={[styles.areaRow, index < merchantAreas.length - 1 && styles.rowDivider]}>
                  <View style={[styles.areaIcon, { backgroundColor: area.color }]}>
                    <SymbolView name={area.icon} tintColor={Brand.white} size={20} />
                  </View>
                  <View style={styles.areaCopy}>
                    <Text style={styles.areaTitle}>{area.title}</Text>
                    <Text style={styles.areaDescription}>{area.description}</Text>
                  </View>
                  <View style={styles.apiTag}>
                    <Text style={styles.apiTagText}>API</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>On the roadmap</Text>
              <Text style={styles.plannedCaption}>COMING NEXT</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Planned features that need new backend support before they can go live.
            </Text>
            <View style={styles.featureList}>
              {upcomingFeatures.map((feature, index) => (
                <View
                  key={feature.title}
                  style={[
                    styles.featureRow,
                    index < upcomingFeatures.length - 1 && styles.rowDivider,
                  ]}>
                  <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                    <SymbolView name={feature.icon} tintColor={Brand.white} size={19} />
                  </View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                  <Text style={styles.plannedText}>PLANNED</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.securityCard}>
            <View style={styles.securityHeading}>
              <View style={styles.securityLogoWrap}>
                <Image
                  accessibilityLabel="GigGuru"
                  contentFit="contain"
                  source={require('@/assets/images/white-logo.png')}
                  style={styles.securityLogo}
                />
              </View>
              <View style={styles.securityHeadingCopy}>
                <Text style={styles.securityEyebrow}>SECURITY FIRST</Text>
                <Text style={styles.securityTitle}>Protecting trust, by design.</Text>
              </View>
            </View>
            <SecurityRule text="Payment secrets stay on the server." />
            <SecurityRule text="Sign-in tokens use platform secure storage." />
            <SecurityRule text="Changes appear only after server confirmation." />
            <Text style={styles.securityFootnote}>
              Sign-in and secure API access are not connected in this preview.
            </Text>
          </View>

          <View style={styles.logoFooter}>
            <Image
              accessibilityLabel="GigGuru, Sell Buy Fulfill"
              contentFit="contain"
              source={require('@/assets/images/logo-long.png')}
              style={styles.fullLogo}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SecurityRule({ text }: { text: string }) {
  return (
    <View style={styles.securityRule}>
      <SymbolView
        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
        tintColor="#A5F1B5"
        size={17}
      />
      <Text style={styles.securityRuleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    backgroundColor: Brand.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 25,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 21,
  },
  header: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 32,
    height: 32,
  },
  brandName: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerLabel: {
    color: '#AFC0DE',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pageTitle: {
    gap: 6,
    paddingTop: 2,
  },
  eyebrow: {
    color: '#B0C0DA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: Brand.white,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 1,
  },
  subtitle: {
    color: '#C5D0E2',
    fontSize: 13,
    lineHeight: 19,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderRadius: 19,
    backgroundColor: '#2B3A57',
    borderWidth: 1,
    borderColor: '#3B4C6A',
  },
  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#E7CE4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
  noticeDescription: {
    color: '#C5D0E2',
    fontSize: 11,
    lineHeight: 17,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: Brand.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  apiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#304961',
  },
  apiDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#A5F1B5',
  },
  apiPillText: {
    color: '#CCF4D4',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  plannedCaption: {
    color: '#AFC0DE',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionDescription: {
    color: '#BAC6DA',
    fontSize: 11,
    lineHeight: 17,
    marginTop: -3,
  },
  areaList: {
    paddingHorizontal: 13,
    backgroundColor: '#283652',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#354563',
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 68,
    paddingVertical: 9,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#3A4965',
  },
  areaIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaCopy: {
    flex: 1,
    gap: 3,
  },
  areaTitle: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '700',
  },
  areaDescription: {
    color: '#B8C5DC',
    fontSize: 10,
    lineHeight: 15,
  },
  apiTag: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#394967',
  },
  apiTagText: {
    color: '#D7E3F4',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  featureList: {
    paddingHorizontal: 13,
    backgroundColor: '#283652',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#354563',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 68,
    paddingVertical: 9,
  },
  featureIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '700',
  },
  featureDescription: {
    color: '#B8C5DC',
    fontSize: 10,
    lineHeight: 15,
  },
  plannedText: {
    color: '#D1DBEB',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.35,
  },
  securityCard: {
    padding: 16,
    borderRadius: 21,
    backgroundColor: '#151F36',
    gap: 11,
    borderWidth: 1,
    borderColor: '#34425E',
  },
  securityHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  securityLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#2B3A57',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityLogo: {
    width: 24,
    height: 24,
  },
  securityHeadingCopy: {
    flex: 1,
    gap: 3,
  },
  securityEyebrow: {
    color: '#AFC0DE',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  securityTitle: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: '700',
  },
  securityRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityRuleText: {
    flex: 1,
    color: '#D8E0EF',
    fontSize: 10,
    lineHeight: 16,
  },
  securityFootnote: {
    color: '#AFC0DE',
    fontSize: 9,
    lineHeight: 15,
    borderTopWidth: 1,
    borderTopColor: '#34425E',
    paddingTop: 10,
    marginTop: 1,
  },
  logoFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingVertical: 10,
    marginTop: -3,
  },
  fullLogo: {
    width: 140,
    height: 38,
  },
});
