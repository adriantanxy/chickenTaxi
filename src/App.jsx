import { lazy, startTransition, Suspense, useState } from "react";
import TrainingDashboard from "./pages/TrainingDashboard";
import { DEFAULT_ROUTE, ROUTES } from "./routes";

const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const JournalPage = lazy(() => import("./pages/JournalPage"));
const SquadPage = lazy(() => import("./pages/SquadPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const ProfileMain = lazy(() => import("./pages/ProfileMain"));
const ProfileCustomizer = lazy(() => import("./pages/ProfileCustomizer"));

const PROFILE_VIEWS = Object.freeze({
  MAIN: "main",
  CUSTOMIZE: "customize",
});

function LoadingScreen() {
  return (
    <div
      className="grid h-screen place-items-center"
      style={{ background: "#181911", color: "#ddc397", fontFamily: "'VT323', monospace" }}
    >
      <span className="text-[28px]">LOADING...</span>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(DEFAULT_ROUTE);
  const [profileView, setProfileView] = useState(PROFILE_VIEWS.MAIN);

  function handleNavigate(nextPage) {
    startTransition(() => {
      setPage(nextPage);
      if (nextPage === ROUTES.PROFILE) {
        setProfileView(PROFILE_VIEWS.MAIN);
      }
    });
  }

  function openProfileCustomizer() {
    startTransition(() => setProfileView(PROFILE_VIEWS.CUSTOMIZE));
  }

  function closeProfileCustomizer() {
    startTransition(() => setProfileView(PROFILE_VIEWS.MAIN));
  }

  const props = { onNavigate: handleNavigate };

  const pages = {
    [ROUTES.TRAINING]: <TrainingDashboard {...props} />,
    [ROUTES.CALENDAR]: <CalendarPage {...props} />,
    [ROUTES.JOURNAL]: <JournalPage {...props} />,
    [ROUTES.SQUAD]: <SquadPage {...props} />,
    [ROUTES.SHOP]: <ShopPage {...props} />,
    [ROUTES.PROFILE]:
      profileView === PROFILE_VIEWS.CUSTOMIZE ? (
        <ProfileCustomizer {...props} onBack={closeProfileCustomizer} />
      ) : (
        <ProfileMain {...props} onInspect={openProfileCustomizer} />
      ),
  };

  return <Suspense fallback={<LoadingScreen />}>{pages[page] ?? pages[DEFAULT_ROUTE]}</Suspense>;
}
