import { Redirect } from 'expo-router';

/** Placeholder route for the Create tab; pressing the tab opens the /create sheet instead. */
export default function CreateTab() {
  return <Redirect href="/" />;
}
