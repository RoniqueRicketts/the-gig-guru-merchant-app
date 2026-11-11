import { type Href, type NativeStackNavigationOptions, router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

type StackOptions = NativeStackNavigationOptions;

/** Native-stack defaults shared by every navigator: system fonts, brand tint, no hard header rule. */
export const stackScreenOptions: StackOptions = {
  contentStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
  headerTintColor: Colors.primary,
  headerStyle: { backgroundColor: Colors.background },
  headerLargeStyle: { backgroundColor: Colors.background },
  headerLargeTitleShadowVisible: false,
  headerTitleStyle: { color: Colors.text },
  headerLargeTitleStyle: { color: Colors.text },
  headerBackButtonDisplayMode: 'minimal',
};

/** Tab roots get iOS large titles that collapse into the bar as the content scrolls. */
export const tabRootOptions: StackOptions = {
  headerLargeTitleEnabled: true,
};

/** Plain (edge-to-edge white) list screens such as Sales, Catalog, Team. */
export const plainListOptions: StackOptions = {
  contentStyle: { backgroundColor: Colors.card },
  headerStyle: { backgroundColor: Colors.card },
  headerLargeStyle: { backgroundColor: Colors.card },
};

/**
 * Icon-only header bar button. On iOS 26 the system wraps it in a Liquid Glass capsule;
 * on Android it gets a borderless ripple like a Material top-app-bar action.
 */
export function HeaderButton({
  icon,
  label,
  onPress,
  href,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  href?: Href;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={{ color: Colors.ripple, borderless: true, radius: 20 }}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        if (onPress) onPress();
        else if (href) router.push(href);
      }}
      style={({ pressed }) => [styles.button, Platform.OS !== 'android' && pressed && styles.pressed]}>
      <Icon color={Colors.primary} name={icon} size={Platform.OS === 'ios' ? 20 : 24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
});
