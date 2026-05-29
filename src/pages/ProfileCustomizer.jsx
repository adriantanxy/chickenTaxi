import { useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import { AppShell, ActionButton, Card } from "../ui";
import { ASSETS } from "../assets";
import { AVATAR_LAYER_ORDER, AVATAR_SLOTS_LEFT, AVATAR_SLOTS_RIGHT } from "../avatarConfig";
import { ROUTES } from "../routes";
import { C, pixel, USER as user } from "../theme";

function Slot({ s, active, onClick }) {
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
        <span className="text-3xl">{s.glyph}</span>
      </div>
    </button>
  );
}

export default function ProfileCustomizer({ onNavigate, onBack }) {
  const [equipped] = useState({});
  const [slot, setSlot] = useState("headwear");

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
      <div className="grid grid-cols-3 gap-4 p-6">
        <div className="col-span-2">
          <Card frame="card">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg p-4" style={{ background: "#1b1c14" }}>
              <div className="space-y-3">
                {AVATAR_SLOTS_LEFT.map((s) => (
                  <Slot key={s.key} s={s} active={slot === s.key} onClick={() => setSlot(s.key)} />
                ))}
              </div>

              <div className="relative mx-auto" style={{ width: 200, height: 280 }}>
                {ASSETS.avatar.base ? (
                  AVATAR_LAYER_ORDER.map((layerKey) => {
                    const assetName = layerKey === "body" ? "base" : equipped[layerKey];
                    if (!assetName || !ASSETS.avatar[assetName]) return null;

                    return (
                      <img
                        key={layerKey}
                        src={ASSETS.avatar[assetName]}
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

              <div className="space-y-3">
                {AVATAR_SLOTS_RIGHT.map((s) => (
                  <Slot key={s.key} s={s} active={slot === s.key} onClick={() => setSlot(s.key)} />
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-4">
              <span style={pixel} className="text-[22px]">
                <span style={{ color: C.textGold }}>◀ LOADOUT 1 ▶</span>
              </span>
              <button className="wgt-press rounded-lg px-4 py-1.5" style={{ background: C.green }}>
                <span style={pixel} className="text-[18px]">
                  <span style={{ color: C.textGold }}>SAVE LOADOUT</span>
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
        </Card>
      </div>
    </AppShell>
  );
}
