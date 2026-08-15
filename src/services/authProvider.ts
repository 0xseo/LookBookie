import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

export type CloudAuthProvider = 'email' | 'google' | 'kakao' | 'apple';

const AUTH_PROVIDER_STORAGE_KEY = 'lookboogie:last-auth-provider';
const SOCIAL_PROVIDER_PRIORITY: CloudAuthProvider[] = ['google', 'kakao', 'apple'];

type StoredAuthProvider = {
  userId: string;
  provider: CloudAuthProvider;
};

export function sessionHasAuthProvider(
  session: Session | null,
  provider: CloudAuthProvider,
) {
  return getSessionAuthProviders(session).has(provider);
}

export function inferCloudAuthProvider(session: Session | null): CloudAuthProvider | null {
  if (!session) {
    return null;
  }

  const providers = getSessionAuthProviders(session);
  const primaryProvider = normalizeAuthProvider(session.user.app_metadata.provider);

  if (primaryProvider && primaryProvider !== 'email') {
    return primaryProvider;
  }

  const linkedSocialProvider = SOCIAL_PROVIDER_PRIORITY.find((provider) =>
    providers.has(provider),
  );

  if (linkedSocialProvider) {
    return linkedSocialProvider;
  }

  return primaryProvider ?? (providers.has('email') ? 'email' : null);
}

export async function getRememberedCloudAuthProvider(session: Session | null) {
  const inferredProvider = inferCloudAuthProvider(session);

  if (!session) {
    return null;
  }

  try {
    const rawProvider = await AsyncStorage.getItem(AUTH_PROVIDER_STORAGE_KEY);

    if (!rawProvider) {
      return inferredProvider;
    }

    const storedProvider = JSON.parse(rawProvider) as Partial<StoredAuthProvider>;
    const provider = normalizeAuthProvider(storedProvider.provider);

    if (
      storedProvider.userId === session.user.id &&
      provider &&
      sessionHasAuthProvider(session, provider)
    ) {
      return provider;
    }
  } catch {
    // Session metadata remains a safe fallback when local preferences are unavailable.
  }

  return inferredProvider;
}

export async function rememberCloudAuthProvider(
  userId: string,
  provider: CloudAuthProvider,
) {
  const storedProvider: StoredAuthProvider = { userId, provider };

  try {
    await AsyncStorage.setItem(AUTH_PROVIDER_STORAGE_KEY, JSON.stringify(storedProvider));
  } catch {
    // Provider display must never turn a successful authentication into an error.
  }
}

export async function clearRememberedCloudAuthProvider() {
  try {
    await AsyncStorage.removeItem(AUTH_PROVIDER_STORAGE_KEY);
  } catch {
    // The signed-out session remains authoritative even if local cleanup is unavailable.
  }
}

function getSessionAuthProviders(session: Session | null) {
  const providers = new Set<CloudAuthProvider>();

  if (!session) {
    return providers;
  }

  const candidates = [
    session.user.app_metadata.provider,
    ...(Array.isArray(session.user.app_metadata.providers)
      ? session.user.app_metadata.providers
      : []),
    ...(session.user.identities ?? []).map((identity) => identity.provider),
  ];

  for (const candidate of candidates) {
    const provider = normalizeAuthProvider(candidate);

    if (provider) {
      providers.add(provider);
    }
  }

  return providers;
}

function normalizeAuthProvider(value: unknown): CloudAuthProvider | null {
  return value === 'email' ||
    value === 'google' ||
    value === 'kakao' ||
    value === 'apple'
    ? value
    : null;
}
