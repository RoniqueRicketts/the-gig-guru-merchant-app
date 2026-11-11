import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Field, ListGroup, ListRow, MultiChoiceChips, Select, useToast } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { employee, rows, str, type Row } from '@/lib/format';
import { isE164, isEmail, normalizePhone, safeMessage } from '@/lib/security';

const NO_BRANCH = '__none__';

export default function TeamMemberScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const member = useQuery<Row>(id ? `/users/${seg(id)}` : null);
  const roles = useQuery<Row[]>('/roles');
  const branches = useQuery<Row[]>('/branches');
  const title = id ? 'Team member' : 'Add team member';

  if ((id && member.loading) || roles.loading || branches.loading) {
    return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title={title}>{null}</FormScreen>;
  }
  if (id && !member.data) {
    return (
      <FormScreen loadError={member.error ?? 'Team member not found.'} onRetry={() => void member.refresh()} onSave={() => {}} saveLabel="" saving={false} title={title}>
        {null}
      </FormScreen>
    );
  }
  return <MemberForm branches={rows(branches.data)} id={id} initial={member.data} roles={rows(roles.data)} title={title} />;
}

function MemberForm({ id, initial, roles, branches, title }: { id?: string; initial: Row | null; roles: Row[]; branches: Row[]; title: string }) {
  const toast = useToast();
  const initialRoleIds = initial ? employee.roles(initial).map((role) => role.id) : [];
  const activeRoles = roles.filter((role) => role.isActive !== false);

  const [name, setName] = useState(str(initial?.fullname));
  const [email, setEmail] = useState(str(initial?.email));
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState<string | null>(activeRoles.length === 1 ? str(activeRoles[0].id) : null);
  const [roleIds, setRoleIds] = useState<string[]>(initialRoleIds);
  const [branchId, setBranchId] = useState<string>(str(initial?.branchId) || NO_BRANCH);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const branchOptions = [{ value: NO_BRANCH, label: 'Any location' }, ...branches.map((branch) => ({ value: str(branch.id), label: str(branch.name) || 'Location' }))];
  const isAdmin = initial?.isAdmin === true;
  const telephone = str(initial?.telephone);

  const create = async () => {
    const cleanPhone = normalizePhone(phone);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter their name.';
    if (!isEmail(email)) next.email = 'Enter a valid email. Sign-in details are sent here.';
    if (!isE164(cleanPhone)) next.phone = 'Use international format, e.g. +18765550123.';
    if (!roleId) next.role = activeRoles.length ? 'Choose a role.' : 'Create a role first (Team → Roles).';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');
    setFormError(null);
    setSaving(true);
    try {
      await request('/users', {
        method: 'POST',
        body: {
          fullname: name.trim(),
          email: email.trim().toLowerCase(),
          telephone: cleanPhone,
          roleId,
          ...(branchId !== NO_BRANCH ? { branchId } : {}),
        },
      });
      toast.success(`${name.trim()} added to your team`);
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const update = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter their name.';
    if (!isEmail(email)) next.email = 'Enter a valid email.';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');
    setFormError(null);
    setSaving(true);

    // Only send what changed: the API requires a non-empty, strict subset.
    const details: Record<string, unknown> = {};
    if (name.trim() !== str(initial?.fullname)) details.fullname = name.trim();
    if (email.trim().toLowerCase() !== str(initial?.email).toLowerCase()) details.email = email.trim().toLowerCase();
    const nextBranch = branchId === NO_BRANCH ? null : branchId;
    if (nextBranch !== (str(initial?.branchId) || null)) details.branchId = nextBranch;

    const added = roleIds.filter((role) => !initialRoleIds.includes(role));
    const removed = initialRoleIds.filter((role) => !roleIds.includes(role));
    try {
      if (Object.keys(details).length) await request(`/users/${seg(id!)}`, { method: 'PATCH', body: details });
      for (const role of added) await request(`/roles/${seg(role)}/users/${seg(id!)}`, { method: 'POST' });
      for (const role of removed) await request(`/roles/${seg(role)}/users/${seg(id!)}`, { method: 'DELETE' });
      toast.success('Team member updated');
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
      await request(`/users/${seg(id!)}`, { method: 'DELETE' });
      toast.success('Removed from your team');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      deleteLabel={id && !isAdmin ? 'Remove from team' : undefined}
      error={formError}
      onDelete={id && !isAdmin ? () => void remove() : undefined}
      onSave={() => void (id ? update() : create())}
      saveLabel={id ? 'Save changes' : 'Add to team'}
      saving={saving}
      title={title}>
      <Field autoCapitalize="words" autoComplete="name" error={errors.name} label="Full name" onChangeText={setName} placeholder="e.g. Andre Campbell" value={name} />
      <Field
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        hint={id ? undefined : "We'll email them a temporary password to sign in."}
        inputMode="email"
        keyboardType="email-address"
        label="Email"
        maxLength={254}
        onChangeText={setEmail}
        value={email}
      />
      {id ? (
        telephone ? (
          <ListGroup style={styles.group}>
            <ListRow icon="phone" onPress={() => void Linking.openURL(`tel:${telephone}`)} title={telephone} value="Call" />
          </ListGroup>
        ) : null
      ) : (
        <Field autoComplete="tel" error={errors.phone} keyboardType="phone-pad" label="Phone" maxLength={20} onChangeText={setPhone} placeholder="+1 876 555 0123" value={phone} />
      )}

      {id ? (
        roles.length ? (
          <MultiChoiceChips
            hint="Changes apply when you save."
            label="Roles"
            onChange={setRoleIds}
            options={roles.map((role) => ({ value: str(role.id), label: str(role.name) || 'Role' }))}
            values={roleIds}
          />
        ) : null
      ) : (
        <Select
          emptyText="Create a role first (Team → Roles)."
          error={errors.role}
          label="Role"
          onChange={setRoleId}
          options={activeRoles.map((role) => ({ value: str(role.id), label: str(role.name) || 'Role', detail: str(role.description) || undefined }))}
          value={roleId}
        />
      )}

      {branches.length ? <Select label="Works at" onChange={setBranchId} options={branchOptions} value={branchId} /> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({ group: { marginBottom: Spacing.lg } });
