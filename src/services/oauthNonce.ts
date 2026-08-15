import * as Crypto from 'expo-crypto';

export async function createOAuthNoncePair() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  return { rawNonce, hashedNonce };
}
