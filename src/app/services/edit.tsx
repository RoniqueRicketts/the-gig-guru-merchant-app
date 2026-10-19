import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/form-screen';
import { ChoiceChips, Field, MultiChoiceChips, Select, useToast } from '@/components/ui';
import { DurationPresets, enumLabel, ServiceCategories, ServiceColorHex, ServiceColors } from '@/constants/enums';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { rows, str, type Row } from '@/lib/format';
import { parseMoney, safeMessage } from '@/lib/security';

export default function ServiceEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const service = useQuery<Row>(id ? `/services/${seg(id)}` : null);
  const branches = useQuery<Row[]>('/branches');

  if ((id && service.loading) || branches.loading) {
    return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title={id ? 'Edit service' : 'New service'}>{null}</FormScreen>;
  }
  if (id && !service.data) {
    return (
      <FormScreen loadError={service.error ?? 'Service not found.'} onRetry={() => void service.refresh()} onSave={() => {}} saveLabel="" saving={false} title="Edit service">
        {null}
      </FormScreen>
    );
  }
  return <ServiceForm branches={rows(branches.data)} id={id} initial={service.data} />;
}

function ServiceForm({ id, initial, branches }: { id?: string; initial: Row | null; branches: Row[] }) {
  const toast = useToast();
  const existingBranches = rows(initial?.branchServices);
  const [name, setName] = useState(str(initial?.name));
  const [category, setCategory] = useState<string | null>(str(initial?.category) || null);
  const [color, setColor] = useState<string>(str(initial?.color) || 'Green');
  const [duration, setDuration] = useState(str(initial?.duration) || '60');
  const [price, setPrice] = useState(existingBranches[0]?.salePrice != null ? String(existingBranches[0].salePrice) : '');
  const [description, setDescription] = useState(str(initial?.description));
  const [branchIds, setBranchIds] = useState<string[]>(() => {
    const existing = existingBranches.map((entry) => str(entry.branchId)).filter(Boolean);
    if (existing.length) return existing;
    return branches.length === 1 ? [str(branches[0].id)] : [];
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amount = parseMoney(price);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give this service a name.';
    if (!category) next.category = 'Choose a category.';
    if (amount === null) next.price = 'Enter a price greater than 0.';
    if (!branchIds.length) next.branches = branches.length ? 'Choose at least one location.' : 'Add a location first (Account → Locations).';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');
    setFormError(null);
    setSaving(true);

    // Keep existing checklist tasks intact on update; the API requires the field.
    const tasks = rows(initial?.tasks)
      .map((task) => ({ id: str(task.id), label: str(task.label) || str(task.name), completed: task.completed === true }))
      .filter((task) => task.id && task.label);
    const base = {
      name: name.trim(),
      category,
      color,
      duration,
      tasks,
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    try {
      if (id) {
        await request(`/services/${seg(id)}`, {
          method: 'PATCH',
          body: { ...base, branch: branchIds.map((branchId) => ({ branchId, duration, salePrice: amount })) },
        });
      } else {
        await request('/services', {
          method: 'POST',
          body: { ...base, branch: branchIds.map((branchId) => ({ id: branchId, duration, salePrice: amount })) },
        });
      }
      toast.success(id ? 'Service updated' : 'Service added');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await request(`/services/${seg(id!)}`, { method: 'DELETE' });
      toast.success('Service deleted');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      deleteLabel={id ? 'Delete service' : undefined}
      error={formError}
      onDelete={id ? () => void remove() : undefined}
      onSave={() => void save()}
      saveLabel={id ? 'Save changes' : 'Add service'}
      saving={saving}
      title={id ? 'Edit service' : 'New service'}>
      <Field autoCapitalize="sentences" error={errors.name} label="Name" onChangeText={setName} placeholder="e.g. Men's haircut" value={name} />
      <Field
        error={errors.price}
        inputMode="decimal"
        keyboardType="decimal-pad"
        label="Price"
        maxLength={10}
        onChangeText={setPrice}
        placeholder="0.00"
        value={price}
      />
      <ChoiceChips label="Duration" onChange={setDuration} options={DurationPresets} value={duration} />
      <Select
        error={errors.category}
        label="Category"
        onChange={setCategory}
        options={ServiceCategories.map((value) => ({ value, label: enumLabel(value) }))}
        value={category}
      />
      {branches.length > 1 || errors.branches ? (
        <MultiChoiceChips
          error={errors.branches}
          label="Offered at"
          onChange={setBranchIds}
          options={branches.map((branch) => ({ value: str(branch.id), label: str(branch.name) }))}
          values={branchIds}
        />
      ) : null}
      <ChoiceChips
        label="Calendar color"
        onChange={setColor}
        options={ServiceColors.map((value) => ({ value, label: value, color: ServiceColorHex[value] }))}
        value={color}
      />
      <Field label="Description" maxLength={2000} multiline onChangeText={setDescription} placeholder="Optional · what's included" value={description} />
    </FormScreen>
  );
}
