import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import type { Provider, Session } from '@supabase/supabase-js';

import { supabase } from './supabaseClient';

export type SocialAuthProvider = Extract<Provider, 'google' | 'kakao' | 'apple'>;
type BrowserSocialAuthProvider = Exclude<SocialAuthProvider, 'google' | 'kakao'>;

export const SOCIAL_AUTH_REDIRECT_URL = makeRedirectUri({
  native: 'lookboogie://auth/callback',
  scheme: 'lookboogie',
  path: 'auth/callback',
});

WebBrowser.maybeCompleteAuthSession();

async function createSessionFromRedirect(url: string): Promise<Session> {
  if (!supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았어요.');
  }

  const { params, errorCode } = getQueryParams(url);
  const oauthError = params.error_description ?? params.error ?? errorCode;

  if (oauthError) {
    throw new Error(oauthError);
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    throw new Error('로그인 응답에서 세션 정보를 찾지 못했어요.');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('클라우드 로그인 세션을 만들지 못했어요.');
  }

  if (!data.session.user.email) {
    await supabase.auth.signOut();
    throw new Error('룩부기 친구 기능을 사용하려면 이메일 제공에 동의해 주세요.');
  }

  return data.session;
}

export async function signInWithSocialProvider(
  provider: BrowserSocialAuthProvider,
): Promise<Session | null> {
  if (!supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았어요.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: SOCIAL_AUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('소셜 로그인 페이지를 열지 못했어요.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, SOCIAL_AUTH_REDIRECT_URL);

  if (result.type !== 'success') {
    return null;
  }

  return createSessionFromRedirect(result.url);
}
