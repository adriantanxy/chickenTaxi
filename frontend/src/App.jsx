import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import RootPage from "./pages/RootPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import TrainingDashboard from "./pages/TrainingDashboard";
import TrainingSessionPage from "./pages/TrainingSessionPage";
import CalendarPage from "./pages/CalendarPage";
import JournalPage from "./pages/JournalPage";
import SharedBookPage from "./pages/SharedBookPage";
import SquadPage from "./pages/SquadPage";
import ShopPage from "./pages/ShopPage";
import ProfileMain from "./pages/ProfileMain";
import ProfileCustomizer from "./pages/ProfileCustomizer";
import { DEFAULT_PATH, ROUTES, routeToPath } from "./routes";
import { useAppNavigate } from "./useAppNavigate";

function TrainingRoute() {
  const onNavigate = useAppNavigate();
  const navigate = useNavigate();
  const onStartTraining = (mode) =>
    navigate(routeToPath(ROUTES.TRAINING_SESSION, { mode }));
  return <TrainingDashboard onNavigate={onNavigate} onStartTraining={onStartTraining} />;
}

function TrainingSessionRoute() {
  const onNavigate = useAppNavigate();
  const { mode } = useParams();
  return <TrainingSessionPage onNavigate={onNavigate} mode={mode} />;
}

function CalendarRoute() {
  return <CalendarPage onNavigate={useAppNavigate()} />;
}

function JournalRoute() {
  return <JournalPage onNavigate={useAppNavigate()} />;
}

function SquadRoute() {
  return <SquadPage onNavigate={useAppNavigate()} />;
}

function ShopRoute() {
  return <ShopPage onNavigate={useAppNavigate()} />;
}

function ProfileRoute() {
  const onNavigate = useAppNavigate();
  const navigate = useNavigate();
  const onInspect = () => navigate(routeToPath(ROUTES.PROFILE_CUSTOMIZE));
  return <ProfileMain onNavigate={onNavigate} onInspect={onInspect} />;
}

function ProfileCustomizeRoute() {
  const onNavigate = useAppNavigate();
  const navigate = useNavigate();
  const onBack = () => navigate(routeToPath(ROUTES.PROFILE));
  return <ProfileCustomizer onNavigate={onNavigate} onBack={onBack} />;
}

// Wraps a page element in the auth gate. Keeps the route table below readable.
const guard = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      {/* Public: the combined login / sign-up screen. */}
      <Route path={routeToPath(ROUTES.LOGIN)} element={<RootPage />} />

      {/* Public: a shared, read-only journal. Openable by anyone (incognito, no
          login). The hashed id makes the link look realistic; for the POC it's
          decorative (no backend lookup) and the book is the baked-in mock. The
          `?letters=1` query flag controls whether the private letters are shown,
          so the owner's "include letters" choice actually travels in the link. */}
      <Route path="/shared/:shareId" element={<SharedBookPage />} />
      <Route path="/shared" element={<SharedBookPage />} />

      {/* `/` just sends signed-in users into the app (and signed-out users to
          login, via the guard). */}
      <Route
        path={routeToPath(ROUTES.ROOT)}
        element={guard(<Navigate to={routeToPath(ROUTES.TRAINING)} replace />)}
      />

      {/* Protected: everything below requires a signed-in user. */}
      <Route path={routeToPath(ROUTES.TRAINING)} element={guard(<TrainingRoute />)} />
      <Route path={routeToPath(ROUTES.TRAINING_SESSION)} element={guard(<TrainingSessionRoute />)} />
      <Route path={routeToPath(ROUTES.CALENDAR)} element={guard(<CalendarRoute />)} />
      <Route path={routeToPath(ROUTES.JOURNAL)} element={guard(<JournalRoute />)} />
      <Route path={routeToPath(ROUTES.SQUAD)} element={guard(<SquadRoute />)} />
      <Route path={routeToPath(ROUTES.SHOP)} element={guard(<ShopRoute />)} />
      <Route path={routeToPath(ROUTES.PROFILE)} element={guard(<ProfileRoute />)} />
      <Route path={routeToPath(ROUTES.PROFILE_CUSTOMIZE)} element={guard(<ProfileCustomizeRoute />)} />

      <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
    </Routes>
  );
}
