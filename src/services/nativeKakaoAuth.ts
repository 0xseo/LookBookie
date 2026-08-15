import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { createOAuthNoncePair } from './oauthNonce';
import { supabase } from './supabaseClient';

const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim();
const NATIVE_STACK_FRAME_PATTERN = /\n\s*at\s/;

type KakaoAuthStage = 'kakao-sdk' | 'supabase-token-exchange';

type KakaoTokenDiagnostics = {
  issuer: string | null;
  audienceMatchesNativeKey: boolean;
  hasNonce: boolean;
  emailVerified: boolean | null;
};

type KakaoLoginModule = typeof import('@react-native-seoul/kakao-login');

async function getKakaoLoginModule(): Promise<KakaoLoginModule> {
  if (!kakaoNativeAppKey) {
    throw new Error('`.env`에 Kakao Native App Key를 설정해 주세요.');
  }

  if (Platform.OS === 'web') {
    throw new Error('카카오 앱 로그인은 Android 또는 iOS 개발 빌드에서 사용할 수 있어요.');
  }

  try {
    return await import('@react-native-seoul/kakao-login');
  } catch {
    throw new Error('카카오 앱 로그인은 Expo Go가 아닌 개발 빌드나 APK에서 사용해 주세요.');
  }
}

function isKakaoLoginCancelled(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel|canceled|cancelled|취소/i.test(message);
}

function getKakaoTokenDiagnostics(idToken: string): KakaoTokenDiagnostics | null {
  try {
    const encodedPayload = idToken.split('.')[1];

    if (!encodedPayload) {
      return null;
    }

    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(globalThis.atob(paddedBase64)) as {
      iss?: unknown;
      aud?: unknown;
      nonce?: unknown;
      email_verified?: unknown;
    };
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    return {
      issuer: typeof payload.iss === 'string' ? payload.iss : null,
      audienceMatchesNativeKey: audience.includes(kakaoNativeAppKey),
      hasNonce: typeof payload.nonce === 'string' && payload.nonce.length > 0,
      emailVerified:
        typeof payload.email_verified === 'boolean' ? payload.email_verified : null,
    };
  } catch {
    return null;
  }
}

function logKakaoSignInFailure(
  stage: KakaoAuthStage,
  error: unknown,
  tokenDiagnostics: KakaoTokenDiagnostics | null,
) {
  const details =
    error && typeof error === 'object'
      ? (error as { name?: unknown; status?: unknown; code?: unknown; message?: unknown })
      : null;

  console.warn('[KakaoAuth] sign-in failed', {
    stage,
    name: typeof details?.name === 'string' ? details.name : null,
    status: typeof details?.status === 'number' ? details.status : null,
    code: typeof details?.code === 'string' ? details.code : null,
    message:
      typeof details?.message === 'string' ? details.message : String(error ?? 'Unknown error'),
    token: tokenDiagnostics,
  });
}

function getKakaoSignInErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');

  if (/unverified email with kakao|verify the email with kakao/i.test(rawMessage)) {
    return '카카오계정 대표 이메일 인증을 완료한 뒤 다시 로그인해 주세요.';
  }

  if (/key hash|keyhash|키 해시/i.test(rawMessage)) {
    return 'Kakao Developers에 현재 앱의 Android 패키지와 키 해시를 등록해 주세요.';
  }

  if (/audience|aud claim|unacceptable audience/i.test(rawMessage)) {
    return 'Supabase Kakao Client ID에 이 앱의 Native App Key를 추가해 주세요.';
  }

  if (/openid|id.?token/i.test(rawMessage)) {
    return 'Kakao Developers에서 OpenID Connect를 활성화한 뒤 다시 시도해 주세요.';
  }

  return (
    rawMessage.split(NATIVE_STACK_FRAME_PATTERN)[0]?.trim() ||
    '카카오 로그인 중 오류가 발생했어요.'
  );
}

export async function signInWithNativeKakao(): Promise<Session | null> {
  if (!supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았어요.');
  }

  const kakaoLoginModule = await getKakaoLoginModule();
  const { rawNonce, hashedNonce } = await createOAuthNoncePair();
  let stage: KakaoAuthStage = 'kakao-sdk';
  let tokenDiagnostics: KakaoTokenDiagnostics | null = null;

  try {
    const kakaoToken = await kakaoLoginModule.login({ nonce: hashedNonce });
    tokenDiagnostics = getKakaoTokenDiagnostics(kakaoToken.idToken);

    if (!kakaoToken.idToken) {
      throw new Error('Kakao ID Token을 받지 못했어요. OpenID Connect 설정을 확인해 주세요.');
    }

    stage = 'supabase-token-exchange';
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'kakao',
      token: kakaoToken.idToken,
      access_token: kakaoToken.accessToken,
      nonce: rawNonce,
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('카카오 로그인 세션을 만들지 못했어요.');
    }

    return data.session;
  } catch (error) {
    if (isKakaoLoginCancelled(error)) {
      return null;
    }

    logKakaoSignInFailure(stage, error, tokenDiagnostics);
    throw new Error(getKakaoSignInErrorMessage(error));
  }
}

export async function signOutNativeKakao() {
  if (!kakaoNativeAppKey || Platform.OS === 'web') {
    return;
  }

  try {
    const kakaoLoginModule = await getKakaoLoginModule();
    await kakaoLoginModule.logout();
  } catch {
    // Supabase logout must still succeed if the device-side Kakao session is unavailable.
  }
}
