// ============================================
// supabase.js — Drop this in your /src folder
// npm install @supabase/supabase-js
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://esewifusdgrjlpdbtbjg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5ZzY3cMR5I0-3d3QczCxlw_L0sgnbsU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================
// AUTH — Google SSO (company emails only)
// ============================================

export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
}

export async function signUpWithEmail(email, password) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
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

// Real-time leaderboard subscription
export function subscribeToLeaderboard(callback) {
  return supabase
    .channel('leaderboard-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles'
    }, () => {
      // Re-fetch leaderboard on any profile update
      getLeaderboard().then(callback);
    })
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


// ============================================
// ADMIN APIs
// ============================================

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from('admin_users_view')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAdminUserStatus(userId, status) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select();

  if (error) throw error;
  return data;
}

export async function updateAdminUserPoints(userId, points) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ total_points: points })
    .eq('id', userId)
    .select();

  if (error) throw error;
  return data;
}

export async function deleteAdminUser(userId) {
  // Hard delete from profiles (cascade dependencies will trigger). Wait, it only deletes public.profiles.
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) throw error;
}

export async function updateMatchLock(matchId, isLocked) {
  const { data, error } = await supabase.from('matches').update({ is_locked: isLocked }).eq('id', matchId).select();
  if (error) throw error;
  return data;
}

export async function updateMatchResult(matchId, resultHome, resultAway) {
  const { data, error } = await supabase.from('matches').update({ result_home: resultHome, result_away: resultAway }).eq('id', matchId).select();
  if (error) throw error;
  return data;
}

export async function calculateMatchPoints(matchId) {
  const { error } = await supabase.rpc('calculate_points', { p_match_id: matchId });
  if (error) throw error;
}
