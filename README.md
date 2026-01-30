# Pure Highlights 2.0

A React Native football highlights app using the ScoreBat API.

## Setup Instructions

Since the automatic initialization failed due to missing Node.js environment in the agent's context, please follow these steps to run the app:

1.  **Install Dependencies:**
    Open a terminal in this directory (`d:\Programming\AI\Antigravity\PureHighlights2.0`) and run:
    ```bash
    npm install
    ```

2.  **Start the Server:**
    ```bash
    npx expo start
    ```
    - Press `a` to run on Android Emulator.
    - Press `w` to run in Web Browser.

## Features
- **Leagues:** Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League.
- **Spoiler Free Mode:** Toggle on the home screen to hide scores in match titles.
- **Video Player:** Watch highlights directly in the app.

## Project Structure
- `src/screens`: UI Screens (Home, MatchList, VideoPlayer).
- `src/services`: API handling.
- `src/context`: State management (Spoiler Toggle).
- `src/navigation`: Navigation setup.
