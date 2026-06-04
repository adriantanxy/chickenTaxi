import { useEffect, useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import { AppShell, ActionButton, Card } from "../ui";
import { ASSETS } from "../assets";
import { AVATAR_LAYER_ORDER, AVATAR_SLOTS_LEFT, AVATAR_SLOTS_RIGHT } from "../avatarConfig";
import AVATAR_MANIFEST from "../avatarManifest.json";
import { ROUTES } from "../routes";
import { C, pixel, USER as user } from "../theme";

function Slot({ s, active, onClick, previewSrc }) {
  return (
    <button onClick={onClick} className="wgt-press w-full">
      <p style={pixel} className="mb-1 text-[14px]">
        <span style={{ color: C.textGold }}>{s.label}</span>
      </p>
      <div
        className="flex h-16 items-center justify-center rounded-lg"
        style={{
          background: "#23241a",
          outline: active ? `2px solid ${C.gold}` : `1px solid ${C.line}66`,
        }}
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={s.label}
            className="h-12 w-12 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <span className="text-3xl">{s.glyph}</span>
        )}
      </div>
    </button>
  );
}

export default function ProfileCustomizer({ onNavigate, onBack, equipped = {}, setEquipped = () => {} }) {
  const [slot, setSlot] = useState("hat");
  const [loadout, setLoadout] = useState(equipped.loadout ?? "loadout1");
  const [rotationIndex, setRotationIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const initial = {};
    AVATAR_LAYER_ORDER.forEach((k) => {
      initial[k] = equipped[k] || null;
    });
    return initial;
  });

  const loadoutData = ASSETS.avatar.loadouts?.[loadout] ?? {};
  const loadoutComponents = loadoutData.components ?? {};
  const rotationFrames = loadoutData.rotations ?? ASSETS.avatar.rotations ?? [];
  const hasRotationFrames = rotationFrames.length > 0;

  const resolveAvatarLayerSrc = (layerKey) => {
    // prefer user-selected option for immediate preview
    if (selectedOptions[layerKey]) return selectedOptions[layerKey];
    if (layerKey === "body") return ASSETS.avatar.base;
    const configuredValue = equipped[layerKey];
    if (typeof configuredValue === "string") {
      if (configuredValue.startsWith("/")) return configuredValue;
      if (ASSETS.avatar[configuredValue]) return ASSETS.avatar[configuredValue];
    }
    return configuredValue || loadoutComponents[layerKey] || null;
  };

  useEffect(() => {
    if (!isRotating || !hasRotationFrames) return;

    const interval = window.setInterval(() => {
      setRotationIndex((current) => (current + 1) % rotationFrames.length);
    }, 300);

    return () => window.clearInterval(interval);
  }, [isRotating, hasRotationFrames, rotationFrames.length]);

  return (
    <AppShell
      active={ROUTES.PROFILE}
      onNavigate={onNavigate}
      user={user}
      icon={<User size={36} />}
      title="PROFILE"
      subtitle="CUSTOMISE YOUR AVATAR LOADOUT."
      action={<ActionButton icon={<ArrowLeft size={18} />} onClick={onBack}>BACK TO PROFILE</ActionButton>}
    >
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 p-3 sm:p-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card frame="card">
            <div className="grid grid-cols-1 items-center gap-4 rounded-lg p-4 md:grid-cols-[1fr_auto_1fr]" style={{ background: "#1b1c14" }}>
              <div className="grid grid-cols-2 gap-3 md:block md:space-y-3">
                {AVATAR_SLOTS_LEFT.map((s) => (
                  <Slot
                    key={s.key}
                    s={s}
                    previewSrc={loadoutComponents[s.key]}
                    active={slot === s.key}
                    onClick={() => setSlot(s.key)}
                  />
                ))}
              </div>

              <div className="relative mx-auto" style={{ width: 200, height: 280 }}>
                {hasRotationFrames && isRotating ? (
                  <img
                    src={rotationFrames[rotationIndex]}
                    alt={`avatar rotation ${rotationIndex}`}
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : ASSETS.avatar.base ? (
                  AVATAR_LAYER_ORDER.map((layerKey) => {
                    const src = resolveAvatarLayerSrc(layerKey);
                    if (!src) return null;

                    return (
                      <img
                        key={layerKey}
                        src={src}
                        alt={layerKey}
                        className="absolute inset-0 h-full w-full object-contain"
                        style={{ zIndex: AVATAR_LAYER_ORDER.indexOf(layerKey), imageRendering: "pixelated" }}
                      />
                    );
                  })
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg" style={{ background: C.green }}>
                    <span className="text-8xl">🧑‍✈️</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 md:block md:space-y-3">
                {AVATAR_SLOTS_RIGHT.map((s) => (
                  <Slot
                    key={s.key}
                    s={s}
                    previewSrc={selectedOptions[s.key] || loadoutComponents[s.key]}
                    active={slot === s.key}
                    onClick={() => setSlot(s.key)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              <span style={pixel} className="text-[22px]">
                <span style={{ color: C.textGold }}>◀ LOOK 1 ▶</span>
              </span>
              <button
                className="wgt-press rounded-lg px-4 py-1.5"
                style={{ background: C.greenLit }}
                onClick={() => onBack && onBack()}
              >
                <span style={pixel} className="text-[18px]">
                  <span style={{ color: C.textGold}}>CANCEL</span>
                </span>
              </button>
              <button
                className="wgt-press rounded-lg px-4 py-1.5"
                style={{ background: C.green }}
                onClick={() => {
                  if (!loadoutComponents || Object.keys(loadoutComponents).length === 0) return;
                  // persist the selected options (fallback to loadout components)
                  const toSave = {};
                  AVATAR_LAYER_ORDER.forEach((k) => {
                    toSave[k] = selectedOptions[k] || loadoutComponents[k] || null;
                  });
                  setEquipped((prev) => ({ ...prev, loadout, ...toSave }));
                }}
              >
                <span style={pixel} className="text-[18px]">
                  <span style={{ color: C.textGold }}>SAVE LOOK</span>
                </span>
              </button>
            </div>
          </Card>
        </div>
        <Card>
          <p style={pixel} className="text-[26px] leading-snug">
            <span style={{ color: C.textDark }}>
              {user.name.split(" ")[1]} LIM, start customising your avatar by selecting what you want to change.
            </span>
          </p>
          <p style={pixel} className="mt-4 text-[16px]">
            <span style={{ color: "#6b5c3e" }}>Editing slot: {slot}</span>
          </p>
          <div className="mt-4">
            <p style={pixel} className="text-[16px] mb-2">
              <span style={{ color: C.textDark }}>Options</span>
            </p>
            <div className="grid grid-cols-4 gap-3">
              {(AVATAR_MANIFEST[slot] || []).map((opt) => {
                const active = selectedOptions[slot] === opt || (!selectedOptions[slot] && loadoutComponents[slot] === opt);
                return (
                  <button
                    key={opt}
                    onClick={() => setSelectedOptions((prev) => ({ ...prev, [slot]: opt }))}
                    className="wgt-press rounded-md p-1"
                    style={{ outline: active ? `2px solid ${C.gold}` : `1px solid ${C.line}66`, background: '#21221a' }}
                  >
                    <img src={opt} alt={opt} className="h-20 w-20 object-contain" style={{ imageRendering: 'pixelated' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
