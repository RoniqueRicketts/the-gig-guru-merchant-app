import { router, Stack, useLocalSearchParams } from 'expo-router';
import { HeaderButton } from '@/components/navigation';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GatedOrError } from '@/components/gated-state';
import {
  Banner,
  Button,
  ChoiceChips,
  EmptyState,
  Field,
  Icon,
  
  ListGroup,
  ListRow,
  Screen,
  SectionTitle,
  SkeletonList,
  StatusBadge,
  useToast,
} from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { usePolling, useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { durationLabel, get, rows, str, toDate, type Row } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { safeMessage } from '@/lib/security';

/** Live board refresh. ~3 requests/minute keeps well inside the API's shared rate limit. */
const POLL_MS = 20_000;

const sourceLabel: Record<string, string> = { App: 'App', QrCode: 'QR code', Kiosk: 'Walk-in' };

export default function QueueBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const board = useQuery<Row>(id ? `/queues/${seg(id)}/board` : null);
  const [counter, setCounter] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const now = useNow(rows(board.data?.tickets).some((ticket) => str(ticket.status) === 'Called'));

  usePolling(() => void board.reload(), POLL_MS, !!board.data);

  const queue = (get(board.data, 'queue') as Row | undefined) ?? null;
  const tickets = rows(board.data?.tickets);
  const metrics = (get(board.data, 'metrics') as Row | undefined) ?? {};
  const counters = Array.isArray(queue?.counters) ? queue.counters.map(str).filter(Boolean) : [];
  const activeCounter = counter && counters.includes(counter) ? counter : counters[0] ?? null;
  const called = tickets.filter((ticket) => str(ticket.status) === 'Called');
  const waiting = tickets.filter((ticket) => str(ticket.status) === 'Waiting');
  const open = queue?.isOpen !== false;

  const run = async (key: string, task: () => Promise<unknown>, done: string | ((result: unknown) => string)) => {
    setBusy(key);
    try {
      const result = await task();
      toast.success(typeof done === 'function' ? done(result) : done);
      await board.reload();
    } catch (cause) {
      toast.error(safeMessage(cause));
      void board.reload();
    } finally {
      setBusy(null);
    }
  };

  const callNext = () =>
    void run(
      'call',
      () => request(`/queues/${seg(id)}/call-next`, { method: 'POST', body: { counter: activeCounter } }),
      (result) => {
        const ticket = (get(result, 'data') as Row | undefined) ?? {};
        const number = str(ticket.number);
        return number ? `Calling #${number} to ${activeCounter}` : `Called the next customer to ${activeCounter}`;
      }
    );

  const setOpen = (next: boolean) =>
    void run('open', () => request(`/queues/${seg(id)}`, { method: 'PATCH', body: { isOpen: next } }), next ? 'Queue is open' : 'Queue closed to new tickets');

  if (board.loading) return <Screen edges={['left', 'right']}><SkeletonList count={5} /></Screen>;
  if (!board.data) {
    return (
      <GatedOrError feature="Queue management" icon="queue" message={board.error ?? "We couldn't load this queue."} onRetry={() => void board.refresh()} status={board.errorStatus} />
    );
  }

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <View style={styles.footer}>
          <Button icon="walk" label="Walk-in" onPress={() => setWalkInOpen(true)} style={styles.walkIn} variant="secondary" />
          <Button
            disabled={!waiting.length || !activeCounter}
            icon="megaphone"
            label={waiting.length ? `Call next${counters.length > 1 && activeCounter ? ` · ${activeCounter}` : ''}` : 'No one waiting'}
            loading={busy === 'call'}
            onPress={callNext}
            style={styles.flex}
          />
        </View>
      }
      refreshControl={<RefreshControl onRefresh={() => void board.refresh()} refreshing={board.refreshing} tintColor={Colors.primary} />}>
      <Stack.Screen
        options={{
          title: str(queue?.name) || 'Queue',
          headerRight: () => <HeaderButton icon="edit" label="Edit queue" onPress={() => router.push({ pathname: '/queues/edit', params: { id } })} />,
        }}
      />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>LIVE</Text>
          <Pressable
            accessibilityLabel={open ? 'Close queue to new tickets' : 'Open queue'}
            accessibilityRole="switch"
            accessibilityState={{ checked: open, busy: busy === 'open' }}
            disabled={busy === 'open'}
            onPress={() => setOpen(!open)}
            style={[styles.openPill, !open && styles.closedPill]}>
            <View style={[styles.dot, !open && styles.dotClosed]} />
            <Text style={styles.openText}>{open ? 'Open' : 'Closed'}</Text>
          </Pressable>
        </View>
        <View style={styles.stats}>
          <Stat label="Waiting" value={String(Number(metrics.waiting) || waiting.length)} />
          <Stat label="Served today" value={String(Number(metrics.servedToday) || 0)} />
          <Stat label="Avg wait" value={metrics.avgWaitSeconds == null ? '—' : durationLabel(metrics.avgWaitSeconds)} />
        </View>
        {Number(metrics.secondsPerTicket) > 0 && waiting.length ? (
          <Text style={styles.heroNote}>New customers wait about {durationLabel(Number(metrics.secondsPerTicket) * (waiting.length + 1))}</Text>
        ) : null}
      </View>

      {!open ? <Banner message="Closed to new tickets. Customers already in line can still be called." tone="warning" /> : null}
      {board.error ? <Banner message={board.error} /> : null}

      {counters.length > 1 ? (
        <View style={styles.counterPick}>
          <ChoiceChips label="You're calling to" onChange={setCounter} options={counters.map((value) => ({ value, label: value }))} value={activeCounter} />
        </View>
      ) : null}

      <SectionTitle title="Now serving" />
      {called.length ? (
        called.map((ticket) => (
          <ServingCard
            busy={busy}
            key={str(ticket.id)}
            now={now}
            onComplete={() => void run(`done:${str(ticket.id)}`, () => request(`/queues/tickets/${seg(str(ticket.id))}/complete`, { method: 'POST' }), `#${str(ticket.number)} served`)}
            onRecall={() => void run(`recall:${str(ticket.id)}`, () => request(`/queues/tickets/${seg(str(ticket.id))}/recall`, { method: 'POST' }), `Called #${str(ticket.number)} again`)}
            onSkip={() => void run(`skip:${str(ticket.id)}`, () => request(`/queues/tickets/${seg(str(ticket.id))}/skip`, { method: 'POST' }), `#${str(ticket.number)} skipped`)}
            ticket={ticket}
          />
        ))
      ) : (
        <View style={styles.idle}>
          <Text style={Type.caption}>{waiting.length ? 'Tap Call next when a counter is free.' : 'No one at a counter right now.'}</Text>
        </View>
      )}

      <SectionTitle title={`In line${waiting.length ? ` · ${waiting.length}` : ''}`} />
      {waiting.length ? (
        <ListGroup>
          {waiting.map((ticket) => (
            <ListRow
              key={str(ticket.id)}
              leading={
                <View style={styles.number}>
                  <Text style={styles.numberText}>{str(ticket.number)}</Text>
                </View>
              }
              subtitle={`${sourceLabel[str(ticket.source)] ?? 'Ticket'} · waiting ${durationLabel(waitedSeconds(ticket.joinedAt, now))}`}
              title={str(ticket.name) || 'Customer'}
              value={`#${Math.max(1, Number(ticket.position) - 1)}`}
            />
          ))}
        </ListGroup>
      ) : (
        <EmptyState
          icon="ticket"
          message={open ? 'Customers join from the GigGuru app or your QR code. Add walk-ins with the button below.' : 'Open the queue to let customers join.'}
          title="The line is empty"
        />
      )}

      <WalkInSheet
        onClose={() => setWalkInOpen(false)}
        onIssue={async (guestName) => {
          try {
            const result = await request<unknown>(`/queues/${seg(id)}/walk-ins`, { method: 'POST', body: guestName ? { guestName } : {} });
            const number = str(get(result, 'data', 'number'));
            toast.success(number ? `Ticket #${number} issued` : 'Walk-in added');
            setWalkInOpen(false);
            void board.reload();
          } catch (cause) {
            return safeMessage(cause);
          }
          return null;
        }}
        visible={walkInOpen}
      />
    </Screen>
  );
}

function waitedSeconds(joinedAt: unknown, now: number): number {
  const joined = toDate(joinedAt)?.getTime();
  return joined ? Math.max(0, (now - joined) / 1000) : 0;
}

/** Ticks every second while `active` (for grace countdowns); otherwise every 30s for wait times. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), active ? 1000 : 30_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ServingCard({
  ticket,
  now,
  busy,
  onComplete,
  onRecall,
  onSkip,
}: {
  ticket: Row;
  now: number;
  busy: string | null;
  onComplete: () => void;
  onRecall: () => void;
  onSkip: () => void;
}) {
  const id = str(ticket.id);
  const graceEnds = toDate(ticket.graceEndsAt)?.getTime() ?? 0;
  const graceLeft = Math.max(0, Math.ceil((graceEnds - now) / 1000));
  const recalls = Number(ticket.recallCount) || 0;

  return (
    <View style={styles.serving}>
      <View style={styles.servingTop}>
        <View style={styles.bigNumber}>
          <Text style={styles.bigNumberText}>{str(ticket.number)}</Text>
        </View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={Type.headline}>{str(ticket.name) || 'Customer'}</Text>
          <Text style={Type.caption}>
            {str(ticket.counter) || 'Counter'}
            {recalls ? ` · called ${recalls + 1}×` : ''}
          </Text>
        </View>
        {graceLeft > 0 ? (
          <View style={styles.grace}>
            <Icon color={Colors.warning} name="timer" size={14} />
            <Text style={styles.graceText}>{graceLeft >= 60 ? `${Math.floor(graceLeft / 60)}:${String(graceLeft % 60).padStart(2, '0')}` : `${graceLeft}s`}</Text>
          </View>
        ) : (
          <StatusBadge label="At counter" status="In_Progress" />
        )}
      </View>
      <View style={styles.servingActions}>
        <Button icon="check" label="Done" loading={busy === `done:${id}`} onPress={onComplete} size="md" style={styles.flex} />
        <Button icon="recall" label="Recall" loading={busy === `recall:${id}`} onPress={onRecall} size="md" style={styles.flex} variant="secondary" />
        <Button
          accessibilityHint={graceLeft > 0 ? 'Available when the grace time runs out' : undefined}
          disabled={graceLeft > 0}
          icon="skip"
          label={graceLeft > 0 ? 'Skip' : 'No-show'}
          loading={busy === `skip:${id}`}
          onPress={onSkip}
          size="md"
          style={styles.flex}
          variant="danger"
        />
      </View>
    </View>
  );
}

function WalkInSheet({ visible, onClose, onIssue }: { visible: boolean; onClose: () => void; onIssue: (guestName: string) => Promise<string | null> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const failure = await onIssue(name.trim());
    setSaving(false);
    if (failure) {
      haptic.error();
      setError(failure);
    } else setName('');
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.sheet}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={Type.title}>Add walk-in</Text>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={10} onPress={onClose}>
              <Icon color={Colors.text} name="close" size={20} />
            </Pressable>
          </View>
          <Text style={[Type.caption, styles.sheetLead]}>Issue a ticket for someone without the app. Their number joins the end of the line.</Text>
          {error ? <Banner message={error} /> : null}
          <Field
            autoCapitalize="words"
            autoFocus
            label="Name"
            maxLength={80}
            onChangeText={setName}
            onSubmitEditing={() => void submit()}
            placeholder="Optional · shown when you call them"
            returnKeyType="done"
            value={name}
          />
          <Button icon="ticket" label="Issue ticket" loading={saving} onPress={() => void submit()} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: Spacing.sm },
  walkIn: { paddingHorizontal: Spacing.lg },
  hero: { backgroundColor: Colors.deep, borderRadius: Radius.xl, padding: Spacing.xl, marginTop: Spacing.lg, marginBottom: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: Colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 12, borderRadius: Radius.pill, backgroundColor: 'rgba(2,200,0,0.16)' },
  closedPill: { backgroundColor: 'rgba(255,255,255,0.12)' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  dotClosed: { backgroundColor: '#B8CCB7' },
  openText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  stats: { flexDirection: 'row', marginTop: Spacing.lg },
  statValue: { color: Colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: '#B8CCB7', fontSize: 13, marginTop: 2 },
  heroNote: { color: '#B8CCB7', fontSize: 13, marginTop: Spacing.md },
  counterPick: { marginTop: Spacing.sm },
  idle: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center' },
  serving: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.card },
  servingTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bigNumber: { minWidth: 56, height: 56, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  bigNumberText: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  grace: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.warningTint, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  graceText: { color: Colors.warning, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  servingActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  number: { width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  sheet: { flex: 1, backgroundColor: Colors.card, paddingHorizontal: Spacing.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.lg },
  sheetLead: { marginBottom: Spacing.lg, lineHeight: 19 },
});
