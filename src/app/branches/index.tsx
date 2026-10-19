import { router } from 'expo-router';

import { SimpleListScreen } from '@/components/simple-list-screen';
import { ListRow } from '@/components/ui';
import { enumLabel } from '@/constants/enums';
import { str } from '@/lib/format';

export default function BranchesScreen() {
  return (
    <SimpleListScreen
      addHref="/branches/edit"
      addLabel="Add location"
      emptyIcon="location"
      emptyMessage="Add where you work so customers and bookings have a place."
      emptyTitle="No locations yet"
      path="/branches"
      renderRow={(row) => (
        <ListRow
          icon="location"
          key={str(row.id)}
          onPress={() => router.push({ pathname: '/branches/edit', params: { id: str(row.id) } })}
          subtitle={[str(row.line1), str(row.city), enumLabel(str(row.country))].filter(Boolean).join(', ')}
          title={str(row.name) || 'Location'}
        />
      )}
    />
  );
}
