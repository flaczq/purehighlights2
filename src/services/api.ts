import axios from 'axios';
import Constants from 'expo-constants';
import { SCOREBAT_KEY, API_FOOTBALL_KEY, SPORTMONKS_KEY, HIGHLIGHTLY_KEY } from '@env';

// --- CONFIGURATION ---
// Set your preferred provider here: 'api-football' | 'scorebat' | 'sportmonks' | 'highlightly'
export const ACTIVE_PROVIDER: ApiProvider = 'highlightly';
// ----------------------

export type ApiProvider = 'api-football' | 'scorebat' | 'sportmonks' | 'highlightly';

export interface Video {
    title: string;
    embed: string;
}

export interface Match {
    id?: string | number;
    title: string;
    competition: string;
    matchviewUrl: string;
    thumbnail: string;
    date: string;
    videos: Video[];
    sourceProvider: ApiProvider;
}

export interface AlternativeSource {
    name: string;
    url: string;
    type: 'direct' | 'search' | 'embed';
}

const SCOREBAT_BASE_URL = 'https://www.scorebat.com/video-api/v3/';
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io/';
const SPORTMONKS_BASE_URL = 'https://api.sportmonks.com/v3/football/';
const HIGHLIGHTLY_BASE_URL = 'https://soccer.highlightly.net'; // Removed trailing slash

export const fetchMatchesFromScoreBat = async (competitionSlug?: string): Promise<Match[]> => {
    try {
        const apiToken = Constants.expoConfig?.extra?.SCOREBAT_KEY || SCOREBAT_KEY;
        let url = `${SCOREBAT_BASE_URL}feed/?token=${apiToken}`;
        if (competitionSlug) {
            url = `${SCOREBAT_BASE_URL}competition/${competitionSlug}/?token=${apiToken}`;
        }

        const response = await axios.get(url);
        return (response.data.response || []).map((m: any) => ({
            ...m,
            sourceProvider: 'scorebat'
        }));
    } catch (error) {
        console.error('Error fetching from ScoreBat:', error);
        return [];
    }
};

export const fetchMatchesFromApiFootball = async (apiFootballId?: number): Promise<Match[]> => {
    try {
        if (!apiFootballId) return [];

        const apiKey = Constants.expoConfig?.extra?.API_FOOTBALL_KEY || API_FOOTBALL_KEY;

        const fromDate = '2024-01-01';
        const toDate = '2024-12-31';
        const season = 2024;

        const response = await axios.get(`${API_FOOTBALL_BASE_URL}fixtures`, {
            params: {
                league: apiFootballId,
                season: season,
                from: fromDate,
                to: toDate
            },
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });

        const fixtures = response.data.response || [];

        return fixtures.map((f: any) => ({
            id: f.fixture.id,
            title: `${f.teams.home.name} ${f.goals.home ?? ''} - ${f.goals.away ?? ''} ${f.teams.away.name}`,
            competition: f.league.name,
            matchviewUrl: '',
            thumbnail: f.league.logo || f.teams.home.logo,
            date: f.fixture.date,
            videos: [],
            sourceProvider: 'api-football'
        }));
    } catch (error) {
        console.error('Error fetching from API-Football:', error);
        return [];
    }
};

export const fetchMatchesFromHighlightly = async (leagueId?: number): Promise<Match[]> => {
    try {
        const apiKey = Constants.expoConfig?.extra?.HIGHLIGHTLY_KEY || HIGHLIGHTLY_KEY;

        // Highlightly /matches usually requires a season parameter
        const now = new Date();
        const season = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();

        const params: any = {
            season: season // Required for /matches endpoint
        };
        if (leagueId) {
            params.leagueId = leagueId;
        }

        console.log(`Fetching Highlightly matches with params:`, params);

        const response = await axios.get(`${HIGHLIGHTLY_BASE_URL}/matches`, {
            params,
            headers: {
                'x-rapidapi-key': apiKey,
                'Authorization': `Bearer ${apiKey}`
            }
        });

        console.log("HIGHLIGHTLY RESPONSE DATA:", JSON.stringify(response.data, null, 2).slice(0, 500));

        const items = response.data.data || response.data || [];

        return items.map((h: any) => ({
            id: h.id || h.matchId,
            title: h.matchName || h.title || `${h.homeTeam?.name || 'Home'} vs ${h.awayTeam?.name || 'Away'}`,
            competition: h.leagueName || 'Official Match',
            matchviewUrl: '',
            thumbnail: h.thumbnail || h.videoThumbnail || '',
            date: h.date || h.createdAt || new Date().toISOString(),
            videos: [],
            sourceProvider: 'highlightly'
        }));
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Highlightly Error:', error.response?.status, error.response?.data);
        } else {
            console.error('Error fetching from Highlightly:', error);
        }
        return [];
    }
};

export const fetchHighlightForMatchHighlightly = async (matchId: string | number): Promise<Video[]> => {
    try {
        const apiKey = Constants.expoConfig?.extra?.HIGHLIGHTLY_KEY || HIGHLIGHTLY_KEY;
        const response = await axios.get(`${HIGHLIGHTLY_BASE_URL}/highlights/${matchId}`, {
            headers: {
                'x-rapidapi-key': apiKey,
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const data = response.data.data || response.data;
        if (!data) return [];

        const videos: Video[] = [];
        if (data.videos && Array.isArray(data.videos)) {
            data.videos.forEach((v: any) => {
                videos.push({
                    title: v.title || 'Highlight',
                    embed: v.embed || v.url || ''
                });
            });
        } else if (data.embedCode || data.embed_code) {
            videos.push({
                title: 'Highlight',
                embed: data.embedCode || data.embed_code
            });
        } else if (data.url) {
            videos.push({
                title: 'Highlight',
                embed: data.url
            });
        }
        return videos;
    } catch (error) {
        console.error('Error fetching highlight from Highlightly:', error);
        return [];
    }
};

export const fetchMatches = async (
    provider: ApiProvider = ACTIVE_PROVIDER,
    leagueName: string = 'England',
    scorebatSlug?: string,
    apiFootballId?: number,
    highlightlyId?: number
): Promise<Match[]> => {
    console.log(`\t\tUSING PROVIDER: ${provider}`);
    const effectiveProvider = provider || ACTIVE_PROVIDER;

    switch (effectiveProvider) {
        case 'highlightly':
            return fetchMatchesFromHighlightly(highlightlyId);
        case 'api-football':
            return fetchMatchesFromApiFootball(apiFootballId);
        case 'scorebat':
        default:
            let results = await fetchMatchesFromScoreBat(scorebatSlug);
            if (!scorebatSlug) {
                results = filterMatchesByLeague(results, leagueName);
            }
            return results;
    }
};

export const filterMatchesByLeague = (matches: Match[], leagueName: string): Match[] => {
    return matches.filter(match =>
        match.competition.toLowerCase().includes(leagueName.toLowerCase())
    );
};

export const parseMatchTitle = (title: string) => {
    const scoreRegex = /^(.*?)\s+(\d+)\s*[-:]\s*(\d+)\s+(.*?)$/;
    const match = title.match(scoreRegex);

    if (match) {
        return {
            home: match[1].trim(),
            scoreHome: match[2],
            scoreAway: match[3],
            away: match[4].trim(),
            hasScore: true
        };
    }

    const looseSplit = title.split(/\s+[-:]\s+|\s+vs\s+/i);
    if (looseSplit.length === 2) {
        return {
            home: looseSplit[0].trim(),
            scoreHome: '',
            scoreAway: '',
            away: looseSplit[1].trim(),
            hasScore: false
        };
    }

    return {
        home: title,
        scoreHome: '',
        scoreAway: '',
        away: '',
        hasScore: false
    };
};

export const getBestVideo = (videos: Video[]): Video | null => {
    if (!videos || videos.length === 0) return null;
    const exactHighlight = videos.find(v => v.title.toLowerCase() === 'highlights');
    if (exactHighlight) return exactHighlight;
    const extendedHighlight = videos.find(v => v.title.toLowerCase() === 'extended highlights');
    if (extendedHighlight) return extendedHighlight;
    const anyHighlight = videos.find(v => v.title.toLowerCase().includes('highlight'));
    if (anyHighlight) return anyHighlight;
    const goalVideo = videos.find(v => v.title.toLowerCase().includes('goal'));
    if (goalVideo) return goalVideo;
    return videos[0];
};

export const getAlternativeSources = (match: Match): AlternativeSource[] => {
    const { home, away } = parseMatchTitle(match.title);
    const query = `${home} vs ${away} full highlights`;
    const d = new Date(match.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateFormatted = `${year}_${month}_${day}`;

    const sources: AlternativeSource[] = [
        {
            name: 'HooFoot (Recommended)',
            url: `https://hoofoot.com/?match=${home.replace(/\s+/g, '_')}_v_${away.replace(/\s+/g, '_')}_${dateFormatted}`,
            type: 'embed'
        },
        {
            name: 'YouTube Highlights',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official')}`,
            type: 'search'
        },
        {
            name: 'ScoreBat Search',
            url: `https://www.scorebat.com/api/video/?q=${encodeURIComponent(home + ' ' + away)}`,
            type: 'search'
        }
    ];

    return sources;
};
