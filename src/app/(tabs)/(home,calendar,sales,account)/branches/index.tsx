import { router } from 'expo-router';

import { SimpleListScreen } from '@/components/simple-list-screen';
import { ListRow, StatusBadge } from '@/components/ui';
import { countryLabel } from '@/constants/enums';
import { get, str } from '@/lib/format';
import { coordsOf } from '@/lib/maps';

/** GET /branches returns `{ id, name, address: { line1, city, country, latitude, longitude, ... } }`. */
export default function BranchesScreen() {
  return (
    <SimpleListScreen
      addHref="/branches/edit"
      addLabel="Add location"
      emptyIcon="location"
      emptyMessage="Add where you work so customers and bookings have a place."
      emptyTitle="No locations yet"
      path="/branches"
      renderRow={(row) => {
        const address = get(row, 'address');
        const pinned = !!coordsOf(address);
        return (
          <ListRow
            icon="location"
            key={str(row.id)}
            onPress={() => router.push({ pathname: '/branches/edit', params: { id: str(row.id) } })}
            subtitle={[str(get(address, 'line1')), str(get(address, 'city')), countryLabel(str(get(address, 'country')))].filter(Boolean).join(', ') || 'No address yet'}
            title={str(row.name) || 'Location'}
            trailing={<StatusBadge label={pinned ? 'On map' : 'No pin'} status={pinned ? 'Completed' : 'Pending'} />}
          />
        );
      }}
    />
  );
}
