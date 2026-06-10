# Where Got Time

**Where Got Time** is a companion app for National Service (NS) that turns the slog of training into something you actually want to open. Instead of a dry fitness tracker, it wraps your NS journey in a game-like, scrapbook feel:

- **Train** — log workouts, run live training sessions (with on-device webcam form analysis via MediaPipe), and watch your stats climb.
- **Journal** — keep a personal field journal of your NS milestones (enlistment, BMT, field camp, POP, ORD…). Write a memory and the app can **generate a matching illustration with AI**, so each entry looks like a page from an illustrated war diary. Finished journals can be shared as a read-only link.
- **Profile & avatar** — customise a pixel-art soldier avatar (swap tops, bottoms, shoes, accessories) and spend earned XP in the shop.
- **Stay on track** — installable as a PWA with web push reminders, so it lives on your phone's home screen like a real app.

It's built as a React single-page app on top of Firebase (Auth, Firestore, Cloud Storage, Cloud Functions, Hosting, and Cloud Messaging).

> **Status:** active prototype. Most features run against live Firebase services; a few screens (e.g. the shared-journal link) use baked-in demo data for the proof of concept. Calendar and Squad screens exist in the code but are currently hidden from the sidebar.

## Architecture

![Where Got Time architecture diagram](./chickenTaxi_WGTarchitectureDiagram.jpg)

At a high level:

- Web users interact with the **React frontend**, installable as a **PWA**.
- **Firebase Authentication** owns the signed-in session (email/password and Google sign-in).
- **Firestore** stores user data — profiles, journal entries, training stats, avatar state.
- **Cloud Storage** holds journal media and AI-generated memory images.
- **Cloud Functions** run trusted server-side work. The key one today is `generateMemoryImage`, which calls the Pollinations image API using a secret API key that never reaches the browser.
- **Firebase Cloud Messaging + a PWA service worker** deliver reminders and notifications.
- Training **form analysis runs locally** in the browser through MediaPipe using the webcam stream — no video leaves the device.

## Quick Start — run it yourself

You'll need [Node.js](https://nodejs.org/) (v18+) and access to a Firebase project. If you just want to see the UI, you only need steps 1–4 (the frontend). Steps 5–6 are for the AI image feature, which needs Cloud Functions deployed.

### 1. Clone and install

```cmd
git clone <this-repo-url>
cd chickenTaxi\frontend
npm install
```

### 2. Create a Firebase project

If you don't already have one:

1. Go to the [Firebase console](https://console.firebase.google.com/) and create a project.
2. Add a **Web app** to it (the `</>` icon). Firebase will show you a config object — you'll copy those values in the next step.
3. In the console, enable:
   - **Authentication** → Sign-in methods → **Email/Password** and **Google**.
   - **Firestore Database** (start in test mode for development).
   - **Storage**.

### 3. Configure environment variables

The app reads its Firebase config from a `.env` file. Copy the example and fill it in:

```cmd
copy .env.example .env
```

Then open `frontend/.env` and paste the values from your Firebase web app config:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...        # only needed for web push notifications
```

If any required value is missing, the app logs a clear error in the browser console telling you which one. The full list lives in [`frontend/.env.example`](./frontend/.env.example).

### 4. Start the dev server

```cmd
npm run dev
```

Open the URL Vite prints (usually <http://localhost:5173/>). You can now sign up, log in, and explore Training, Journal, and Profile.

> **Note:** the AI "generate a memory image" button in the Journal only works once the Cloud Function is deployed (steps 5–6). Everything else works against your Firebase project right away.

### 5. (Optional) Set up Cloud Functions for AI images

The AI memory image feature is powered by the `generateMemoryImage` Cloud Function in [`functions/`](./functions). It calls the [Pollinations](https://pollinations.ai/) image API server-side so the API key stays off the client.

> Cloud Functions require the Firebase **Blaze (pay-as-you-go)** plan. The function caps its own scaling (`maxInstances: 3`) as a cost guardrail.

Install the [Firebase CLI](https://firebase.google.com/docs/cli) and log in:

```cmd
npm install -g firebase-tools
firebase login
```

Point the repo at your project (edit [`.firebaserc`](./.firebaserc) or run `firebase use --add`), install function deps, and set the Pollinations key as a secret:

```cmd
cd functions
npm install
firebase functions:secrets:set POLLINATIONS_API_KEY
```

### 6. (Optional) Deploy the functions

```cmd
firebase deploy --only functions
```

Once deployed, the **generate image** button in the Journal will call this function and save the result to Cloud Storage.

## Build & Deploy (Hosting)

The app is hosted on **Firebase Hosting**. Build the frontend, then deploy from the repo root:

```cmd
cd frontend
npm run build

cd ..
firebase deploy --only hosting
```

To deploy everything (hosting + functions) at once:

```cmd
firebase deploy
```

Hosting serves `frontend/dist` and rewrites all routes to `index.html` so client-side routing works (see [`firebase.json`](./firebase.json)).

## Codebase map

```txt
frontend/                 the React app — most work lives here
  index.html
  vite.config.js
  .env.example            required Firebase env vars (copy to .env)
  public/
    manifest.webmanifest        PWA manifest
    firebase-messaging-sw.js    FCM service worker
    assets/                     static images (brand, training, journal, avatar)
  src/
    main.jsx              app entry; mounts the router and AuthProvider
    App.jsx               route table (react-router-dom)
    routes.js             route keys -> URL-path mapping
    ui.jsx                shared shell, sidebar, cards, buttons, sprites
    assets.js             static asset manifest
    avatarConfig.js       avatar layer order and slot definitions
    auth/
      firebase.js         single Firebase initialisation (auth, db, storage, functions)
      AuthContext.jsx     app-wide auth state via useAuth()
      ProtectedRoute.jsx  route guard for signed-in-only pages
      notifications.js    FCM web push enable/disable/state helpers
    lib/
      aiMemoryImage.js    client wrapper that calls the generateMemoryImage function
    pages/
      RootPage.jsx        login / sign-up
      TrainingDashboard.jsx, TrainingSessionPage.jsx
      JournalPage.jsx, AIMemoryModal.jsx, SharedBookPage.jsx
      ProfileMain.jsx, ProfileCustomizer.jsx, ShopPage.jsx
      CalendarPage.jsx, SquadPage.jsx   (in code, hidden from sidebar)

functions/                Cloud Functions (Node.js)
  index.js                generateMemoryImage — server-side AI image generation

firebase.json             Hosting + Functions config
.firebaserc               Firebase project alias

backend/                  legacy placeholder (superseded by functions/)
```

## How it fits together

- **Auth** is initialised once in [`src/auth/firebase.js`](./frontend/src/auth/firebase.js) with LOCAL persistence, so a signed-in session survives a browser restart. `AuthProvider` exposes it through `useAuth()`:

  ```js
  const { user, loading, loginWithEmail, signupWithEmail,
          loginWithGoogle, logout } = useAuth();
  ```

  `user` is `null` when signed out, the Firebase User when signed in. Every route except `/login` and the public `/shared/...` link is wrapped in `ProtectedRoute`.

- **AI memory images** flow: the Journal calls `generateAndUploadMemoryImage()` in [`src/lib/aiMemoryImage.js`](./frontend/src/lib/aiMemoryImage.js), which invokes the `generateMemoryImage` callable function. The function builds a prompt, calls Pollinations with the secret key, uploads the PNG to Cloud Storage, and returns a download URL. Art styles (storybook, watercolour, pixel, comic) are chosen in the UI.

- **Notifications & PWA**: the app ships a PWA manifest and an FCM service worker, so it can be installed to the home screen and receive web push. Helpers live in [`src/auth/notifications.js`](./frontend/src/auth/notifications.js); enabling push requires `VITE_FIREBASE_VAPID_KEY`.
