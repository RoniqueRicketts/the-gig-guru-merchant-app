import { SymbolView } from 'expo-symbols';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];

/** One icon vocabulary: SF Symbols on iOS, Material Symbols on Android and web. */
const symbols = {
  home: { ios: 'house', android: 'home', web: 'home' },
  'home.fill': { ios: 'house.fill', android: 'home', web: 'home' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  'plus.square': { ios: 'plus.app', android: 'add_box', web: 'add_box' },
  'plus.square.fill': { ios: 'plus.app.fill', android: 'add_box', web: 'add_box' },
  sales: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  'sales.fill': { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  account: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  'account.fill': { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  'chevron.right': { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  'chevron.left': { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  'chevron.down': { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  'check.circle': { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  reschedule: { ios: 'calendar.badge.clock', android: 'event_repeat', web: 'event_repeat' },
  'no.show': { ios: 'person.fill.xmark', android: 'person_off', web: 'person_off' },
  cancel: { ios: 'xmark.circle', android: 'cancel', web: 'cancel' },
  send: { ios: 'paperplane', android: 'send', web: 'send' },
  invoice: { ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' },
  order: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  payment: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  service: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  product: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
  catalog: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  company: { ios: 'building.2', android: 'business', web: 'business' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  hours: { ios: 'clock.badge.checkmark', android: 'more_time', web: 'more_time' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  biometric: { ios: 'faceid', android: 'fingerprint', web: 'fingerprint' },
  shield: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
  'sign.out': { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  phone: { ios: 'phone', android: 'call', web: 'call' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  team: { ios: 'person.2', android: 'group', web: 'group' },
  person: { ios: 'person', android: 'person', web: 'person' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  'eye.slash': { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  star: { ios: 'star', android: 'star', web: 'star' },
  offline: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  truck: { ios: 'shippingbox.and.arrow.backward', android: 'local_shipping', web: 'local_shipping' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof symbols;

export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return <SymbolView name={symbols[name]} tintColor={color} size={size} />;
}
