import { createClient } from '@supabase/supabase-js';

// ==========================================
// CONFIGURATION
// ==========================================
// You need to install these packages first:
// npm install dotenv node-cron
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config({ path: '.env' }); // Load the same .env file used by Vite

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// IMPORTANT: Use the SERVICE_ROLE_KEY here to bypass RLS policies and have admin rights
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

// Example using api-football (RapidAPI) - The most popular football API
// Get a free key here: https://rapidapi.com/api-sports/api/api-football
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const LEAGUE_ID = 1; // 1 is usually World Cup in api-football
const SEASON = 2026;

async function fetchAndProcessMatches() {
    console.log(`[${new Date().toISOString()}] Fetching latest match results...`);
    
    if (!API_FOOTBALL_KEY) {
        console.error("❌ Missing API_FOOTBALL_KEY. Please add it to your .env file.");
        return;
    }

    try {
        // 1. Fetch completed matches from the external API
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}&status=FT`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': API_FOOTBALL_KEY,
                'x-apisports-key': API_FOOTBALL_KEY
            }
        });
        
        const data = await response.json();
        const apiMatches = data.response || [];
        
        if (apiMatches.length === 0) {
            console.log("No completed matches found in the API yet.");
            return;
        }

        // 2. Fetch our database matches that haven't been scored yet
        const { data: dbMatches, error: dbError } = await supabase
            .from('matches')
            .select('id, home_team, away_team')
            .is('result_home', null); // Only get matches without results
            
        if (dbError) throw dbError;

        for (const dbMatch of dbMatches) {
            // Find the corresponding match in the API data
            // Note: Team names might need mapping if the API names differ from your DB names 
            // (e.g., "USA" vs "United States")
            const completedMatch = apiMatches.find(m => 
                (m.teams.home.name.includes(dbMatch.home_team) || dbMatch.home_team.includes(m.teams.home.name)) &&
                (m.teams.away.name.includes(dbMatch.away_team) || dbMatch.away_team.includes(m.teams.away.name))
            );

            if (completedMatch) {
                const homeScore = completedMatch.goals.home;
                const awayScore = completedMatch.goals.away;
                
                console.log(`✅ Match finished: ${dbMatch.home_team} ${homeScore} - ${awayScore} ${dbMatch.away_team}`);
                
                // 3. Update the match in Supabase
                const { error: updateError } = await supabase
                    .from('matches')
                    .update({ 
                        result_home: homeScore, 
                        result_away: awayScore,
                        is_locked: true // Lock it just in case
                    })
                    .eq('id', dbMatch.id);
                    
                if (updateError) {
                    console.error(`Error updating match ${dbMatch.id}:`, updateError);
                    continue;
                }

                // 4. Trigger the points calculation!
                // This calls the postgres function we created in your schema
                const { error: rpcError } = await supabase.rpc('calculate_points', {
                    p_match_id: dbMatch.id
                });

                if (rpcError) {
                    console.error(`Error calculating points for match ${dbMatch.id}:`, rpcError);
                } else {
                    console.log(`🏆 Points updated for match ${dbMatch.id}! Leaderboard is now live.`);
                }
            }
        }
        
    } catch (error) {
        console.error("Error in fetchAndProcessMatches:", error);
    }
}

// ==========================================
// CRON SCHEDULE
// ==========================================
// Run this script automatically in the background
// Currently set to run every 30 minutes: '*/30 * * * *'
// This uses 48 requests per day (well under the 100 limit free tier)

console.log("🤖 Auto-Updater started. Waiting for next schedule to run...");

cron.schedule('*/30 * * * *', () => {
    fetchAndProcessMatches();
});

// Run it once immediately on startup
fetchAndProcessMatches();
