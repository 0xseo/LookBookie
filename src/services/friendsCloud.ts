import type { FriendProfile, FriendWardrobeItem } from '../types/friends';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export async function ensureCurrentProfile() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const client = getConfiguredSupabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user?.email) {
    return null;
  }

  const email = user.email.trim().toLowerCase();
  const { error: upsertError } = await client.from('profiles').upsert({
    id: user.id,
    email,
    display_name: email.split('@')[0] ?? email,
  });

  if (upsertError) {
    throw upsertError;
  }

  return {
    id: user.id,
    email,
    displayName: email.split('@')[0] ?? null,
  };
}

export async function addFriendByEmail(emailInput: string) {
  const user = await getCloudUser();
  const client = getConfiguredSupabase();
  const email = emailInput.trim().toLowerCase();

  if (!email) {
    throw new Error('친구 이메일을 입력해 주세요.');
  }

  await ensureCurrentProfile();

  const { data: friend, error: friendError } = await client
    .from('profiles')
    .select('id,email,display_name')
    .eq('email', email)
    .maybeSingle();

  if (friendError) {
    throw friendError;
  }

  if (!friend) {
    throw new Error('해당 이메일의 룩북이 프로필을 찾지 못했어요.');
  }

  if (friend.id === user.id) {
    throw new Error('내 계정은 친구로 추가할 수 없어요.');
  }

  const { error: insertError } = await client.from('friendships').insert({
    owner_id: user.id,
    friend_id: friend.id,
  });

  if (insertError && insertError.code !== '23505') {
    throw insertError;
  }

  return mapProfile(friend);
}

export async function listFriends() {
  const user = await getCloudUser();
  const client = getConfiguredSupabase();
  const { data: friendships, error: friendshipsError } = await client
    .from('friendships')
    .select('friend_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (friendshipsError) {
    throw friendshipsError;
  }

  const friendIds = friendships.map((friendship) => friendship.friend_id);

  if (friendIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id,email,display_name')
    .in('id', friendIds);

  if (profilesError) {
    throw profilesError;
  }

  return profiles.map(mapProfile);
}

export async function listFriendWardrobe(friendId: string): Promise<FriendWardrobeItem[]> {
  await getCloudUser();
  const client = getConfiguredSupabase();

  const { data, error } = await client
    .from('clothes')
    .select('id,owner_id,remote_image_url,brand,category,seasons,color,created_at')
    .eq('owner_id', friendId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((item) => ({
    id: item.id,
    ownerId: item.owner_id,
    remoteImageUrl: item.remote_image_url,
    brand: item.brand,
    category: item.category,
    seasons: item.seasons,
    color: item.color,
    createdAt: item.created_at,
  }));
}

async function getCloudUser() {
  const client = getConfiguredSupabase();

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('로그인이 필요해요.');
  }

  return user;
}

function getConfiguredSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았어요.');
  }

  return supabase;
}

function mapProfile(profile: {
  id: string;
  email: string;
  display_name: string | null;
}): FriendProfile {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
  };
}
