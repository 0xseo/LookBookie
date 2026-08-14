import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import 'react-native-url-polyfill/auto';

import type { ClothingCategory, ClothingColor, ColorFamily, Season } from '../types/clothing';

type LookBoogieDatabase = {
  public: {
    Tables: {
      clothes: {
        Row: {
          id: string;
          owner_id: string;
          remote_image_url: string;
          storage_path: string;
          name: string | null;
          brand: string | null;
          category: ClothingCategory;
          seasons: Season[];
          color: ClothingColor;
          color_value: string | null;
          color_family: ColorFamily | null;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          remote_image_url: string;
          storage_path: string;
          name?: string | null;
          brand?: string | null;
          category: ClothingCategory;
          seasons: Season[];
          color: ClothingColor;
          color_value?: string | null;
          color_family?: ColorFamily | null;
        };
        Update: {
          remote_image_url?: string;
          storage_path?: string;
          name?: string | null;
          brand?: string | null;
          category?: ClothingCategory;
          seasons?: Season[];
          color?: ClothingColor;
          color_value?: string | null;
          color_family?: ColorFamily | null;
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
          status: 'pending' | 'accepted';
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted';
          accepted_at?: string | null;
        };
        Update: {
          status?: 'pending' | 'accepted';
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      outfits: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          seasons: Season[];
          stickers: unknown;
          canvas_width: number | null;
          canvas_height: number | null;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          seasons?: Season[];
          stickers: unknown;
          canvas_width?: number | null;
          canvas_height?: number | null;
        };
        Update: {
          name?: string;
          seasons?: Season[];
          stickers?: unknown;
          canvas_width?: number | null;
          canvas_height?: number | null;
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

export const supabase: SupabaseClient<LookBoogieDatabase> | null = isSupabaseConfigured
  ? createClient<LookBoogieDatabase>(supabaseUrl as string, supabasePublishableKey as string, {
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
