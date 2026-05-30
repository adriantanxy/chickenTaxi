import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import RootPage from "./pages/RootPage";
import TrainingDashboard from "./pages/TrainingDashboard";
import TrainingSessionPage from "./pages/TrainingSessionPage";
import CalendarPage from "./pages/CalendarPage";
import JournalPage from "./pages/JournalPage";
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

export default function App() {
  return (
    <Routes>
      <Route path={routeToPath(ROUTES.ROOT)} element={<RootPage />} />
      <Route path={routeToPath(ROUTES.TRAINING)} element={<TrainingRoute />} />
      <Route path={routeToPath(ROUTES.TRAINING_SESSION)} element={<TrainingSessionRoute />} />
      <Route path={routeToPath(ROUTES.CALENDAR)} element={<CalendarRoute />} />
      <Route path={routeToPath(ROUTES.JOURNAL)} element={<JournalRoute />} />
      <Route path={routeToPath(ROUTES.SQUAD)} element={<SquadRoute />} />
      <Route path={routeToPath(ROUTES.SHOP)} element={<ShopRoute />} />
      <Route path={routeToPath(ROUTES.PROFILE)} element={<ProfileRoute />} />
      <Route path={routeToPath(ROUTES.PROFILE_CUSTOMIZE)} element={<ProfileCustomizeRoute />} />
      <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
    </Routes>
  );
}
