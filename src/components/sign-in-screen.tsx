import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, FormField, InlineNotice } from "@/components/ui";
import { Brand } from "@/constants/theme";
import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SignInScreen() {
  const { signIn, completeChallenge, challenge, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setLocalError(null);
    clearError();
    if (!email.trim() || !password) {
      setLocalError("Enter your email and password to continue.");
      return;
    }
    setWorking(true);
    try {
      if (challenge) await completeChallenge(password);
      else await signIn(email, password);
    } catch {
      // The auth provider exposes the server's safe error message.
    } finally {
      setWorking(false);
    }
  };

  const sendRecovery = async () => {
    setLocalError(null);
    setMessage(null);
    if (!email.trim()) {
      setLocalError("Enter your email address first.");
      return;
    }
    setWorking(true);
    try {
      await request("/auth/forget-password", {
        method: "POST",
        body: { email: email.trim() },
        authenticated: false,
      });
      setMessage(
        "If this account can be recovered, a verification code has been sent.",
      );
      router.push({
        pathname: "/reset-password",
        params: { email: email.trim() },
      });
    } catch (cause) {
      setLocalError(
        cause instanceof Error
          ? cause.message
          : "Unable to start account recovery.",
      );
    } finally {
      setWorking(false);
    }
  };

  const testApiConnection = async () => {
    setLocalError(null);
    setMessage(null);
    setWorking(true);
    try {
      await request("posts/1", { authenticated: false });
      setMessage("API connection succeeded. Fetched JSONPlaceholder posts/1.");
    } catch (cause) {
      setLocalError(
        cause instanceof Error ? cause.message : "Unable to reach the API.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image
                accessibilityLabel="GigGuru"
                contentFit="contain"
                source={require("@/assets/images/white-logo.png")}
                style={styles.logo}
              />
            </View>
            <Text style={styles.brandName}>The GigGuru</Text>
            <Text style={styles.brandTag}>MERCHANT</Text>
          </View>

          <View style={styles.welcome}>
            <Text style={styles.welcomeEyebrow}>
              WELCOME TO YOUR BUSINESS HUB
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {challenge ? "Create a new password" : "Sign in to The GigGuru"}
            </Text>
            {challenge ? (
              <InlineNotice
                message="Your account needs a new password before you can continue."
                tone="info"
              />
            ) : null}
            {localError || error ? (
              <InlineNotice message={localError || error!} />
            ) : null}
            {message ? <InlineNotice message={message} tone="info" /> : null}
            {!challenge ? (
              <FormField
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Email address"
                onChangeText={setEmail}
                placeholder="you@business.com"
                returnKeyType="next"
                value={email}
              />
            ) : null}
            <FormField
              autoCapitalize="none"
              autoComplete={challenge ? "new-password" : "password"}
              label={challenge ? "New password" : "Password"}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              value={password}
            />
            <AppButton
              label={challenge ? "Update password & continue" : "Sign in"}
              loading={working}
              onPress={() => void submit()}
              style={styles.submit}
            />
            {!challenge ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={working}
                  onPress={() => void sendRecovery()}
                  style={styles.textAction}
                >
                  <Text style={styles.actionText}>Forgot password?</Text>
                </Pressable>
                {__DEV__ ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={working}
                    onPress={() => void testApiConnection()}
                    style={styles.textAction}
                  >
                    <Text style={styles.actionText}>Test API connection</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.secureNote}>
                  Your account and business data stay protected with secure
                  sign-in.
                </Text>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setLocalError(null)}
                style={styles.textAction}
              >
                <Text style={styles.actionText}>
                  Password must include uppercase, lowercase, number and symbol.
                </Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.footer}>
            BUILT FOR THE PEOPLE WHO MAKE IT HAPPEN
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 34,
    paddingBottom: 26,
  },
  brandRow: { alignItems: "center", marginBottom: 32 },
  logoWrap: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: Brand.deep,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logo: { width: 52, height: 52 },
  brandName: {
    color: Brand.deep,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandTag: {
    color: Brand.green,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 2,
  },
  welcome: { width: "100%", maxWidth: 420, marginBottom: 25 },
  welcomeEyebrow: {
    color: Brand.green,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  welcomeCopy: {
    color: Brand.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
  },
  form: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 23,
    padding: 19,
  },
  formTitle: {
    color: Brand.deep,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 17,
  },
  submit: { marginTop: 3 },
  textAction: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  actionText: {
    color: Brand.green,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  secureNote: {
    color: Brand.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },
  footer: {
    color: Brand.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: "auto",
    paddingTop: 24,
    textAlign: "center",
  },
});
