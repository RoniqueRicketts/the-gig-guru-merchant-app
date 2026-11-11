import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, ErrorState, Icon, IconButton, LoadingFooter, Segmented, SkeletonList } from '@/components/ui';
import { enumLabel, serviceColorHex } from '@/constants/enums';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePagedList } from '@/hooks/use-api';
import { qs } from '@/lib/api';
import { money, startingPrice, str, type Row } from '@/lib/format';
import { isHttpsUrl } from '@/lib/security';

type Kind = 'services' | 'products';

export default function CatalogScreen() {
  const [kind, setKind] = useState<Kind>('services');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // Debounce server-side search to stay well inside the API rate limit.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const path = useCallback((offset: number) => `/${kind}${qs({ limit: 50, skip: offset, q: query || undefined })}`, [kind, query]);
  const list = usePagedList<Row>(path, 50);
  const editPath = kind === 'services' ? '/services/edit' : '/products/edit';

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton icon="plus" label={`Add ${kind === 'services' ? 'service' : 'product'}`} onPress={() => router.push(editPath)} />,
        }}
      />
      <View style={styles.container}>
        <Segmented
          onChange={(value) => {
            setKind(value);
            setSearch('');
            setQuery('');
          }}
          options={[
            { value: 'services', label: 'Services' },
            { value: 'products', label: 'Products' },
          ]}
          value={kind}
        />
        <View style={styles.search}>
          <Icon color={Colors.textFaint} name="search" size={16} />
          <TextInput
            accessibilityLabel={`Search ${kind}`}
            autoCorrect={false}
            clearButtonMode="while-editing"
            maxLength={100}
            onChangeText={setSearch}
            placeholder={`Search ${kind}`}
            placeholderTextColor={Colors.textFaint}
            style={styles.searchInput}
            value={search}
          />
        </View>
      </View>

      {list.loading ? (
        <View style={styles.container}><SkeletonList count={6} /></View>
      ) : list.error && !list.items.length ? (
        <ErrorState message={list.error} onRetry={() => void list.refresh()} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={list.items}
          keyExtractor={(row, index) => str(row.id) || String(index)}
          ListEmptyComponent={
            <EmptyState
              action={query ? undefined : `Add ${kind === 'services' ? 'a service' : 'a product'}`}
              icon={kind === 'services' ? 'service' : 'product'}
              message={query ? 'Try a different search.' : kind === 'services' ? 'Services are what customers book with you.' : 'Products are items customers can buy.'}
              onAction={() => router.push(editPath)}
              title={query ? 'No matches' : `No ${kind} yet`}
            />
          }
          ListFooterComponent={<LoadingFooter visible={list.loadingMore} />}
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl onRefresh={() => void list.refresh()} refreshing={list.refreshing} tintColor={Colors.primary} />}
          renderItem={({ item }) => <CatalogRow kind={kind} row={item} />}
        />
      )}
    </View>
  );
}

function CatalogRow({ kind, row }: { kind: Kind; row: Row }) {
  const id = str(row.id);
  const image = Array.isArray(row.images) ? str(row.images[0]) : '';
  const color = serviceColorHex(row.color);
  const detail =
    kind === 'services'
      ? [enumLabel(str(row.category)), str(row.duration) ? `${parseInt(str(row.duration), 10) || str(row.duration)} min` : ''].filter(Boolean).join(' · ')
      : [enumLabel(str(row.category)), str(row.sku) ? `SKU ${str(row.sku)}` : ''].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: kind === 'services' ? '/services/edit' : '/products/edit', params: { id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {kind === 'products' && isHttpsUrl(image) ? (
        <Image contentFit="cover" source={{ uri: image }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbIcon, kind === 'services' && { backgroundColor: `${color}1F` }]}>
          <Icon color={kind === 'services' ? color : Colors.primary} name={kind === 'services' ? 'service' : 'product'} size={20} />
        </View>
      )}
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.title}>{str(row.name)}</Text>
        <Text numberOfLines={1} style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.price}>{money(startingPrice(row))}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: Colors.background },
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.md, minHeight: 44, marginBottom: Spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 10 },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 72 },
  rowPressed: { backgroundColor: Colors.surface },
  thumb: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.surface },
  thumbIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.tint },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  detail: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
