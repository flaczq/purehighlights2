import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { X, Search, Youtube, Link as LinkIcon, AlertCircle, Play } from 'lucide-react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Match, parseMatchTitle, getBestVideo, getAlternativeSources, AlternativeSource } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Constants from 'expo-constants';
import { AD_INTERSTITIAL } from '@env';

export default function VideoPlayerScreen() {
    const isDev = Constants.expoConfig?.extra?.APP_VARIANT !== 'production';
    const route = useRoute<any>();
    const navigation = useNavigation();
    const match: Match = route.params?.match;
    const { isSpoilerFree } = useSettings();

    // AdMob Logic
    const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);
    const [adLoaded, setAdLoaded] = useState(false);
    const startTime = useRef(Date.now());

    useEffect(() => {
        const ad = InterstitialAd.createForAdRequest(__DEV__ || isDev ? TestIds.INTERSTITIAL : AD_INTERSTITIAL, {
            requestNonPersonalizedAdsOnly: true,
        });

        const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
            setAdLoaded(true);
        });

        const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
            navigation.goBack();
        });

        ad.load();
        setInterstitial(ad);

        return () => {
            unsubscribeLoaded();
            unsubscribeClosed();
        };
    }, [navigation]);

    const handleBack = useCallback(() => {
        const duration = Date.now() - startTime.current;
        if (duration > 15000 && adLoaded && interstitial) {
            interstitial.show();
        } else {
            navigation.goBack();
        }
    }, [adLoaded, interstitial, navigation]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });
        return () => backHandler.remove();
    }, [handleBack]);

    if (!match) return null;

    const { home, away, scoreHome, scoreAway, hasScore } = parseMatchTitle(match.title);

    let displayTitle = "";
    if (isSpoilerFree) {
        displayTitle = away ? `${home}   ? : ?   ${away}` : home;
    } else {
        displayTitle = away ? `${home}   ${hasScore ? `${scoreHome} : ${scoreAway}` : 'vs'}   ${away}` : match.title;
    }

    const [selectedSource, setSelectedSource] = React.useState<AlternativeSource | { name: string, url: string, type: string } | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [playableUrl, setPlayableUrl] = React.useState<string | null>(null);

    // Cache for resolved direct URLs: { [originalUrl]: resolvedUrl }
    const [resolvedUrls, setResolvedUrls] = React.useState<Record<string, string>>({});

    const bestVideo = getBestVideo(match.videos);
    const altSources = getAlternativeSources(match);

    // Background Scraper to find direct video links
    const resolveDirectUrl = async (sourceUrl: string) => {
        try {
            // Check cache first
            if (resolvedUrls[sourceUrl]) return resolvedUrls[sourceUrl];

            // Only attempt to scrape specific sites that are extractable
            if (!sourceUrl.includes('hoofoot.com')) return null;

            console.log('Attempting to scrape:', sourceUrl);
            const response = await fetch(sourceUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const html = await response.text();

            // Specific regex for HooFoot/SpotlightMoment
            const spotlightMatch = html.match(/src=["'](https:\/\/[^"']*spotlightmoment\.com\/embed\/[^"']+)["']/i);
            if (spotlightMatch && spotlightMatch[1]) {
                console.log('Found direct spotlight link:', spotlightMatch[1]);
                return spotlightMatch[1];
            }

            // Generic iframe regex fallback
            const patterns = [
                /<iframe[^>]*src=["'](https:\/\/www\.youtube\.com\/embed\/[^"']+)["'][^>]*>/i,
                /<iframe[^>]*src=["'](https:\/\/streamable\.com\/e\/[^"']+)["'][^>]*>/i,
                /<iframe[^>]*src=["'](https:\/\/ok\.ru\/videoembed\/[^"']+)["'][^>]*>/i,
            ];

            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    console.log('Found generic direct link:', match[1]);
                    return match[1];
                }
            }
            return null;
        } catch (e) {
            console.log('Scrape failed (likely 403 or network):', e);
            return null;
        }
    };

    // On mount, try to resolve URLs for highlighting sources
    React.useEffect(() => {
        const resolveAll = async () => {
            const newResolved: Record<string, string> = {};
            for (const source of altSources) {
                if (source.type === 'embed' && source.name.includes('HooFoot')) {
                    const direct = await resolveDirectUrl(source.url);
                    if (direct) {
                        newResolved[source.url] = direct;
                    }
                }
            }
            if (Object.keys(newResolved).length > 0) {
                setResolvedUrls((prev: Record<string, string>) => ({ ...prev, ...newResolved }));
            }
        };
        resolveAll();
    }, [match]); // Run once per match

    const handleSourceSelect = async (source: any) => {
        setSelectedSource(source);
        setIsLoading(true);
        setPlayableUrl(null);

        if (source.name === 'Standard' && source.type === 'embed') {
            setIsLoading(false);
        } else {
            // Check if we have a pre-resolved URL for this source
            const preResolved = resolvedUrls[source.url];
            if (preResolved) {
                console.log('Using pre-resolved URL:', preResolved);
                setPlayableUrl(preResolved);
                setIsLoading(false); // It's a direct link, assume it loads faster
            } else {
                // Fallback to the original URL (WebView injection will try to fix it)
                setPlayableUrl(source.url);
                setIsLoading(true);
            }
        }
    };

    React.useEffect(() => {
        // Initially use ScoreBat if available
        if (bestVideo) {
            const source = {
                name: 'Standard',
                url: bestVideo.embed,
                type: 'embed'
            };
            setSelectedSource(source);
        } else {
            const firstAlt = altSources[0];
            handleSourceSelect(firstAlt);
        }
    }, [match]);

    const getHtmlForEmbed = (embed: string) => `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html { margin: 0; padding: 0; background-color: black; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; }
              .video-container { width: 100%; height: 100%; }
              iframe { width: 100% !important; height: 100% !important; border: none; }
            </style>
          </head>
          <body>
            <div class="video-container">
              ${embed}
            </div>
          </body>
        </html>
    `;

    // SMART INJECTED JS (Fallback):
    // 1. Checks if we are on a "wrapper" site (like HooFoot).
    // 2. Finds the actual video iframe.
    // 3. Redirects the WebView to that iframe.
    // 4. If we are ON the video player (iframe source), it cleans up the UI to fullscreen.
    const injectedJS = `
        (function() {
            // Function to hide ads and clutter
            const cleanUI = () => {
                const style = document.createElement('style');
                style.innerHTML = \`
                    header, footer, .sidebar, .ads, .ad-unit, #header, #footer, 
                    .navigation, .related-posts, .cookie-consent, .consent-overlay,
                    .social-share, .comments, .post-meta, .branding, .menu,
                    a[href*="bet"], div[id*="ad"] {
                        display: none !important;
                    }
                    body, html {
                        background-color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                    }
                    // Force common players to fill screen
                    #player, .player, video, iframe {
                        width: 100vw !important;
                        height: 100vh !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        z-index: 9999 !important;
                        object-fit: cover !important;
                    }
                \`;
                document.head.appendChild(style);
            };

            // Main logic loop
            setInterval(() => {
                const currentUrl = window.location.href;
                
                // Known "Direct Player" domains - if we are here, just clean UI
                if (currentUrl.includes('spotlightmoment.com') || 
                    currentUrl.includes('ok.ru') || 
                    currentUrl.includes('streamable.com') || 
                    currentUrl.includes('youtube.com/embed')) {
                    
                    cleanUI();
                    
                    // Special case for some players that need a click to unmute or play
                    // const video = document.querySelector('video');
                    // if(video && video.paused) video.play();
                    
                    return;
                }

                // If we are on HooFoot or generic sites, look for the frame
                const frame = document.querySelector('iframe[src*="spotlightmoment"]');
                const genericFrame = document.querySelector('iframe[src*="ok.ru"], iframe[src*="streamable"], iframe[src*="mp4"], iframe[src*="m3u8"]');
                
                // Priority to specific players users like (like specifically requested spotlightmoment)
                if (frame && frame.src && !currentUrl.includes(frame.src)) {
                    window.location.replace(frame.src);
                } 
                else if (genericFrame && genericFrame.src && !currentUrl.includes(genericFrame.src)) {
                     window.location.replace(genericFrame.src);
                }
                else {
                    // Fallback: Just try to clean up the current page if we can't find a better iframe
                    cleanUI();
                }

            }, 1000);
        })();
        true;
    `;

    if (!selectedSource) return null;

    // Determine the source for the WebView
    let webViewSource: any = null;
    let isStandard = selectedSource.name === 'Standard' && selectedSource.type === 'embed';

    if (isStandard) {
        webViewSource = { html: getHtmlForEmbed(selectedSource.url) };
    } else if (playableUrl) {
        webViewSource = { uri: playableUrl };
    }


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
                    <X color="white" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
            </View>

            <View style={styles.videoWrapper}>
                {webViewSource ? (
                    <WebView
                        key={playableUrl || selectedSource.url}
                        originWhitelist={['*']}
                        source={webViewSource}
                        style={styles.webview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowsFullscreenVideo={true}
                        mediaPlaybackRequiresUserAction={false}
                        // Only inject JS if it's NOT the standard cleaned source and NOT a direct extracted iframe which usually handles itself
                        injectedJavaScript={!isStandard && !playableUrl?.includes('youtube') ? injectedJS : ''}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                    />
                ) : (
                    <View style={styles.loader}>
                        <Text style={{ color: 'white' }}>Initializing...</Text>
                    </View>
                )}

                {isLoading && (
                    <View style={styles.loader}>
                        <Text style={{ color: 'white', marginBottom: 10 }}>Loading Stream...</Text>
                        <Text style={{ color: '#888', fontSize: 10 }}>Converting website to video player...</Text>
                    </View>
                )}
            </View>

            <View style={styles.details}>
                <Text style={styles.sourceLabel}>Highlight Sources for {home} vs {away}:</Text>

                <View style={styles.sourcesScroll}>
                    {/* Primary Source (Standard/ScoreBat) - Always first */}
                    <TouchableOpacity
                        style={[styles.sourceItem, selectedSource.name === 'Standard' && styles.sourceItemActive]}
                        onPress={() => handleSourceSelect({ name: 'Standard', url: bestVideo?.embed || '', type: 'embed' })}
                    >
                        <Play color={selectedSource.name === 'Standard' ? "white" : "#888"} size={16} />
                        <Text style={[styles.sourceText, selectedSource.name === 'Standard' && styles.sourceTextActive]}>Primary (Fast)</Text>
                    </TouchableOpacity>

                    {/* Secondary Sources (HooFoot, etc) */}
                    {altSources.filter(s => s.name !== 'Reddit Search').map((src, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[
                                styles.sourceItem,
                                selectedSource.name === src.name && styles.sourceItemActive,
                                resolvedUrls[src.url] ? { borderColor: '#4ade80' } : {} // Green border if pre-resolved
                            ]}
                            onPress={() => handleSourceSelect(src)}
                        >
                            <Search color={selectedSource.name === src.name ? "white" : "#888"} size={16} />
                            <Text style={[styles.sourceText, selectedSource.name === src.name && styles.sourceTextActive]}>{src.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {selectedSource.type === 'search' && (
                    <View style={styles.hintBox}>
                        <AlertCircle color="#aaa" size={14} />
                        <Text style={styles.hintText}>This will search the web. You might need to click the first video.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: '#1a1a1a',
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 15,
        flex: 1,
    },
    closeButton: {
        padding: 5,
    },
    videoWrapper: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: 'black',
        position: 'relative',
    },
    webview: {
        flex: 1,
        backgroundColor: 'black',
    },
    loader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    details: {
        flex: 1,
        padding: 20,
    },
    sourceLabel: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 12,
        letterSpacing: 1,
    },
    sourcesScroll: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    sourceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#262626',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    sourceItemActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#60a5fa',
    },
    sourceText: {
        color: '#ccc',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 8,
    },
    sourceTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    hintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        backgroundColor: '#1e1e1e',
        padding: 12,
        borderRadius: 8,
    },
    hintText: {
        color: '#888',
        fontSize: 12,
        marginLeft: 8,
    }
});
