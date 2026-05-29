# Where Got Time

Where Got Time is a React prototype for a National Service companion app. The current repo focuses on the frontend experience: training progress, calendar events, journal memories, squad views, profile customisation, and the XP shop.

The broader product architecture is designed around Firebase, API integrations, local exercise form analysis, and PWA notifications. This frontend is the user-facing layer that those services will eventually feed.

## Architecture

![Where Got Time architecture diagram](./chickenTaxi_WGTarchitectureDiagram.jpg)

At a high level:

- Web users interact with the app through the React frontend.
- Training form analysis can be handled locally through MediaPipe using the webcam stream.
- API requests and auth flows pass through an API gateway.
- Singpass handles identity verification, then Firebase Authentication stores the authenticated user state.
- Firebase Cloud Functions coordinate backend work such as data writes, Strava syncs, and notifications.
- Firestore stores user profiles, IPPT scores, leaderboard stats, avatar data, and other app data.
- Cloud Storage stores journal media such as images, audio, and videos.
- Firebase Cloud Messaging plus a PWA service worker supports reminders and notifications.

## Current Frontend Scope

The app currently includes:

- Training dashboard and rewards entry point
- Calendar
- Journal
- Squad
- Profile main page
- Avatar customiser
- XP shop, counted under Training rather than as a separate sidebar section

## Run Locally

Use Command Prompt from the project root:

```cmd
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```txt
http://localhost:5173/
```

## Project Map

```txt
src/
  App.jsx              route state and lazy-loaded page loading
  routes.js            route names used by App, Sidebar, and page actions
  ui.jsx               shared shell, sidebar, cards, buttons, sprites
  theme.js             colours, font helper, shared demo user
  assets.js            static asset manifest
  avatarConfig.js      shared avatar layer order and slot definitions
  pages/
    TrainingDashboard.jsx
    CalendarPage.jsx
    JournalPage.jsx
    SquadPage.jsx
    ProfileMain.jsx
    ProfileCustomizer.jsx
    ShopPage.jsx
public/
  assets/
    brand/
      logo_cleaned.png
```

## Navigation Model

Sidebar pages are defined in `src/ui.jsx`.

Top-level route names live in `src/routes.js`.

`ShopPage` is still a route, but it is intentionally not shown as its own sidebar item. It is opened from buttons inside Training/Profile and highlights Training in the sidebar.

## Adding A Page

1. Create a file in `src/pages`, for example `NewPage.jsx`.
2. Add a route name to `src/routes.js`.
3. Import and render the page in `src/App.jsx`.
4. Add it to the `NAV` array in `src/ui.jsx` only if it should appear in the sidebar.

## Adding Assets

Put images under `public/assets`, then register them in `src/assets.js`.

Use:

- `Sprite` for small icons.
- `Frame` or `Card` for 9-slice frames.
- `ASSETS.avatar` plus `avatarConfig.js` for avatar layers.

Dynamic text, stats, dates, graphs, and user data should stay in React/data. Do not bake those into images, because they will eventually come from Firestore or other backend services.
