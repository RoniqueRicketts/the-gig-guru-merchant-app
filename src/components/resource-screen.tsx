import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, FormField, InlineNotice, PageHeader, Surface } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';
import { request, unwrapData } from '@/lib/api';

type RecordValue = Record<string, unknown>;
type FieldKind = 'text' | 'multiline' | 'number' | 'list' | 'boolean';
type FieldSpec = {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  hint?: string;
};
type ResourceConfig = {
  title: string;
  endpoint: string;
  description: string;
  fields: FieldSpec[];
  editFields?: FieldSpec[];
  query?: (search: string, offset: number) => string;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  primaryKey?: string;
  titleKey?: string;
  subtitleKeys?: string[];
  makeCreateBody: (values: Record<string, string>) => RecordValue;
  makeUpdateBody: (values: Record<string, string>) => RecordValue;
};

const splitList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

function stringValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join(', ');
  if (value === null || value === undefined) return '';
  return String(value);
}

function recordName(record: RecordValue, config: ResourceConfig): string {
  const name = record[config.titleKey || 'name'];
  return typeof name === 'string' && name.trim() ? name : config.title.slice(0, -1);
}

function recordId(record: RecordValue, config: ResourceConfig): string | null {
  const id = record[config.primaryKey || 'id'];
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function createBody(resource: string, values: Record<string, string>): RecordValue {
  const price = Number(values.salePrice);
  if (resource === 'products') {
    return {
      name: values.name.trim(),
      category: values.category.trim(),
      images: splitList(values.images),
      ...(values.brand.trim() ? { brand: values.brand.trim() } : {}),
      ...(values.sku.trim() ? { sku: values.sku.trim() } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      branches: [
        {
          branchId: values.branchId.trim(),
          reserved: Number(values.reserved || '0'),
          quantity: Number(values.quantity || '1'),
          salePrice: price,
          colors: splitList(values.colors),
          isActive: true,
        },
      ],
    };
  }
  if (resource === 'services') {
    return {
      name: values.name.trim(),
      category: values.category.trim(),
      color: values.color.trim(),
      duration: values.duration.trim(),
      tasks: [],
      branch: [{ id: values.branchId.trim(), duration: values.duration.trim(), salePrice: price }],
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
    };
  }
  if (resource === 'addresses') {
    return {
      name: values.name.trim(),
      line1: values.line1.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      country: values.country.trim(),
      location: values.location.trim(),
      isDefault: values.isDefault === 'true',
      ...(values.email.trim() ? { email: values.email.trim() } : {}),
      ...(values.telephone.trim() ? { telephone: values.telephone.trim() } : {}),
      ...(values.line2.trim() ? { line2: values.line2.trim() } : {}),
      ...(values.zipcode.trim() ? { zipcode: values.zipcode.trim() } : {}),
    };
  }
  if (resource === 'branches') {
    return {
      name: values.name.trim(),
      line1: values.line1.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      country: values.country.trim(),
      ...(values.line2.trim() ? { line2: values.line2.trim() } : {}),
      ...(values.zipcode.trim() ? { zipcode: values.zipcode.trim() } : {}),
      ...(values.telephone.trim() ? { telephone: values.telephone.trim() } : {}),
    };
  }
  return {
    fullname: values.fullname.trim(),
    email: values.email.trim(),
    start: values.start.trim(),
    end: values.end.trim(),
    serviceId: values.serviceId.trim(),
    assignedToId: values.assignedToId.trim(),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    ...(values.branchId.trim() ? { branchId: values.branchId.trim() } : {}),
    ...(values.telephone.trim() ? { telephone: values.telephone.trim() } : {}),
  };
}

function updateBody(resource: string, values: Record<string, string>): RecordValue {
  if (resource === 'products') {
    return {
      name: values.name.trim(),
      category: values.category.trim(),
      images: splitList(values.images),
      branches: [
        {
          branchId: values.branchId.trim(),
          salePrice: Number(values.salePrice),
          colors: splitList(values.colors),
        },
      ],
      ...(values.brand.trim() ? { brand: values.brand.trim() } : {}),
      ...(values.sku.trim() ? { sku: values.sku.trim() } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
    };
  }
  if (resource === 'services') {
    return {
      name: values.name.trim(),
      category: values.category.trim(),
      color: values.color.trim(),
      duration: values.duration.trim(),
      tasks: [],
      branch: [
        {
          branchId: values.branchId.trim(),
          duration: values.duration.trim(),
          salePrice: Number(values.salePrice),
        },
      ],
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
    };
  }
  if (resource === 'addresses') return createBody(resource, values);
  if (resource === 'branches') return createBody(resource, values);
  return { serviceId: values.serviceId.trim(), ...(values.notes.trim() ? { notes: values.notes.trim() } : {}) };
}

const resources: Record<string, ResourceConfig> = {
  products: {
    title: 'Products',
    endpoint: '/products',
    description: 'Keep your products, pricing and branch stock details organized.',
    query: (search, offset) =>
      `?limit=50&skip=${offset}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
    fields: [
      { key: 'name', label: 'Product name', required: true },
      { key: 'category', label: 'Category (API enum)', required: true, hint: 'Enter a category value accepted by your API.' },
      { key: 'images', label: 'Image URLs', kind: 'list', required: true, hint: 'Add one image URL per line.' },
      { key: 'brand', label: 'Brand' },
      { key: 'sku', label: 'SKU' },
      { key: 'description', label: 'Description', kind: 'multiline' },
      { key: 'branchId', label: 'Branch ID', required: true },
      { key: 'salePrice', label: 'Sale price', kind: 'number', required: true },
      { key: 'quantity', label: 'Quantity', kind: 'number' },
      { key: 'reserved', label: 'Reserved quantity', kind: 'number' },
      { key: 'colors', label: 'Colors', kind: 'list' },
    ],
    editFields: [
      { key: 'name', label: 'Product name', required: true },
      { key: 'category', label: 'Category (API enum)', required: true },
      { key: 'images', label: 'Image URLs', kind: 'list', required: true },
      { key: 'brand', label: 'Brand' },
      { key: 'sku', label: 'SKU' },
      { key: 'description', label: 'Description', kind: 'multiline' },
      { key: 'branchId', label: 'Branch ID', required: true },
      { key: 'salePrice', label: 'Sale price', kind: 'number', required: true },
      { key: 'colors', label: 'Colors', kind: 'list' },
    ],
    titleKey: 'name',
    subtitleKeys: ['category', 'salePrice'],
    makeCreateBody: (values) => createBody('products', values),
    makeUpdateBody: (values) => updateBody('products', values),
  },
  services: {
    title: 'Services',
    endpoint: '/services',
    description: 'Manage what you offer, how long it takes and where it is available.',
    query: (search, offset) =>
      `?limit=50&skip=${offset}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
    fields: [
      { key: 'name', label: 'Service name', required: true },
      { key: 'category', label: 'Category (API enum)', required: true },
      { key: 'color', label: 'Color (API enum)', required: true, hint: 'Use a ServiceColors value accepted by the API.' },
      { key: 'duration', label: 'Duration', required: true, hint: 'Enter the duration in the format accepted by your API.' },
      { key: 'description', label: 'Description', kind: 'multiline' },
      { key: 'branchId', label: 'Branch ID', required: true },
      { key: 'salePrice', label: 'Sale price', kind: 'number', required: true },
    ],
    titleKey: 'name',
    subtitleKeys: ['category', 'duration', 'salePrice'],
    makeCreateBody: (values) => createBody('services', values),
    makeUpdateBody: (values) => updateBody('services', values),
  },
  addresses: {
    title: 'Addresses',
    endpoint: '/addresses',
    description: 'Manage business addresses and choose the default location.',
    fields: [
      { key: 'name', label: 'Address label', required: true },
      { key: 'line1', label: 'Address line 1', required: true },
      { key: 'line2', label: 'Address line 2' },
      { key: 'city', label: 'City', required: true },
      { key: 'state', label: 'State / region', required: true },
      { key: 'zipcode', label: 'Postal code' },
      { key: 'country', label: 'Country (API enum)', required: true },
      { key: 'location', label: 'Location type (API enum)', required: true },
      { key: 'email', label: 'Email address' },
      { key: 'telephone', label: 'Telephone' },
      { key: 'isDefault', label: 'Set as default', kind: 'boolean' },
    ],
    titleKey: 'name',
    subtitleKeys: ['line1', 'city', 'state'],
    makeCreateBody: (values) => createBody('addresses', values),
    makeUpdateBody: (values) => updateBody('addresses', values),
  },
  branches: {
    title: 'Branches',
    endpoint: '/branches',
    description: 'Manage your work locations. Phone numbers must use international E.164 format.',
    fields: [
      { key: 'name', label: 'Branch name', required: true },
      { key: 'line1', label: 'Street address', required: true },
      { key: 'line2', label: 'Address line 2' },
      { key: 'city', label: 'City', required: true },
      { key: 'state', label: 'State / region', required: true },
      { key: 'zipcode', label: 'Postal code' },
      { key: 'country', label: 'Country (API enum)', required: true },
      { key: 'telephone', label: 'Telephone (+country code)' },
    ],
    titleKey: 'name',
    subtitleKeys: ['line1', 'city', 'state'],
    makeCreateBody: (values) => createBody('branches', values),
    makeUpdateBody: (values) => updateBody('branches', values),
  },
  appointments: {
    title: 'Appointments',
    endpoint: '/appointments',
    description: 'Create appointments for a customer and update their status or time.',
    query: (_search, offset) => `?timeframe=all&skip=${offset}`,
    fields: [
      { key: 'fullname', label: 'Customer name', required: true },
      { key: 'email', label: 'Customer email', required: true },
      { key: 'telephone', label: 'Telephone (+country code)' },
      { key: 'start', label: 'Start date & time (ISO with timezone)', required: true, hint: 'Example: 2026-10-12T16:30:00-04:00' },
      { key: 'end', label: 'End date & time (ISO with timezone)', required: true },
      { key: 'serviceId', label: 'Service ID', required: true },
      { key: 'assignedToId', label: 'Assigned staff ID', required: true },
      { key: 'branchId', label: 'Branch ID' },
      { key: 'notes', label: 'Notes', kind: 'multiline' },
    ],
    editFields: [
      { key: 'serviceId', label: 'Service ID', required: true },
      { key: 'notes', label: 'Notes', kind: 'multiline' },
    ],
    titleKey: 'fullname',
    subtitleKeys: ['status', 'start', 'serviceId'],
    canDelete: false,
    makeCreateBody: (values) => createBody('appointments', values),
    makeUpdateBody: (values) => updateBody('appointments', values),
  },
  orders: {
    title: 'Orders',
    endpoint: '/orders',
    description: 'Review fulfillment orders and update their supported status.',
    query: (_search, offset) => `?skip=${offset}`,
    fields: [],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    titleKey: 'id',
    subtitleKeys: ['status', 'createdAt', 'total'],
    makeCreateBody: () => ({}),
    makeUpdateBody: () => ({}),
  },
};

function parseList(response: unknown, supportsPagination: boolean): { rows: RecordValue[]; hasMore: boolean } {
  const body = response && typeof response === 'object' ? (response as RecordValue) : {};
  const data = unwrapData<unknown>(response);
  const rows = Array.isArray(data) ? data.filter((entry): entry is RecordValue => !!entry && typeof entry === 'object') : [];
  const pagination = body.pagination && typeof body.pagination === 'object' ? (body.pagination as RecordValue) : null;
  const hasMore =
    typeof pagination?.hasMore === 'boolean'
      ? pagination.hasMore
      : supportsPagination && rows.length >= 50;
  return { rows, hasMore };
}

export default function ResourceScreen({ resource }: { resource: string }) {
  const config = resources[resource] || resources.products;
  const [records, setRecords] = useState<RecordValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ id: string | null; values: Record<string, string> } | null>(null);
  const [working, setWorking] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RecordValue | null>(null);
  const [statusRecord, setStatusRecord] = useState<RecordValue | null>(null);
  const [rescheduleRecord, setRescheduleRecord] = useState<RecordValue | null>(null);

  const load = useCallback(
    async (nextOffset = 0, append = false, query = '') => {
      setError(null);
      if (append) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await request<unknown>(
          `${config.endpoint}${config.query ? config.query(query.trim(), nextOffset) : ''}`
        );
        const result = parseList(response, config.query !== undefined);
        setRecords((current) => (append ? [...current, ...result.rows] : result.rows));
        setOffset(nextOffset + result.rows.length);
        setHasMore(result.hasMore);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `Unable to load ${config.title.toLowerCase()}.`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [config]
  );

  useEffect(() => {
    void load(0, false, '');
  }, [load]);

  const editorFields = useMemo(
    () => (editor?.id && config.editFields ? config.editFields : config.fields),
    [config, editor?.id]
  );

  if (!resources[resource]) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <InlineNotice message={`The ${resource} section is not available.`} />
          <AppButton label="Back" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const startEditor = (record?: RecordValue) => {
    if (record && !recordId(record, config)) {
      setError('This record does not include an ID and cannot be edited.');
      return;
    }
    const fields = record ? config.editFields || config.fields : config.fields;
    const values: Record<string, string> = {};
    fields.forEach((field) => {
      const value = record?.[field.key];
      if (field.kind === 'boolean') values[field.key] = value ? 'true' : 'false';
      else values[field.key] = stringValue(value);
    });
    setError(null);
    setEditor({ id: record ? recordId(record, config) : null, values });
  };

  const save = async () => {
    if (!editor) return;
    const missing = editorFields.find(
      (field) => field.required && !editor.values[field.key]?.trim()
    );
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    if (
      ['products', 'services'].includes(resource) &&
      (!Number.isFinite(Number(editor.values.salePrice)) || Number(editor.values.salePrice) <= 0)
    ) {
      setError('Sale price must be greater than zero.');
      return;
    }
    if (
      ['branches', 'appointments'].includes(resource) &&
      editor.values.telephone?.trim() &&
      !/^\+[1-9]\d{1,14}$/.test(editor.values.telephone.trim())
    ) {
      setError('Enter the phone number in international E.164 format, for example +1234567890.');
      return;
    }
    if (resource === 'appointments' && !editor.id) {
      const { start, end } = editor.values;
      const startTime = Date.parse(start);
      const endTime = Date.parse(end);
      if (
        !/(?:Z|[+-]\d{2}:\d{2})$/.test(start) ||
        !/(?:Z|[+-]\d{2}:\d{2})$/.test(end) ||
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime) ||
        startTime <= Date.now() ||
        endTime <= startTime
      ) {
        setError('Use valid future start and end date-times with a timezone offset; end must be later than start.');
        return;
      }
    }
    setWorking(true);
    setError(null);
    try {
      if (editor.id) {
        await request(`${config.endpoint}/${encodeURIComponent(editor.id)}`, {
          method: 'PATCH',
          body: config.makeUpdateBody(editor.values),
        });
      } else {
        await request(config.endpoint, { method: 'POST', body: config.makeCreateBody(editor.values) });
      }
      setEditor(null);
      await load(0, false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save these changes.');
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const id = recordId(confirmDelete, config);
    if (!id) {
      setError('This record does not include an ID and cannot be deleted.');
      setConfirmDelete(null);
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await request(`${config.endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setConfirmDelete(null);
      await load(0, false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this record.');
    } finally {
      setWorking(false);
    }
  };

  const updateStatus = async (nextStatus: string) => {
    if (!statusRecord) return;
    const id = recordId(statusRecord, config);
    if (!id) return setError('This appointment does not include an ID.');
    setWorking(true);
    setError(null);
    try {
      await request(`${config.endpoint}/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: resource === 'appointments' ? { nextStatus } : { status: nextStatus },
      });
      setStatusRecord(null);
      await load(0, false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update appointment status.');
    } finally {
      setWorking(false);
    }
  };

  const updateSchedule = async (record: RecordValue, values: Record<string, string>) => {
    const id = recordId(record, config);
    if (!id) return setError('This appointment does not include an ID.');
    const startTime = Date.parse(values.start);
    const endTime = Date.parse(values.end);
    if (
      !/(?:Z|[+-]\d{2}:\d{2})$/.test(values.start) ||
      !/(?:Z|[+-]\d{2}:\d{2})$/.test(values.end) ||
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      startTime <= Date.now() ||
      endTime <= startTime
    ) {
      setError('Use valid future date-times with a timezone offset; end must be later than start.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await request(`${config.endpoint}/${encodeURIComponent(id)}/reschedule`, {
        method: 'PATCH',
        body: { start: values.start.trim(), end: values.end.trim() },
      });
      setRescheduleRecord(null);
      await load(0, false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reschedule this appointment.');
    } finally {
      setWorking(false);
    }
  };

  const searchNow = () => {
    setOffset(0);
    void load(0, false, search);
  };

  const renderRecord = ({ item }: { item: RecordValue }) => {
    const subtitle = (config.subtitleKeys || [])
      .map((key) => item[key])
      .filter((value) => value !== null && value !== undefined && String(value).trim())
      .map((value) => String(value))
      .slice(0, 3)
      .join('  ·  ');
    const id = recordId(item, config);
    return (
      <Surface style={styles.recordCard}>
        <View style={styles.recordTop}>
          <View style={styles.recordMark}>
            <Text style={styles.recordInitial}>{recordName(item, config).slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.recordCopy}>
            <Text numberOfLines={1} style={styles.recordTitle}>{recordName(item, config)}</Text>
            {subtitle ? <Text numberOfLines={2} style={styles.recordSubtitle}>{subtitle}</Text> : null}
          </View>
          {item.isDefault === true ? <Text style={styles.defaultPill}>DEFAULT</Text> : null}
        </View>
        <View style={styles.recordActions}>
          {config.canUpdate !== false ? (
            <AppButton label="Edit" onPress={() => startEditor(item)} variant="secondary" style={styles.smallButton} />
          ) : null}
          {resource === 'appointments' ? (
            <>
              <AppButton label="Status" onPress={() => setStatusRecord(item)} variant="secondary" style={styles.smallButton} />
              <AppButton label="Reschedule" onPress={() => setRescheduleRecord(item)} variant="secondary" style={styles.smallButton} />
            </>
          ) : null}
          {resource === 'orders' ? (
            <AppButton label="Update status" onPress={() => setStatusRecord(item)} variant="secondary" style={styles.smallButton} />
          ) : null}
          {config.canDelete !== false ? (
            <AppButton label="Delete" onPress={() => setConfirmDelete(item)} variant="danger" style={styles.smallButton} />
          ) : null}
        </View>
        {resource === 'addresses' && id ? (
          <Pressable
            accessibilityRole="button"
            disabled={item.isDefault === true}
            onPress={async () => {
              setError(null);
              try {
                await request(`${config.endpoint}/${encodeURIComponent(id)}/default`, { method: 'PATCH' });
                await load(0, false);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Unable to set the default address.');
              }
            }}
            style={styles.defaultAction}>
            <Text style={styles.defaultActionText}>
              {item.isDefault === true ? 'This is your default address' : 'Make default address'}
            </Text>
          </Pressable>
        ) : null}
      </Surface>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <PageHeader
          eyebrow="BUSINESS MANAGEMENT"
          title={config.title}
          subtitle={config.description}
          trailing={
            config.canCreate === false ? null : (
              <AppButton icon="plus" label="Add" onPress={() => startEditor()} style={styles.addButton} />
            )
          }
        />
        {error ? <InlineNotice message={error} /> : null}
        {config.query && resource !== 'appointments' ? (
          <View style={styles.searchRow}>
            <FormField
              autoCapitalize="none"
              label="Search"
              onChangeText={setSearch}
              onSubmitEditing={searchNow}
              placeholder={`Search ${config.title.toLowerCase()}`}
              returnKeyType="search"
              value={search}
            />
            <AppButton label="Go" onPress={searchNow} variant="secondary" style={styles.searchButton} />
          </View>
        ) : null}
        {loading && records.length === 0 ? (
          <View style={styles.loading}><ActivityIndicator color={Brand.green} size="large" /></View>
        ) : error && records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>We couldn&apos;t load this list</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <AppButton label="Try again" onPress={() => void load(0, false)} variant="secondary" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={records.length ? styles.list : styles.emptyList}
            data={records}
            keyExtractor={(item, index) => recordId(item, config) || `${resource}-${index}`}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>+</Text></View>
                <Text style={styles.emptyTitle}>A fresh start</Text>
                <Text style={styles.emptyText}>Nothing here yet. Add your first {config.title.toLowerCase().replace(/s$/, '')} to get organized.</Text>
                {config.canCreate !== false ? <AppButton label={`Add ${config.title.slice(0, -1)}`} onPress={() => startEditor()} /> : null}
              </View>
            }
            ListFooterComponent={
              hasMore ? (
                <AppButton
                  label="Load more"
                  loading={refreshing}
                  onPress={() => void load(offset, true)}
                  variant="secondary"
                  style={styles.loadMore}
                />
              ) : <View style={styles.listBottom} />
            }
            refreshControl={<RefreshControl onRefresh={() => void load(0, false)} refreshing={refreshing} tintColor={Brand.green} />}
            renderItem={renderRecord}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal animationType="slide" onRequestClose={() => setEditor(null)} transparent visible={!!editor}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={() => setEditor(null)} />
          <View style={styles.editorSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editor?.id ? `Edit ${config.title.slice(0, -1).toLowerCase()}` : `Add ${config.title.slice(0, -1).toLowerCase()}`}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {error ? <InlineNotice message={error} /> : null}
              {editorFields.map((field) =>
                field.kind === 'boolean' ? (
                  <View key={field.key} style={styles.booleanField}>
                    <View style={styles.booleanCopy}>
                      <Text style={styles.fieldName}>{field.label}</Text>
                      <Text style={styles.booleanValue}>{editor?.values[field.key] === 'true' ? 'Yes' : 'No'}</Text>
                    </View>
                    <AppButton
                      label={editor?.values[field.key] === 'true' ? 'Yes' : 'No'}
                      onPress={() =>
                        setEditor((current) =>
                          current
                            ? { ...current, values: { ...current.values, [field.key]: current.values[field.key] === 'true' ? 'false' : 'true' } }
                            : current
                        )
                      }
                      variant="secondary"
                    />
                  </View>
                ) : (
                  <FormField
                    key={field.key}
                    autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
                    keyboardType={field.kind === 'number' ? 'decimal-pad' : field.key === 'email' ? 'email-address' : 'default'}
                    label={`${field.label}${field.required ? ' *' : ''}`}
                    multiline={field.kind === 'multiline' || field.kind === 'list'}
                    onChangeText={(text) =>
                      setEditor((current) =>
                        current ? { ...current, values: { ...current.values, [field.key]: text } } : current
                      )
                    }
                    placeholder={field.kind === 'list' ? 'Separate values with commas or new lines' : undefined}
                    value={editor?.values[field.key] || ''}
                    hint={field.hint}
                  />
                )
              )}
              <AppButton label={editor?.id ? 'Save changes' : 'Create'} loading={working} onPress={() => void save()} />
              <AppButton label="Cancel" onPress={() => setEditor(null)} variant="quiet" />
              <View style={{ height: 18 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setConfirmDelete(null)} transparent visible={!!confirmDelete}>
        <View style={styles.centerModal}>
          <Surface style={styles.confirmCard}>
            <Text style={styles.sheetTitle}>Delete {recordName(confirmDelete || {}, config)}?</Text>
            <Text style={styles.confirmCopy}>This action can&apos;t be undone. The API will only remove it after you confirm.</Text>
            <AppButton label="Delete" loading={working} onPress={() => void remove()} variant="danger" />
            <AppButton label="Keep it" onPress={() => setConfirmDelete(null)} variant="quiet" />
          </Surface>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setStatusRecord(null)} transparent visible={!!statusRecord}>
        <View style={styles.centerModal}>
          <Surface style={styles.confirmCard}>
            <Text style={styles.sheetTitle}>Update {resource === 'orders' ? 'order' : 'appointment'} status</Text>
            {(resource === 'appointments'
              ? ['Completed', 'Canceled', 'In_Progress', 'No_Show', 'Rescheduled']
              : ['Pending', 'Processing', 'Awaiting_Shipment']
            ).map((status) => (
              <AppButton key={status} label={status.replace('_', ' ')} loading={working} onPress={() => void updateStatus(status)} variant="secondary" style={styles.statusOption} />
            ))}
            <AppButton label="Cancel" onPress={() => setStatusRecord(null)} variant="quiet" />
          </Surface>
        </View>
      </Modal>

      <RescheduleModal
        record={rescheduleRecord}
        working={working}
        onClose={() => setRescheduleRecord(null)}
        onSave={(values) => rescheduleRecord && void updateSchedule(rescheduleRecord, values)}
      />
    </SafeAreaView>
  );
}

function RescheduleModal({
  record,
  working,
  onClose,
  onSave,
}: {
  record: RecordValue | null;
  working: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (record) {
      setStart(stringValue(record.start));
      setEnd(stringValue(record.end));
    }
  }, [record]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={!!record}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.editorSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Reschedule appointment</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <FormField label="New start (ISO with timezone)" onChangeText={setStart} value={start} hint="Example: 2026-10-12T16:30:00-04:00" />
            <FormField label="New end (ISO with timezone)" onChangeText={setEnd} value={end} />
            <AppButton label="Save new time" loading={working} onPress={() => onSave({ start, end })} />
            <AppButton label="Cancel" onPress={onClose} variant="quiet" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: MaxContentWidth, flex: 1, alignSelf: 'center', paddingHorizontal: 19, paddingTop: 15 },
  addButton: { minHeight: 44, paddingHorizontal: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  searchButton: { marginTop: 20 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { gap: 11, paddingBottom: 25 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 24 },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 26 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: Brand.softGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyIconText: { color: Brand.green, fontSize: 27, fontWeight: '500' },
  emptyTitle: { color: Brand.deep, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: Brand.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  recordCard: { padding: 15 },
  recordTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  recordMark: { width: 43, height: 43, borderRadius: 14, backgroundColor: Brand.softGreen, alignItems: 'center', justifyContent: 'center' },
  recordInitial: { color: Brand.green, fontSize: 17, fontWeight: '800' },
  recordCopy: { flex: 1 },
  recordTitle: { color: Brand.deep, fontSize: 15, fontWeight: '800' },
  recordSubtitle: { color: Brand.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  defaultPill: { color: Brand.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.6, backgroundColor: Brand.softGreen, padding: 7, borderRadius: 9 },
  recordActions: { borderTopColor: '#EEF3ED', borderTopWidth: 1, marginTop: 13, paddingTop: 11, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  smallButton: { minHeight: 38, paddingHorizontal: 12 },
  defaultAction: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center' },
  defaultActionText: { color: Brand.green, fontSize: 12, fontWeight: '700' },
  loadMore: { marginTop: 6 },
  listBottom: { height: 22 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,20,0,0.38)' },
  editorSheet: { maxHeight: '88%', backgroundColor: Brand.canvas, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 4, backgroundColor: '#C6D4C4', alignSelf: 'center', marginBottom: 15 },
  sheetTitle: { color: Brand.deep, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  booleanField: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  booleanCopy: { gap: 3 },
  fieldName: { color: Brand.deep, fontSize: 13, fontWeight: '700' },
  booleanValue: { color: Brand.muted, fontSize: 12 },
  centerModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,20,0,0.4)', padding: 22 },
  confirmCard: { width: '100%', maxWidth: 390 },
  confirmCopy: { color: Brand.muted, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  statusOption: { marginBottom: 7 },
});
