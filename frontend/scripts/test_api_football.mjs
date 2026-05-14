

const API_KEY = 'a3af57473c71fd32b6c9d9c2f3865e88';
const API_HOST = 'v3.football.api-sports.io';
const LEAGUE_ID = 1; // World Cup
const SEASON = 2022; // Using 2022 to test since 2026 data might be empty

async function fetchFromApi(endpoint) {
    const url = `https://${API_HOST}/${endpoint}`;
    console.log(`Fetching: ${url}`);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': API_HOST,
                'x-rapidapi-key': API_KEY,
                // Dashboard users use 'x-apisports-key'
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

async function runTest() {
    console.log("=== Testing API-Football Connection ===");
    
    // 1. Teams
    const teams = await fetchFromApi(`teams?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`\n🏆 Teams found: ${teams?.results || 0}`);
    if (teams?.response?.length > 0) {
        console.log("Sample Team:", teams.response[0].team.name);
    }

    // 2. Fixtures
    const fixtures = await fetchFromApi(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`\n📅 Fixtures found: ${fixtures?.results || 0}`);
    if (fixtures?.response?.length > 0) {
        const f = fixtures.response[0];
        console.log(`Sample Fixture: ${f.teams.home.name} vs ${f.teams.away.name} (Status: ${f.fixture.status.short})`);
    }

    // 3. Standings
    const standings = await fetchFromApi(`standings?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`\n📊 Standings found: ${standings?.results || 0}`);
    if (standings?.response?.length > 0) {
        const group = standings.response[0].league.standings[0];
        console.log(`Sample Standings Group:`);
        group.slice(0, 2).forEach(t => console.log(`- ${t.team.name}: ${t.points} pts`));
    }

    // 4. Match Stats (for a specific fixture)
    if (fixtures?.response?.length > 0) {
        const fixtureId = fixtures.response[0].fixture.id;
        const stats = await fetchFromApi(`fixtures/statistics?fixture=${fixtureId}`);
        console.log(`\n📈 Stats for fixture ${fixtureId} found: ${stats?.results || 0}`);
    }
    
    // 5. Live Scores (Globally, since World Cup isn't live right now)
    const live = await fetchFromApi('fixtures?live=all');
    console.log(`\n🔴 Live Matches (All Leagues) right now: ${live?.results || 0}`);

    console.log("\n✅ Test completed successfully!");
}

runTest();
