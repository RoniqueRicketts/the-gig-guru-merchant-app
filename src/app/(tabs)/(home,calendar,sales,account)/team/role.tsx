import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/form-screen';
import { Field, SwitchRow, useToast } from '@/components/ui';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { str, type Row } from '@/lib/format';
import { safeMessage } from '@/lib/security';

export default function RoleScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const role = useQuery<Row>(id ? `/roles/${seg(id)}` : null);
  const title = id ? 'Edit role' : 'New role';

  if (id && role.loading) return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title={title}>{null}</FormScreen>;
  if (id && !role.data) {
    return (
      <FormScreen loadError={role.error ?? 'Role not found.'} onRetry={() => void role.refresh()} onSave={() => {}} saveLabel="" saving={false} title={title}>
        {null}
      </FormScreen>
    );
  }
  return <RoleForm id={id} initial={role.data} title={title} />;
}

function RoleForm({ id, initial, title }: { id?: string; initial: Row | null; title: string }) {
  const toast = useToast();
  const [name, setName] = useState(str(initial?.name));
  const [description, setDescription] = useState(str(initial?.description));
  const [active, setActive] = useState(initial?.isActive !== false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setNameError('Give this role a name.');
      return setFormError('Please fix the highlighted fields.');
    }
    setNameError(null);
    setFormError(null);

    let body: Record<string, unknown>;
    if (id) {
      body = {};
      if (name.trim() !== str(initial?.name)) body.name = name.trim();
      if (description.trim() !== str(initial?.description)) body.description = description.trim();
      if (active !== (initial?.isActive !== false)) body.isActive = active;
      if (!Object.keys(body).length) return router.back();
    } else {
      body = { name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) };
    }

    setSaving(true);
    try {
      await request(id ? `/roles/${seg(id)}` : '/roles', { method: id ? 'PATCH' : 'POST', body });
      toast.success(id ? 'Role updated' : 'Role added');
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
      await request(`/roles/${seg(id!)}`, { method: 'DELETE' });
      toast.success('Role deleted');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      deleteLabel={id ? 'Delete role' : undefined}
      error={formError}
      onDelete={id ? () => void remove() : undefined}
      onSave={() => void save()}
      saveLabel={id ? 'Save changes' : 'Add role'}
      saving={saving}
      title={title}>
      <Field autoCapitalize="words" error={nameError} label="Role name" maxLength={80} onChangeText={setName} placeholder="e.g. Front desk" value={name} />
      <Field label="Description" maxLength={500} multiline onChangeText={setDescription} placeholder="Optional · what this role covers" value={description} />
      {id ? <SwitchRow detail="Inactive roles can't be given to new team members" label="Active" onChange={setActive} value={active} /> : null}
    </FormScreen>
  );
}
