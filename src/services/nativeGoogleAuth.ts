import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { createOAuthNoncePair } from './oauthNonce';
import { supabase } from './supabaseClient';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

const GOOGLE_DEVELOPER_CONSOLE_ERROR_CODE = '28444';
const NATIVE_STACK_FRAME_PATTERN = /\n\s*at\s/;

type GoogleSignInModule = typeof import('react-native-nitro-google-signin');

async function getGoogleSignInModule(
  hashedNonce?: string,
): Promise<GoogleSignInModule> {
  if (!googleWebClientId) {
    throw new Error('`.env`에 Google Web Client ID를 설정해 주세요.');
  }

  if (Platform.OS === 'web') {
    throw new Error('Google 앱 로그인은 Android 또는 iOS 개발 빌드에서 사용할 수 있어요.');
  }

  if (Platform.OS === 'ios' && !googleIosClientId) {
    throw new Error('iOS Google Client ID를 설정한 뒤 앱을 다시 빌드해 주세요.');
  }

  let googleSignInModule: GoogleSignInModule;

  try {
    googleSignInModule = await import('react-native-nitro-google-signin');
  } catch {
    throw new Error('Google 앱 로그인은 Expo Go가 아닌 개발 빌드나 APK에서 사용해 주세요.');
  }

  googleSignInModule.GoogleOneTapSignIn.configure({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId || undefined,
    nonce: hashedNonce,
    autoSelectOnSignIn: false,
  });

  return googleSignInModule;
}

function getGoogleSignInErrorMessage(
  error: unknown,
  googleSignInModule: GoogleSignInModule,
) {
  const rawMessage = error instanceof Error ? error.message : '';
  const isDeveloperConfigurationError =
    rawMessage.includes(`[${GOOGLE_DEVELOPER_CONSOLE_ERROR_CODE}]`) ||
    rawMessage.includes('Developer console is not set up correctly');

  if (isDeveloperConfigurationError) {
    return 'Google Cloud에 현재 앱의 Android 패키지 이름과 SHA-1을 등록해 주세요.';
  }

  if (!googleSignInModule.isErrorWithCode(error)) {
    return (
      rawMessage.split(NATIVE_STACK_FRAME_PATTERN)[0]?.trim() ||
      'Google 로그인 중 오류가 발생했어요.'
    );
  }

  if (error.code === googleSignInModule.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play 서비스를 설치하거나 최신 버전으로 업데이트해 주세요.';
  }

  if (error.code === googleSignInModule.statusCodes.DEVELOPER_ERROR) {
    return 'Google Client ID, Android 패키지 이름, 빌드 인증서 SHA-1 설정을 확인해 주세요.';
  }

  return error.message;
}

export async function signInWithNativeGoogle(): Promise<Session | null> {
  if (!supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았어요.');
  }

  const { rawNonce, hashedNonce } = await createOAuthNoncePair();
  const googleSignInModule = await getGoogleSignInModule(hashedNonce);

  try {
    await googleSignInModule.GoogleOneTapSignIn.checkPlayServices();

    let response = await googleSignInModule.GoogleOneTapSignIn.signIn();

    if (googleSignInModule.isNoSavedCredentialFoundResponse(response)) {
      response = await googleSignInModule.GoogleOneTapSignIn.createAccount();
    }

    if (googleSignInModule.isNoSavedCredentialFoundResponse(response)) {
      response = await googleSignInModule.GoogleOneTapSignIn.presentExplicitSignIn();
    }

    if (googleSignInModule.isCancelledResponse(response)) {
      return null;
    }

    if (!googleSignInModule.isSuccessResponse(response)) {
      throw new Error('선택할 수 있는 Google 계정을 찾지 못했어요.');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
      nonce: rawNonce,
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('Google 로그인 세션을 만들지 못했어요.');
    }

    return data.session;
  } catch (error) {
    if (
      googleSignInModule.isErrorWithCode(error) &&
      error.code === googleSignInModule.statusCodes.SIGN_IN_CANCELLED
    ) {
      return null;
    }

    throw new Error(getGoogleSignInErrorMessage(error, googleSignInModule));
  }
}

export async function signOutNativeGoogle() {
  if (!googleWebClientId || Platform.OS === 'web') {
    return;
  }

  try {
    const googleSignInModule = await getGoogleSignInModule();
    await googleSignInModule.GoogleOneTapSignIn.signOut();
  } catch {
    // Supabase logout must still succeed if the device-side Google session is unavailable.
  }
}
