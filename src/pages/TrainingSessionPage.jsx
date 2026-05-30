import { ArrowLeft, Dumbbell, Play } from "lucide-react";
import { AppShell, ActionButton, Card } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";
import { getTrainingMode, getTrainingSessionCardStyle } from "../trainingModes";

export default function TrainingSessionPage({ mode, onNavigate }) {
  const selectedMode = getTrainingMode(mode);

  return (
    <AppShell
      active={ROUTES.TRAINING}
      onNavigate={onNavigate}
      user={user}
      icon={<Dumbbell size={36} />}
      title={selectedMode.label}
      subtitle="SESSION SETUP"
      action={
        <ActionButton icon={<ArrowLeft size={18} />} onClick={() => onNavigate(ROUTES.TRAINING)}>
          BACK
        </ActionButton>
      }
    >
      <div className="grid grid-cols-3 gap-4 p-6">
        <Card title="SELECTED SESSION" className="col-span-2">
          <div className="flex items-center gap-6">
            <div
              aria-label={selectedMode.label}
              role="img"
              className="shrink-0 rounded-lg"
              style={getTrainingSessionCardStyle(selectedMode.key, 300)}
            />
            <div className="min-w-0 flex-1">
              <p style={{ ...pixel, ...D }} className="text-[38px] leading-none">
                {selectedMode.label}
              </p>
              <p style={{ ...pixel, ...M }} className="mt-2 text-[18px]">
                {selectedMode.subtitle}
              </p>
              <div className="mt-5 rounded-lg px-4 py-3" style={{ background: C.cardInner }}>
                <p style={{ ...pixel, ...M }} className="text-[14px]">
                  TRAINING MODE
                </p>
                <p style={{ ...pixel, ...D }} className="text-[24px] leading-none">
                  {selectedMode.key}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="READY">
          <button
            className="wgt-press flex w-full items-center justify-center gap-2 rounded-lg border-2 py-3"
            style={{ borderColor: C.gold + "80", background: C.green, color: C.textGold }}
          >
            <Play size={18} />
            <span style={pixel} className="text-[22px]">
              START
            </span>
          </button>
        </Card>
      </div>
    </AppShell>
  );
}
