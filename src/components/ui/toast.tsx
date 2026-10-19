import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

type Toast = { id: number; message: string; tone: 'success' | 'error' };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Confirms one-tap actions without interrupting the flow (no blocking alerts). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: Toast['tone']) => {
    if (tone === 'success') haptic.success();
    else haptic.error();
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
  }, []);

  const hide = useCallback(() => setToast(null), []);

  const api = useMemo<ToastApi>(
    () => ({ success: (message) => show(message, 'success'), error: (message) => show(message, 'error') }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? <ToastView key={toast.id} onDone={hide} toast={toast} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 8 }),
      Animated.delay(2200),
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onDone());
    return () => animation.stop();
  }, [progress, onDone]);

  const error = toast.tone === 'error';
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + Spacing.sm }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          error && { backgroundColor: Colors.danger },
          { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
        ]}>
        <Icon color={error ? Colors.white : Colors.accent} name={error ? 'warning' : 'check.circle'} size={18} />
        <Text numberOfLines={2} style={styles.text}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider.');
  return context;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, alignItems: 'center', zIndex: 1000 },
  toast: {
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.ink,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { color: Colors.white, fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
