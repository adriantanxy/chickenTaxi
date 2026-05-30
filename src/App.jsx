import { startTransition, useState } from "react";
import TrainingDashboard from "./pages/TrainingDashboard";
import TrainingSessionPage from "./pages/TrainingSessionPage";
import CalendarPage from "./pages/CalendarPage";
import JournalPage from "./pages/JournalPage";
import SquadPage from "./pages/SquadPage";
import ShopPage from "./pages/ShopPage";
import ProfileMain from "./pages/ProfileMain";
import ProfileCustomizer from "./pages/ProfileCustomizer";
import { DEFAULT_ROUTE, ROUTES } from "./routes";
import { DEFAULT_TRAINING_MODE } from "./trainingModes";

const PROFILE_VIEWS = Object.freeze({
  MAIN: "main",
  CUSTOMIZE: "customize",
});

export default function App() {
  const [page, setPage] = useState(DEFAULT_ROUTE);
  const [profileView, setProfileView] = useState(PROFILE_VIEWS.MAIN);
  const [trainingMode, setTrainingMode] = useState(DEFAULT_TRAINING_MODE);

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

  function openTrainingSession(mode) {
    startTransition(() => {
      setTrainingMode(mode);
      setPage(ROUTES.TRAINING_SESSION);
    });
  }

  const props = { onNavigate: handleNavigate };

  const pages = {
    [ROUTES.TRAINING]: <TrainingDashboard {...props} onStartTraining={openTrainingSession} />,
    [ROUTES.TRAINING_SESSION]: <TrainingSessionPage {...props} mode={trainingMode} />,
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

  return pages[page] ?? pages[DEFAULT_ROUTE];
}
