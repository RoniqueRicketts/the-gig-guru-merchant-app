import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { SimpleListScreen } from '@/components/simple-list-screen';
import { ListRow, StatusBadge, useToast } from '@/components/ui';
import { countryLabel } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import { request, seg } from '@/lib/api';
import { str } from '@/lib/format';
import { safeMessage } from '@/lib/security';

export default function AddressesScreen() {
  const toast = useToast();
  return (
    <SimpleListScreen
      addHref="/addresses/edit"
      addLabel="Add address"
      emptyIcon="mail"
      emptyMessage="Save your business, pickup or mailing addresses."
      emptyTitle="No addresses yet"
      path="/addresses"
      renderRow={(row, refresh) => {
        const id = str(row.id);
        const isDefault = row.isDefault === true;
        return (
          <ListRow
            icon="location"
            key={id}
            onPress={() => router.push({ pathname: '/addresses/edit', params: { id } })}
            subtitle={[str(row.line1), str(row.city), countryLabel(str(row.country))].filter(Boolean).join(', ')}
            title={str(row.name) || 'Address'}
            trailing={isDefault ? <StatusBadge label="Default" status="Completed" /> : undefined}
            accessory={
              isDefault ? undefined : (
                <Pressable
                  accessibilityLabel={`Make ${str(row.name)} the default address`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={async () => {
                    try {
                      await request(`/addresses/${seg(id)}/default`, { method: 'PATCH' });
                      toast.success('Default address updated');
                      await refresh();
                    } catch (cause) {
                      toast.error(safeMessage(cause));
                    }
                  }}>
                  <Text style={styles.makeDefault}>Make default</Text>
                </Pressable>
              )
            }
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  makeDefault: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
});
