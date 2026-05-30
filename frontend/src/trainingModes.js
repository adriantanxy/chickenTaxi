import { ASSETS } from "./assets";

export const TRAINING_MODES = Object.freeze([
  {
    key: "formTraining",
    label: "FORM TRAINING",
    subtitle: "Technique and movement quality.",
  },
  {
    key: "pacer",
    label: "PACER",
    subtitle: "Keep up with the beat.",
  },
  {
    key: "emom",
    label: "EMOM",
    subtitle: "Every minute on the minute.",
  },
  {
    key: "toFailure",
    label: "TO FAILURE",
    subtitle: "Push to muscle failure.",
  },
  {
    key: "targetMode",
    label: "TARGET MODE",
    subtitle: "Hit a reps, time, or score target.",
  },
]);

export const DEFAULT_TRAINING_MODE = TRAINING_MODES[0].key;

export function getTrainingMode(modeKey = DEFAULT_TRAINING_MODE) {
  return TRAINING_MODES.find((mode) => mode.key === modeKey) || TRAINING_MODES[0];
}

export function getTrainingSessionCardStyle(modeKey, displayHeight) {
  const sheet = ASSETS.training?.sessionCards;
  const item = sheet?.items?.[modeKey];

  if (!sheet || !item) return {};

  const height = displayHeight || sheet.displayHeight;
  const scale = height / item.h;

  return {
    width: item.w * scale,
    height,
    backgroundImage: `url(${sheet.src})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${-item.x * scale}px ${-item.y * scale}px`,
    backgroundSize: `${sheet.sheetWidth * scale}px ${sheet.sheetHeight * scale}px`,
    imageRendering: "pixelated",
  };
}
