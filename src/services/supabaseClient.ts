import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import 'react-native-url-polyfill/auto';

import type { ClothingCategory, ClothingColor, Season } from '../types/clothing';

type LookbookieDatabase = {
  public: {
    Tables: {
      clothes: {
        Row: {
          id: string;
          owner_id: string;
          remote_image_url: string;
          storage_path: string;
          brand: string | null;
          category: ClothingCategory;
          seasons: Season[];
          color: ClothingColor;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          remote_image_url: string;
          storage_path: string;
          brand?: string | null;
          category: ClothingCategory;
          seasons: Season[];
          color: ClothingColor;
        };
        Update: {
          remote_image_url?: string;
          storage_path?: string;
          brand?: string | null;
          category?: ClothingCategory;
          seasons?: Season[];
          color?: ClothingColor;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          owner_id: string;
          friend_id: string;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          friend_id: string;
        };
        Update: never;
        Relationships: [];
      };
      outfits: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          stickers: unknown;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          stickers: unknown;
        };
        Update: {
          name?: string;
          stickers?: unknown;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseStorageBucket =
  process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'clothes';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient<LookbookieDatabase> | null = isSupabaseConfigured
  ? createClient<LookbookieDatabase>(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export type CloudSession = Session;
export type CloudUser = User;
