import axios from 'axios';
import Constants from 'expo-constants';
import { COMMON_API_TOKEN, API_TOKEN } from '@env';

export interface Video {
    title: string;
    embed: string;
}

export interface Match {
    title: string;
    competition: string;
    matchviewUrl: string;
    thumbnail: string;
    date: string;
    videos: Video[];
}

export interface AlternativeSource {
    name: string;
    url: string;
    type: 'direct' | 'search' | 'embed';
}

// Using a public access token from ScoreBat documentation examples or requiring user input.
// Using a common free token found in public docs: COMMON_API_TOKEN
// Or simpler: just the endpoint often requires a token.
const API_BASE_URL = 'https://www.scorebat.com/video-api/v3/';

export const fetchMatches = async (competitionSlug?: string): Promise<Match[]> => {
    try {
        const apiToken = Constants.expoConfig?.extra?.API_TOKEN || API_TOKEN;
        let url = `${API_BASE_URL}feed/?token=${apiToken}`;
        if (competitionSlug) {
            url = `${API_BASE_URL}competition/${competitionSlug}/?token=${apiToken}`;
        }

        const response = await axios.get(url);
        return response.data.response;
    } catch (error) {
        console.error('Error fetching matches:', error);
        return [];
    }
};

export const filterMatchesByLeague = (matches: Match[], leagueName: string): Match[] => {
    // ScoreBat returns competition names like "ENGLAND: Premier League"
    // We want to filter loosely.
    return matches.filter(match =>
        match.competition.toLowerCase().includes(leagueName.toLowerCase())
    );
};

export const parseMatchTitle = (title: string) => {
    // Regex to match "Team A score - score Team B" or "Team A score : score Team B"
    // Also handling cases where score might be single digits or double digits
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

    // Fallback: splitting by " - " or " : " or " vs " if no clear numbers found
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

    // 1. Look for exact "Highlights"
    const exactHighlight = videos.find(v => v.title.toLowerCase() === 'highlights');
    if (exactHighlight) return exactHighlight;

    // 2. Look for "Extended Highlights"
    const extendedHighlight = videos.find(v => v.title.toLowerCase() === 'extended highlights');
    if (extendedHighlight) return extendedHighlight;

    // 3. Look for any title containing "highlights"
    const anyHighlight = videos.find(v => v.title.toLowerCase().includes('highlight'));
    if (anyHighlight) return anyHighlight;

    // 4. Look for "Goal" or "Goals"
    const goalVideo = videos.find(v => v.title.toLowerCase().includes('goal'));
    if (goalVideo) return goalVideo;

    // 5. Fallback to the first available video
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
    const dateDash = `${year}-${month}-${day}`;

    const sources: AlternativeSource[] = [
        {
            name: 'HooFoot (Recommended)',
            url: `https://hoofoot.com/?match=${home.replace(/\s+/g, '_')}_v_${away.replace(/\s+/g, '_')}_${dateFormatted}`,
            type: 'embed' // Treat as embed so we try to extract
        },
        {
            name: 'YouTube Highlights',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official')}`,
            type: 'search'
        }
    ];

    return sources;
};
