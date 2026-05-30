import { Link } from "react-router-dom";
import { ASSETS } from "../assets";
import { ROUTES, routeToPath } from "../routes";
import { C, pixel } from "../theme";

export default function RootPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{
        color: C.textGold,
        backgroundColor: C.bgDark,
        backgroundImage: `
          radial-gradient(90% 70% at 50% 0%, ${C.bgHeader} 0%, transparent 58%),
          repeating-linear-gradient(45deg, ${C.line}14 0px, ${C.line}14 1px, transparent 1px, transparent 8px)`,
      }}
    >
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <img
          src={ASSETS.brand.logo}
          alt="Where Got Time"
          className="mb-5 h-32 w-auto object-contain"
          style={{ imageRendering: "pixelated" }}
        />

        <h1 style={pixel} className="text-[48px] leading-none">
          TEST PAGE
        </h1>
        <p style={{ ...pixel, color: C.textMuted }} className="mt-2 text-[22px] leading-tight">
          This is the test page. Click login to enter.
        </p>

        <Link
          to={routeToPath(ROUTES.TRAINING)}
          className="wgt-press mt-7 rounded-lg border-2 px-8 py-2.5"
          style={{
            ...pixel,
            borderColor: `${C.gold}99`,
            background: C.green,
            color: C.textGold,
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          LOGIN
        </Link>
      </section>
    </main>
  );
}
