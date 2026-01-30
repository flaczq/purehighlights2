import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Match, fetchMatches, filterMatchesByLeague, parseMatchTitle } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { Play } from 'lucide-react-native';

export default function MatchListScreen() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { isSpoilerFree } = useSettings();
    const leagueName = route.params?.league || 'England';
    const leagueSlug = route.params?.slug;

    const loadMatches = async () => {
        setLoading(true);
        let results: Match[] = [];
        if (leagueSlug) {
            results = await fetchMatches(leagueSlug);
        } else {
            const allMatches = await fetchMatches();
            results = filterMatchesByLeague(allMatches, leagueName);
        }

        // Sort by date descending (newest first)
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setMatches(results);
        setLoading(false);
    };

    useEffect(() => {
        loadMatches();
    }, [leagueName, leagueSlug]);

    const renderItem = ({ item }: { item: Match }) => {
        const { home, away, scoreHome, scoreAway, hasScore } = parseMatchTitle(item.title);

        let displayTitle = "";

        // If it's spoiler free, and we have scores, we show "? : ?"
        // If it's NOT spoiler free, we show "Home Score : Score Away"
        // If no score is parsed (e.g. "vs"), we show that.

        if (isSpoilerFree) {
            displayTitle = away ? `${home} vs ${away}` : home;
        } else {
            // Logic: If we have scores, show them. If not, show "vs" or just hyphen.
            // parseMatchTitle returns hasScore=true if it matched the score pattern.
            if (hasScore) {
                displayTitle = `${home} ${scoreHome} : ${scoreAway} ${away}`;
            } else {
                displayTitle = away ? `${home} - ${away}` : home;
            }
        }

        const shouldBlur = isSpoilerFree;

        // Format date as DD/MM/YYYY
        const d = new Date(item.date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Player', { match: item })}
            >
                <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.thumbnail}
                    blurRadius={shouldBlur ? 50 : 0}
                />
                <View style={styles.playIconContainer}>
                    <Play fill="white" stroke="white" size={24} />
                </View>

                <View style={styles.info}>
                    <View style={styles.teamRow}>
                        <Text style={styles.teamsText}>
                            {displayTitle}
                        </Text>
                    </View>
                    <Text style={styles.date}>{formattedDate} - {item.competition}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={matches}
                renderItem={renderItem}
                keyExtractor={(item) => item.title + item.date}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMatches} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No matches found for {leagueName}</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    thumbnail: {
        width: '100%',
        height: 200,
    },
    playIconContainer: {
        position: 'absolute',
        top: 200 / 2 - 24, // Center vertically on thumbnail
        left: '50%',
        marginLeft: -24,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        padding: 12,
    },
    teamRow: {
        marginBottom: 4,
    },
    teamsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    date: {
        fontSize: 12,
        color: '#666',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#888',
    }
});
