# Where Got Time

Where Got Time is a React prototype for a National Service companion app: training progress, calendar events, journal memories, squad views, profile customisation, and the XP shop.

The repo is split into two parts:

- `frontend/` — the React app (this is where most of the work lives today).
- `backend/` — placeholder for the future Cloud Functions / API layer.

Firebase Authentication, web push notifications (FCM), the PWA shell, and Firebase Hosting are already wired up. The data layer (Firestore, Cloud Storage, Cloud Functions) is still to come — the frontend is built so those services can slot in with minimal changes.

## Architecture

![Where Got Time architecture diagram](./chickenTaxi_WGTarchitectureDiagram.jpg)

At a high level:

- Web users interact with the app through the React frontend, installable as a PWA.
- Training form analysis can be handled locally through MediaPipe using the webcam stream.
- API requests and auth flows pass through an API gateway.
- Singpass handles identity verification, then Firebase Authentication stores the authenticated user state.
- Firebase Cloud Functions coordinate backend work such as data writes, Strava syncs, and notifications.
- Firestore stores user profiles, IPPT scores, leaderboard stats, avatar data, and other app data.
- Cloud Storage stores journal media such as images, audio, and videos.
- Firebase Cloud Messaging plus a PWA service worker supports reminders and notifications.

## Current Frontend Scope

The app currently includes:

- Login / sign-up screen (email + password, and Google sign-in)
- Training dashboard and rewards entry point
- Live training session screen
- Calendar
- Journal
- Squad
- Profile main page
- Avatar customiser
- XP shop, reached from Training/Profile rather than as a separate sidebar section
- Web push notifications and PWA install support

## Run Locally

All commands run from the `frontend/` directory.

```cmd
cd frontend
npm install
```

Firebase config is required before the app will run. Copy the example env file and fill in the values from your Firebase console:

```cmd
copy .env.example .env
```

Fill in the `VITE_FIREBASE_*` values (and `VITE_FIREBASE_VAPID_KEY` for push). See [`frontend/.env.example`](./frontend/.env.example) for the full list. The app logs a clear console error if any are missing.

Then start the dev server:

```cmd
npm run dev
```

Open the local URL printed by Vite, usually:

```txt
http://localhost:5173/
```

## Build & Deploy

The app is hosted on Firebase Hosting. Build the frontend, then deploy from the repo root:

```cmd
cd frontend
npm run build

cd ..
firebase deploy --only hosting
```

Hosting serves `frontend/dist` and rewrites all routes to `index.html` (see [`firebase.json`](./firebase.json)).

## Project Map

```txt
frontend/
  index.html
  vite.config.js
  tailwind.config.js
  postcss.config.js
  .env.example          required Firebase env vars
  public/
    manifest.webmanifest        PWA manifest
    firebase-messaging-sw.js    FCM service worker
    assets/                     static images (brand, training, journal, squad, sidebar)
  src/
    main.jsx             app entry; mounts the router and AuthProvider
    App.jsx              route table (react-router-dom)
    routes.js            route keys and route-key -> URL-path mapping
    useAppNavigate.js    navigate helper used by pages
    ui.jsx               shared shell, sidebar, cards, buttons, sprites
    theme.js             colours, font helper, shared demo user
    assets.js            static asset manifest
    avatarConfig.js      shared avatar layer order and slot definitions
    trainingModes.js     training mode definitions
    styles.css           global styles
    auth/
      firebase.js        single Firebase initialisation
      AuthContext.jsx    app-wide auth state via useAuth()
      ProtectedRoute.jsx route guard for signed-in-only pages
      api.js             apiFetch() — token-attached requests to a future backend
      authErrors.js      maps Firebase auth errors to friendly messages
      notifications.js   FCM web push enable/disable/state helpers
      useDelayedFlag.js  small UI timing hook
    components/
      EnableNotificationsButton.jsx
    pages/
      RootPage.jsx       login / sign-up
      TrainingDashboard.jsx
      TrainingSessionPage.jsx
      CalendarPage.jsx
      JournalPage.jsx
      SquadPage.jsx
      ProfileMain.jsx
      ProfileCustomizer.jsx
      ShopPage.jsx
backend/                 future Cloud Functions / API (placeholder)
firebase.json            Firebase Hosting config
.firebaserc              Firebase project alias
```

## Navigation Model

Routing uses `react-router-dom` with real URLs. The route keys and their URL paths live in [`src/routes.js`](./frontend/src/routes.js); the route table is in [`src/App.jsx`](./frontend/src/App.jsx).

- `/login` is the only public route. Everything else is wrapped in `ProtectedRoute` and requires a signed-in user.
- `/` redirects signed-in users into `/training` (and signed-out users to `/login`, via the guard).
- Sidebar items are defined in [`src/ui.jsx`](./frontend/src/ui.jsx).
- `/shop` is a real route but intentionally not its own sidebar item — it is opened from buttons inside Training/Profile and highlights Training in the sidebar. The same applies to the in-session training screen.

## Authentication

Firebase Authentication owns the session. The SDK is initialised once in [`src/auth/firebase.js`](./frontend/src/auth/firebase.js) with LOCAL persistence, so a signed-in session survives a browser restart.

`AuthProvider` (mounted in `main.jsx`) mirrors `onAuthStateChanged` into React state and exposes it through `useAuth()`:

```js
const { user, loading, loginWithEmail, signupWithEmail,
        loginWithGoogle, logout } = useAuth();
```

`user` is `null` when signed out, the Firebase User when signed in; `loading` is true only during the initial session check. For future authenticated backend calls, use `apiFetch()` from [`src/auth/api.js`](./frontend/src/auth/api.js) — it attaches the Firebase ID token automatically.

## Notifications & PWA

The app ships a PWA manifest ([`public/manifest.webmanifest`](./frontend/public/manifest.webmanifest)) and an FCM service worker ([`public/firebase-messaging-sw.js`](./frontend/public/firebase-messaging-sw.js)), so it can be installed to the Home Screen and receive web push.

Push helpers live in [`src/auth/notifications.js`](./frontend/src/auth/notifications.js): `enableNotifications()`, `disableNotifications()`, `getNotificationState()`, and `onForegroundMessage()`. Enabling requires `VITE_FIREBASE_VAPID_KEY` in `.env`. Tokens are currently logged to the console for test pushes; persisting them to Firestore per user is a TODO.

## Adding A Page

1. Create a file in [`src/pages`](./frontend/src/pages), for example `NewPage.jsx`.
2. Add a route key and its URL path to [`src/routes.js`](./frontend/src/routes.js).
3. Add a `<Route>` for it in [`src/App.jsx`](./frontend/src/App.jsx), wrapping it in `guard(...)` if it should require sign-in.
4. Add it to the sidebar `NAV` in [`src/ui.jsx`](./frontend/src/ui.jsx) only if it should appear there.

## Adding Assets

Put images under [`frontend/public/assets`](./frontend/public/assets), then register them in [`src/assets.js`](./frontend/src/assets.js).

Use:

- `Sprite` for small icons.
- `Frame` or `Card` for 9-slice frames.
- `ASSETS.avatar` plus `avatarConfig.js` for avatar layers.

Dynamic text, stats, dates, graphs, and user data should stay in React/data. Do not bake those into images, because they will eventually come from Firestore or other backend services.
