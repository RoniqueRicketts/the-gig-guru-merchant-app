import { EmptyState, ErrorState, type IconName } from '@/components/ui';

/**
 * Turns plan / permission failures into a calm explanation instead of a generic error.
 * 402 = feature is on the Premium plan, 403 = this login lacks the permission.
 */
export function GatedOrError({
  status,
  message,
  feature,
  icon,
  onRetry,
}: {
  status: number | null;
  message: string;
  feature: string;
  icon: IconName;
  onRetry: () => void;
}) {
  if (status === 402) {
    return (
      <EmptyState
        icon={icon}
        message={`${feature} is part of the Premium plan. Upgrade from the GigGuru dashboard to turn it on.`}
        title="Premium feature"
      />
    );
  }
  if (status === 403) {
    return <EmptyState icon="lock" message={`Ask your account owner for access to ${feature.toLowerCase()}.`} title="No access" />;
  }
  return <ErrorState message={message} onRetry={onRetry} />;
}

/** True when a failure means "this feature isn't available to you" rather than "something broke". */
export const isGated = (status: number | null) => status === 402 || status === 403;
