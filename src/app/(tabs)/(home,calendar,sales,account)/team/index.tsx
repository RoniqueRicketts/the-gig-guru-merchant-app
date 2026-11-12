import { router, Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { GatedOrError } from '@/components/gated-state';
import { HeaderButton } from '@/components/navigation';
import { Avatar, EmptyState, Icon, LoadingFooter, ripple, Segmented, SkeletonList, StatusBadge } from '@/components/ui';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useDebounced, usePagedList, useQuery } from '@/hooks/use-api';
import { qs } from '@/lib/api';
import { employee, rows, str, type Row } from '@/lib/format';

type Tab = 'people' | 'roles';
const PAGE = 25;

export default function TeamScreen() {
  const [tab, setTab] = useState<Tab>('people');
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim());

  const peoplePath = useCallback(
    (offset: number) => `/users${qs({ limit: PAGE, offset, q: term ? term.slice(0, 80) : undefined })}`,
    [term]
  );
  const people = usePagedList<Row>(peoplePath, PAGE);
  const roles = useQuery<Row[]>('/roles');
  const roleRows = rows(roles.data);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerRight: () =>
            tab === 'people' ? (
              <HeaderButton icon="person.add" label="Add team member" onPress={() => router.push('/team/edit')} />
            ) : (
              <HeaderButton icon="plus" label="Add role" onPress={() => router.push('/team/role')} />
            ),
        }}
      />
      <View style={styles.container}>
        <Segmented
          onChange={setTab}
          options={[
            { value: 'people', label: 'People' },
            { value: 'roles', label: 'Roles' },
          ]}
          value={tab}
        />
        {tab === 'people' ? (
          <View style={styles.search}>
            <Icon color={Colors.textFaint} name="search" size={16} />
            <TextInput
              accessibilityLabel="Search team"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              maxLength={80}
              onChangeText={setSearch}
              placeholder="Search by name or email"
              placeholderTextColor={Colors.textFaint}
              returnKeyType="search"
              style={styles.searchInput}
              value={search}
            />
          </View>
        ) : null}
      </View>

      {tab === 'people' ? (
        people.loading ? (
          <View style={styles.container}><SkeletonList count={6} /></View>
        ) : people.error && !people.items.length ? (
          <GatedOrError feature="Team" icon="team" message={people.error} onRetry={() => void people.refresh()} status={people.errorStatus} />
        ) : (
          <FlatList
          contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.list}
            data={people.items}
            keyExtractor={(row, index) => str(row.id) || String(index)}
            ListEmptyComponent={
              <EmptyState
                action={term ? undefined : 'Add team member'}
                icon="team"
                message={term ? 'Try a different name or email.' : 'Add staff so you can assign bookings and run the queue together.'}
                onAction={() => router.push('/team/edit')}
                title={term ? 'No matches' : 'Just you for now'}
              />
            }
            ListFooterComponent={<LoadingFooter visible={people.loadingMore} />}
            onEndReached={() => void people.loadMore()}
            onEndReachedThreshold={0.4}
            refreshControl={<RefreshControl onRefresh={() => void people.refresh()} refreshing={people.refreshing} tintColor={Colors.primary} />}
            renderItem={({ item }) => <PersonRow row={item} />}
          />
        )
      ) : roles.loading ? (
        <View style={styles.container}><SkeletonList count={4} /></View>
      ) : roles.error && !roleRows.length ? (
        <GatedOrError feature="Roles" icon="badge" message={roles.error} onRetry={() => void roles.refresh()} status={roles.errorStatus} />
      ) : (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          data={roleRows}
          keyExtractor={(row, index) => str(row.id) || String(index)}
          ListEmptyComponent={
            <EmptyState
              action="Add role"
              icon="badge"
              message="Roles group what each person does, like Front desk or Stylist."
              onAction={() => router.push('/team/role')}
              title="No roles yet"
            />
          }
          refreshControl={<RefreshControl onRefresh={() => void roles.refresh()} refreshing={roles.refreshing} tintColor={Colors.primary} />}
          renderItem={({ item }) => <RoleRow row={item} />}
        />
      )}
    </View>
  );
}

function PersonRow({ row }: { row: Row }) {
  const name = employee.name(row);
  const roleNames = employee.roles(row).map((role) => role.name).filter(Boolean);
  const subtitle = [roleNames.join(', '), str(row.email)].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/team/edit', params: { id: str(row.id) } })}
      android_ripple={ripple}
          style={({ pressed }) => [styles.row, Platform.OS === 'ios' && pressed && styles.rowPressed]}>
      <Avatar name={name} />
      <View style={styles.flex}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.rowTitle}>{name}</Text>
          {row.isAdmin === true ? <Text style={styles.owner}>ADMIN</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.rowSub}>{subtitle || 'No role yet'}</Text>
      </View>
      <Icon color={Colors.textFaint} name="chevron.right" size={14} />
    </Pressable>
  );
}

function RoleRow({ row }: { row: Row }) {
  const active = row.isActive !== false;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/team/role', params: { id: str(row.id) } })}
      android_ripple={ripple}
          style={({ pressed }) => [styles.row, Platform.OS === 'ios' && pressed && styles.rowPressed]}>
      <View style={styles.rowIcon}><Icon color={Colors.primary} name="badge" size={20} /></View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.rowTitle}>{str(row.name) || 'Role'}</Text>
        {str(row.description) ? <Text numberOfLines={1} style={styles.rowSub}>{str(row.description)}</Text> : null}
      </View>
      {active ? null : <StatusBadge label="Inactive" status="neutral" />}
      <Icon color={Colors.textFaint} name="chevron.right" size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: Colors.card },
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.fill,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 10 },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 72 },
  rowPressed: { backgroundColor: Colors.surface },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowTitle: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  owner: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: Colors.primary },
  rowSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});
