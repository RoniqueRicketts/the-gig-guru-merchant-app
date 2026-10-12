import { router } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, MaxContentWidth } from '@/constants/theme';

const tools = [
  {
    title: 'Services',
    detail: 'Appointments & schedules',
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    background: '#A78BFA',
    action: 'Explore',
  },
  {
    title: 'Products',
    detail: 'Products & orders',
    icon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
    background: '#EF9693',
    action: 'Explore',
  },
  {
    title: 'Invoices',
    detail: 'Billing & payment records',
    icon: { ios: 'doc.text', android: 'description', web: 'description' },
    background: '#E7CE4A',
    action: 'Explore',
  },
  {
    title: 'Your team',
    detail: 'Staff & locations',
    icon: { ios: 'person.2', android: 'group', web: 'group' },
    background: '#8FC8F5',
    action: 'Explore',
  },
] as const;

export default function HomeScreen() {
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
              <View>
                <Text style={styles.brandTitle}>GigGuru</Text>
                <Text style={styles.brandSubtitle}>MERCHANT</Text>
              </View>
            </View>
            <View style={styles.headerPill}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerPillText}>YOUR SPACE</Text>
            </View>
          </View>

          <View style={styles.greeting}>
            <Text style={styles.greetingEyebrow}>WELCOME TO YOUR BUSINESS HUB</Text>
            <Text style={styles.greetingTitle}>
              Your business,{'\n'}in your pocket.
            </Text>
            <Text style={styles.greetingDescription}>
              Good things happen when the busywork gets simpler.
            </Text>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityTop}>
              <View style={styles.activityIcon}>
                <SymbolView
                  name={{ ios: 'chart.bar.xaxis', android: 'bar_chart', web: 'bar_chart' }}
                  tintColor={Brand.white}
                  size={19}
                />
              </View>
              <View style={styles.activityLabel}>
                <Text style={styles.activityEyebrow}>YOUR BUSINESS AT A GLANCE</Text>
                <Text style={styles.activityTitle}>A fresh start</Text>
              </View>
              <SymbolView
                name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                tintColor="#BAC6DA"
                size={22}
              />
            </View>
            <Text style={styles.activityMessage}>
              Sign-in and account data will appear here once connected. There&apos;s no sample
              activity in this preview.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/explore')}
              style={({ pressed }) => [styles.activityAction, pressed && styles.pressed]}>
              <Text style={styles.activityActionText}>See what&apos;s available</Text>
              <SymbolView
                name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                tintColor={Brand.deep}
                size={16}
              />
            </Pressable>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Your tools</Text>
              <Text style={styles.sectionDescription}>Everything in its right place.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/explore')}
              hitSlop={8}
              style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
              <Text style={styles.seeAllText}>See all</Text>
              <SymbolView
                name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                tintColor="#AFC0DE"
                size={14}
              />
            </Pressable>
          </View>

          <View style={styles.toolGrid}>
            {tools.map((tool) => (
              <Pressable
                key={tool.title}
                accessibilityRole="button"
                accessibilityLabel={`${tool.title}, ${tool.detail}. Open the business hub.`}
                onPress={() => router.navigate('/explore')}
                style={({ pressed }) => [
                  styles.toolCard,
                  { backgroundColor: tool.background },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.toolCardTop}>
                  <View style={styles.toolIcon}>
                    <SymbolView name={tool.icon} tintColor={Brand.white} size={24} />
                  </View>
                  <SymbolView
                    name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
                    tintColor="rgba(27,39,66,0.55)"
                    size={18}
                  />
                </View>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDetail}>{tool.detail}</Text>
                <View style={styles.toolFooter}>
                  <Text style={styles.toolAction}>{tool.action}</Text>
                  <SymbolView
                    name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }}
                    tintColor={Brand.deep}
                    size={14}
                  />
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.roadmapCard}>
            <View style={styles.roadmapLogo}>
              <Image
                accessibilityLabel="GigGuru"
                contentFit="contain"
                source={require('@/assets/images/white-logo.png')}
                style={styles.roadmapLogoImage}
              />
            </View>
            <View style={styles.roadmapCopy}>
              <Text style={styles.roadmapTitle}>Made for what&apos;s next</Text>
              <Text style={styles.roadmapDescription}>
                Payments, live maps and instant updates are on the roadmap.
              </Text>
            </View>
            <View style={styles.roadmapTag}>
              <Text style={styles.roadmapTagText}>SOON</Text>
            </View>
          </View>

          <Text style={styles.footer}>MADE FOR THE PEOPLE BEHIND THE BUSINESS</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: Platform.OS === 'web' ? 100 : 20,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 21,
  },
  header: {
    minHeight: 44,
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
    width: 37,
    height: 37,
  },
  brandTitle: {
    color: Brand.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    color: '#AFC0DE',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A3856',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#86E4AB',
  },
  headerPillText: {
    color: '#D6DFEF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  greeting: {
    gap: 7,
    paddingTop: 6,
    paddingBottom: 1,
  },
  greetingEyebrow: {
    color: '#AFC0DE',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  greetingTitle: {
    color: Brand.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 37,
    marginTop: 1,
  },
  greetingDescription: {
    color: '#C5D0E2',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 1,
  },
  activityCard: {
    padding: 17,
    borderRadius: 22,
    backgroundColor: '#283652',
    borderWidth: 1,
    borderColor: '#354563',
    gap: 13,
  },
  activityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  activityIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: '#3A4A69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLabel: {
    flex: 1,
    gap: 4,
  },
  activityEyebrow: {
    color: '#BAC6DA',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activityTitle: {
    color: Brand.white,
    fontSize: 16,
    fontWeight: '700',
  },
  activityMessage: {
    color: '#CAD4E5',
    fontSize: 12,
    lineHeight: 18,
  },
  activityAction: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    gap: 15,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: '#F8F9FC',
  },
  activityActionText: {
    color: Brand.deep,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 1,
    marginBottom: -8,
  },
  sectionTitle: {
    color: Brand.white,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionDescription: {
    color: '#B8C5DC',
    fontSize: 12,
    marginTop: 3,
  },
  seeAll: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 3,
  },
  seeAllText: {
    color: '#D7E0F0',
    fontSize: 11,
    fontWeight: '600',
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 145,
    padding: 14,
    borderRadius: 19,
    justifyContent: 'space-between',
  },
  toolCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  toolIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    color: Brand.deep,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 11,
  },
  toolDetail: {
    color: 'rgba(27,39,66,0.78)',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  toolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  toolAction: {
    color: Brand.deep,
    fontSize: 10,
    fontWeight: '700',
  },
  roadmapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 19,
    backgroundColor: '#283652',
    borderWidth: 1,
    borderColor: '#354563',
  },
  roadmapLogo: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#364664',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadmapLogoImage: {
    width: 23,
    height: 23,
  },
  roadmapCopy: {
    flex: 1,
    gap: 3,
  },
  roadmapTitle: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '700',
  },
  roadmapDescription: {
    color: '#B8C5DC',
    fontSize: 10,
    lineHeight: 15,
  },
  roadmapTag: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: '#394967',
  },
  roadmapTagText: {
    color: '#D8E3F3',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    color: '#8998B3',
    fontSize: 8,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: -6,
  },
  pressed: {
    opacity: 0.78,
  },
});
