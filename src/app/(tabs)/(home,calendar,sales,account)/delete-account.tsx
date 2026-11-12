import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, ErrorState, Field, Screen, SkeletonList, useToast } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth';
import { safeMessage } from '@/lib/security';

/** GET /account/deletion: what deleting would do, and what has to be finished first. */
type DeletionPreview = {
  closesBusiness: boolean;
  businessName: string | null;
  teamMembers: number;
  blockers: string[];
};

const CONFIRMATION = 'DELETE';

function consequences({ closesBusiness, businessName, teamMembers }: DeletionPreview): string[] {
  if (!closesBusiness) {
    return [
      'Your sign-in and personal details are permanently removed.',
      'The business and its records stay with your team.',
    ];
  }
  return [
    `You own ${businessName ?? 'this business'}, so it closes with your account.`,
    'Your plan is cancelled and the business is anonymised and removed from the GigGuru app.',
    ...(teamMembers ? [`${teamMembers} team member account${teamMembers === 1 ? ' is' : 's are'} deleted too.`] : []),
    'Sales records are kept for accounting.',
  ];
}

/** Lets anyone delete their account from inside the app (App Store guideline 5.1.1(v)). */
export default function DeleteAccountScreen() {
  const { deleteAccount } = useAuth();
  const toast = useToast();
  const query = useQuery<DeletionPreview>('/account/deletion');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (query.loading) {
    return (
      <Screen edges={['left', 'right']}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  const preview = query.data;
  if (!preview) {
    return <ErrorState message={query.error ?? "We couldn't load your account."} onRetry={() => void query.refresh()} />;
  }

  const blockers = Array.isArray(preview.blockers) ? preview.blockers : [];
  const confirmed = typed.trim().toUpperCase() === CONFIRMATION;

  const remove = async () => {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      // Signing out swaps the whole app to the sign-in screen.
      toast.success('Your account has been deleted');
    } catch (cause) {
      setError(safeMessage(cause));
      setDeleting(false);
      void query.reload();
    }
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <Button
          disabled={!confirmed || blockers.length > 0}
          label="Delete account permanently"
          loading={deleting}
          onPress={() => void remove()}
          variant="danger"
        />
      }>
      <View style={styles.top} />
      <Text accessibilityRole="header" style={Type.title}>
        {preview.closesBusiness ? 'Delete your account and business' : 'Delete your account'}
      </Text>
      <View style={styles.list}>
        {consequences(preview).map((line) => (
          <Text key={line} style={styles.item}>{`•  ${line}`}</Text>
        ))}
        <Text style={[styles.item, styles.strong]}>{"This can't be undone."}</Text>
      </View>

      {blockers.map((blocker) => (
        <Banner icon="warning" key={blocker} message={blocker} tone="warning" />
      ))}
      {error ? <Banner message={error} /> : null}

      <Field
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        editable={!blockers.length && !deleting}
        label={`Type ${CONFIRMATION} to confirm`}
        maxLength={12}
        onChangeText={setTyped}
        placeholder={CONFIRMATION}
        value={typed}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: Spacing.lg },
  list: { gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.lg },
  item: { fontSize: 15, lineHeight: 21, color: Colors.textMuted },
  strong: { color: Colors.text, fontWeight: '600' },
});
