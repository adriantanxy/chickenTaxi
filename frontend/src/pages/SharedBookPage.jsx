/**
 * SharedBookPage.jsx — the PUBLIC, read-only view of a shared journal.
 *
 * POC: a static share. The link (`/shared/<hash>`) is openable by anyone, in a
 * fresh/incognito session with no login, because the book renders from the mock
 * content baked into the deployed app — no Firestore, no auth, no data passing.
 * The hashed id is decorative for now (no backend to look it up); the meaningful
 * bit is the `?letters=1` query flag, which the owner sets when sharing and which
 * decides whether the private letters-to-yourself are visible to the viewer.
 *
 * When real per-user data + a backend exist, this page swaps to loading a
 * snapshot by `shareId` instead of the baked-in mock.
 */
import React from "react";
import { useLocation } from "react-router-dom";
import { JournalFlipbook } from "./JournalPage";

export default function SharedBookPage() {
  const { search } = useLocation();
  // `?letters=1` → the owner chose to include the private letters in this share.
  const shareLetters = new URLSearchParams(search).get("letters") === "1";

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <JournalFlipbook shared shareLetters={shareLetters} onClose={function () {}} />
    </div>
  );
}
