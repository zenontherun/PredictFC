// ============================================
// apiFootball.js — Service to fetch live football data
// Warning: If you are on the free tier, you get 100 requests/day.
// It is recommended to cache these results in your state or Supabase 
// rather than fetching them on every component render.
// ============================================

const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
const API_HOST = 'v3.football.api-sports.io';

// World Cup 2026 Settings
const LEAGUE_ID = 1; // 1 is World Cup
const SEASON = 2026; // Set to 2022 to test with old data if 2026 is empty

/**
 * Generic fetcher for API-Football
 */
async function fetchFromApi(endpoint) {
  if (!API_KEY) {
    console.error("Missing VITE_API_FOOTBALL_KEY in .env file");
    return null;
  }

  const url = `https://${API_HOST}/${endpoint}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY,
        // Fallback for dashboard keys
        'x-apisports-key': API_KEY 
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * 1. Fetch All Teams in the World Cup
 */
export async function getTeams() {
  const data = await fetchFromApi(`teams?league=${LEAGUE_ID}&season=${SEASON}`);
  return data?.response || [];
}

/**
 * 2. Fetch All Fixtures (Schedule & Results)
 */
export async function getFixtures() {
  const data = await fetchFromApi(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
  return data?.response || [];
}

/**
 * 3. Fetch Group Standings
 */
export async function getStandings() {
  const data = await fetchFromApi(`standings?league=${LEAGUE_ID}&season=${SEASON}`);
  // Returns an array of groups, each containing an array of teams
  if (data?.response?.length > 0) {
    return data.response[0].league.standings;
  }
  return [];
}

/**
 * 4. Fetch Live Scores
 * Useful for displaying currently running matches anywhere in the app
 */
export async function getLiveScores() {
  // Use live=all to get matches currently happening, or live=1-2-3 for specific leagues
  const data = await fetchFromApi(`fixtures?live=${LEAGUE_ID}`);
  return data?.response || [];
}

/**
 * 5. Fetch Specific Match Stats
 * @param {number} fixtureId - The API-Football fixture ID
 */
export async function getMatchStats(fixtureId) {
  const data = await fetchFromApi(`fixtures/statistics?fixture=${fixtureId}`);
  return data?.response || [];
}
