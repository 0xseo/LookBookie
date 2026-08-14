import type {
  FriendRequest,
  FriendOutfit,
  FriendOutfitSticker,
  FriendProfile,
  FriendWardrobeItem,
} from '../types/friends';
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
  const { data: existingProfile, error: profileError } = await client
    .from('profiles')
    .select('id,email,display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (existingProfile) {
    if (existingProfile.email === email) {
      return mapProfile(existingProfile);
    }

    const { data: updatedProfile, error: updateError } = await client
      .from('profiles')
      .update({ email, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id,email,display_name')
      .single();

    if (updateError) {
      throw updateError;
    }

    return mapProfile(updatedProfile);
  }

  const { data: insertedProfile, error: insertError } = await client
    .from('profiles')
    .insert({
      id: user.id,
      email,
      display_name: email.split('@')[0] ?? email,
    })
    .select('id,email,display_name')
    .single();

  if (insertError) {
    throw insertError;
  }

  return mapProfile(insertedProfile);
}

export async function updateCurrentProfileDisplayName(displayNameInput: string) {
  const user = await getCloudUser();
  const client = getConfiguredSupabase();
  const displayName = displayNameInput.trim();

  if (!displayName) {
    throw new Error('친구에게 표시할 이름을 입력해 주세요.');
  }

  if (displayName.length > 24) {
    throw new Error('이름은 24자 이내로 입력해 주세요.');
  }

  const { data, error } = await client
    .from('profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id,email,display_name')
    .single();

  if (error) {
    throw error;
  }

  if (data.display_name !== displayName) {
    throw new Error('프로필 이름이 서버에 반영되지 않았어요.');
  }

  return mapProfile(data);
}

type FriendshipRow = {
  id: string;
  owner_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export async function sendFriendRequestByEmail(emailInput: string) {
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
    throw new Error('해당 이메일의 룩부기 프로필을 찾지 못했어요.');
  }

  if (friend.id === user.id) {
    throw new Error('내 계정은 친구로 추가할 수 없어요.');
  }

  const { data: existingOutgoing, error: outgoingError } = await client
    .from('friendships')
    .select('id,status')
    .eq('owner_id', user.id)
    .eq('friend_id', friend.id)
    .maybeSingle();

  if (outgoingError) {
    throw outgoingError;
  }

  if (existingOutgoing?.status === 'accepted') {
    throw new Error('이미 친구로 연결돼 있어요.');
  }

  if (existingOutgoing?.status === 'pending') {
    throw new Error('이미 친구 요청을 보냈어요.');
  }

  const { data: incomingRequest, error: incomingError } = await client
    .from('friendships')
    .select('id,status')
    .eq('owner_id', friend.id)
    .eq('friend_id', user.id)
    .maybeSingle();

  if (incomingError) {
    throw incomingError;
  }

  if (incomingRequest?.status === 'pending') {
    const { error: acceptError } = await client
      .from('friendships')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', incomingRequest.id);

    if (acceptError) {
      throw acceptError;
    }

    return mapProfile(friend);
  }

  if (incomingRequest?.status === 'accepted') {
    throw new Error('이미 친구로 연결돼 있어요.');
  }

  const { error: insertError } = await client.from('friendships').insert({
    owner_id: user.id,
    friend_id: friend.id,
    status: 'pending',
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
    .select('id,owner_id,friend_id,status,created_at')
    .eq('status', 'accepted')
    .or(`owner_id.eq.${user.id},friend_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (friendshipsError) {
    throw friendshipsError;
  }

  const friendIds = friendships.map((friendship) =>
    friendship.owner_id === user.id ? friendship.friend_id : friendship.owner_id,
  );

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

export async function listIncomingFriendRequests() {
  const user = await getCloudUser();
  const client = getConfiguredSupabase();
  const { data: requests, error } = await client
    .from('friendships')
    .select('id,owner_id,friend_id,status,created_at')
    .eq('friend_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return mapFriendRequests(requests, user.id, 'incoming');
}

export async function listOutgoingFriendRequests() {
  const user = await getCloudUser();
  const client = getConfiguredSupabase();
  const { data: requests, error } = await client
    .from('friendships')
    .select('id,owner_id,friend_id,status,created_at')
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return mapFriendRequests(requests, user.id, 'outgoing');
}

export async function acceptFriendRequest(friendshipId: string) {
  await getCloudUser();
  const client = getConfiguredSupabase();
  const { error } = await client
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) {
    throw error;
  }
}

export async function declineFriendRequest(friendshipId: string) {
  await getCloudUser();
  const client = getConfiguredSupabase();
  const { error } = await client.from('friendships').delete().eq('id', friendshipId);

  if (error) {
    throw error;
  }
}

export async function listFriendWardrobe(friendId: string): Promise<FriendWardrobeItem[]> {
  await getCloudUser();
  const client = getConfiguredSupabase();

  const { data, error } = await client
    .from('clothes')
    .select('id,owner_id,remote_image_url,name,brand,category,seasons,color,color_value,color_family,created_at')
    .eq('owner_id', friendId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((item) => ({
    id: item.id,
    ownerId: item.owner_id,
    remoteImageUrl: item.remote_image_url,
    name: item.name,
    brand: item.brand,
    category: item.category,
    seasons: item.seasons,
    color: item.color,
    colorValue: item.color_value,
    colorFamily: item.color_family,
    createdAt: item.created_at,
  }));
}

export async function listFriendOutfits(friendId: string): Promise<FriendOutfit[]> {
  await getCloudUser();
  const client = getConfiguredSupabase();

  const { data, error } = await client
    .from('outfits')
    .select('id,owner_id,name,seasons,stickers,canvas_width,canvas_height,created_at')
    .eq('owner_id', friendId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((outfit) => ({
    id: outfit.id,
    ownerId: outfit.owner_id,
    name: outfit.name,
    seasons: outfit.seasons,
    stickers: parseFriendOutfitStickers(outfit.stickers),
    canvasWidth: outfit.canvas_width,
    canvasHeight: outfit.canvas_height,
    createdAt: outfit.created_at,
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

function parseFriendOutfitStickers(value: unknown): FriendOutfitSticker[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((sticker) => {
      if (!sticker || typeof sticker !== 'object') {
        return null;
      }

      const candidate = sticker as Partial<FriendOutfitSticker>;

      return {
        remoteImageUrl:
          typeof candidate.remoteImageUrl === 'string' ? candidate.remoteImageUrl : null,
        name: typeof candidate.name === 'string' ? candidate.name : null,
        brand: typeof candidate.brand === 'string' ? candidate.brand : null,
        category: typeof candidate.category === 'string' ? candidate.category : null,
        color: typeof candidate.color === 'string' ? candidate.color : null,
        colorValue: typeof candidate.colorValue === 'string' ? candidate.colorValue : null,
        colorFamily: typeof candidate.colorFamily === 'string' ? candidate.colorFamily : null,
        x: typeof candidate.x === 'number' ? candidate.x : 0,
        y: typeof candidate.y === 'number' ? candidate.y : 0,
        size: typeof candidate.size === 'number' ? candidate.size : 96,
        rotation: typeof candidate.rotation === 'number' ? candidate.rotation : 0,
        zIndex: typeof candidate.zIndex === 'number' ? candidate.zIndex : 0,
      };
    })
    .filter((sticker): sticker is FriendOutfitSticker => Boolean(sticker));
}

async function mapFriendRequests(
  requests: FriendshipRow[],
  currentUserId: string,
  direction: FriendRequest['direction'],
) {
  const profileIds = requests.map((request) =>
    direction === 'incoming' ? request.owner_id : request.friend_id,
  );

  if (profileIds.length === 0) {
    return [];
  }

  const client = getConfiguredSupabase();
  const { data: profiles, error } = await client
    .from('profiles')
    .select('id,email,display_name')
    .in('id', profileIds);

  if (error) {
    throw error;
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return requests
    .map((request): FriendRequest | null => {
      const profileId = direction === 'incoming' ? request.owner_id : request.friend_id;
      const profile = profileById.get(profileId);

      if (!profile || profileId === currentUserId) {
        return null;
      }

      return {
        ...mapProfile(profile),
        friendshipId: request.id,
        direction,
        status: request.status,
        createdAt: request.created_at,
      };
    })
    .filter((request): request is FriendRequest => Boolean(request));
}
