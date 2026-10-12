import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Business</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const icon =
    children === 'Home'
      ? ({ ios: 'house.fill', android: 'home', web: 'home' } as const)
      : ({ ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' } as const);

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <View style={[styles.tabButtonView, isFocused && styles.tabButtonSelected]}>
        <SymbolView
          name={icon}
          tintColor={isFocused ? Brand.deep : Brand.muted}
          size={17}
        />
        <Text style={[styles.tabText, isFocused ? styles.tabTextSelected : styles.tabTextIdle]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    bottom: 0,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-around',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.border,
    shadowColor: Brand.deep,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  pressed: {
    opacity: 0.7,
  },
  pressable: {
    borderRadius: Spacing.three,
  },
  tabButtonView: {
    minWidth: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 22,
  },
  tabButtonSelected: {
    backgroundColor: '#E8F3E7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: Brand.deep,
    fontWeight: '700',
  },
  tabTextIdle: {
    color: Brand.muted,
  },
});
