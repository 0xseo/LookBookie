const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim();
const IS_LOCAL_ANDROID_DEBUG = process.env.LOOKBOOGIE_DEBUG_BUILD === '1';

function getGoogleIosUrlScheme(clientId) {
  return clientId.split('.').reverse().join('.');
}

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];

  if (GOOGLE_IOS_CLIENT_ID) {
    plugins.push([
      'react-native-nitro-google-signin',
      { iosUrlScheme: getGoogleIosUrlScheme(GOOGLE_IOS_CLIENT_ID) },
    ]);
  }

  plugins.push([
    'expo-build-properties',
    {
      android: {
        extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'],
      },
    },
  ]);

  if (KAKAO_NATIVE_APP_KEY) {
    plugins.push([
      '@react-native-seoul/kakao-login',
      { kakaoAppKey: KAKAO_NATIVE_APP_KEY },
    ]);
  }

  return {
    ...config,
    name: IS_LOCAL_ANDROID_DEBUG ? '룩부기 Dev' : config.name,
    android: {
      ...config.android,
      package: IS_LOCAL_ANDROID_DEBUG
        ? `${config.android?.package ?? 'com.lookboogie.app'}.debug`
        : config.android?.package,
    },
    plugins,
  };
};
