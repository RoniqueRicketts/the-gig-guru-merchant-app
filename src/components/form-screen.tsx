import { router, Stack } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { Banner, Button, ErrorState, ListGroup, ListRow, Screen, SkeletonList } from '@/components/ui';
import { Spacing } from '@/constants/theme';

/** Shared chrome for create/edit forms: title, pinned save button, optional delete. */
export function FormScreen({
  title,
  loading,
  loadError,
  onRetry,
  error,
  saving,
  saveLabel,
  onSave,
  deleteLabel,
  onDelete,
  children,
}: {
  title: string;
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  error?: string | null;
  saving: boolean;
  saveLabel: string;
  onSave: () => void;
  deleteLabel?: string;
  onDelete?: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title }} />
        <SkeletonList count={5} />
      </Screen>
    );
  }
  if (loadError && onRetry) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ErrorState message={loadError} onRetry={onRetry} />
      </>
    );
  }
  return (
    <Screen edges={['left', 'right']} footer={<Button label={saveLabel} loading={saving} onPress={onSave} />}>
      <Stack.Screen
        options={{
          title,
          headerLeft: () => <Button label="Cancel" onPress={() => router.back()} size="md" variant="ghost" />,
        }}
      />
      <View style={styles.top} />
      {error ? <Banner message={error} /> : null}
      {children}
      {onDelete && deleteLabel ? (
        <ListGroup style={styles.delete}>
          <ListRow
            chevron={false}
            destructive
            icon="trash"
            onPress={() => confirmAction(`${deleteLabel}?`, "This can't be undone.", 'Delete', onDelete)}
            title={deleteLabel}
          />
        </ListGroup>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: Spacing.lg },
  delete: { marginTop: Spacing.lg },
});
