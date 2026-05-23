// ============================================
// supabase.js — Drop this in your /src folder
// npm install @supabase/supabase-js
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';   // from Supabase dashboard
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';                    // from Supabase dashboard

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================
// AUTH — Google SSO (company emails only)
// ============================================

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      // Restrict to your company domain:
      queryParams: { hd: 'yourcompany.com' }
    }
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return profile;
}

// Listen to auth state changes
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}


// ============================================
// MATCHES
// ============================================

export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true });

  if (error) throw error;
  return data;
}


// ============================================
// PREDICTIONS
// ============================================

export async function getUserPredictions(userId) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*, matches(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function savePrediction({ userId, matchId, predictedHome, predictedAway }) {
  // Check match isn't locked
  const { data: match } = await supabase
    .from('matches')
    .select('is_locked')
    .eq('id', matchId)
    .single();

  if (match?.is_locked) throw new Error('This match is locked — predictions are closed!');

  // Upsert = insert or update if already exists
  const { data, error } = await supabase
    .from('predictions')
    .upsert({
      user_id: userId,
      match_id: matchId,
      predicted_home: predictedHome,
      predicted_away: predictedAway,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,match_id' });

  if (error) throw error;
  return data;
}


// ============================================
// LEADERBOARD
// ============================================

export async function getLeaderboard(limit = 50) {
  const { data, error } = await supabase
    .from('leaderboard')   // uses the SQL view we created
    .select('*')
    .limit(limit);

  if (error) throw error;
  return data;
}

// Simple debounce helper to prevent query storms during batch updates
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Real-time leaderboard subscription
export function subscribeToLeaderboard(callback) {
  const debouncedFetch = debounce(() => {
    getLeaderboard().then(callback);
  }, 2000); // Wait for 2 seconds of inactivity before querying

  return supabase
    .channel('leaderboard-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles'
    }, debouncedFetch)
    .subscribe();
}


// ============================================
// PROFILE
// ============================================

export async function updateProfile(userId, { username, avatarEmoji }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ username, avatar_emoji: avatarEmoji })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
