import { describe, it, expect } from "vitest";
import { FAQS, faqById, matchFaq, scoreFaq } from "./faqBot";

describe("scoreFaq", () => {
  const ippt = faqById("ippt");

  it("scores one point per matched keyword", () => {
    // "ippt" + "score" + "run" = 3 keyword hits.
    expect(scoreFaq(ippt, "how is my ippt score for the run")).toBe(3);
  });

  it("matches hyphenated keywords as substrings", () => {
    expect(scoreFaq(ippt, "my push-up form")).toBeGreaterThan(0);
  });

  it("does not match single-word keywords inside larger words", () => {
    // "run" must match the token, not appear inside "running" via substring.
    const score = scoreFaq(ippt, "running errands today");
    expect(score).toBe(0);
  });

  it("returns zero for empty or unrelated text", () => {
    expect(scoreFaq(ippt, "")).toBe(0);
    expect(scoreFaq(ippt, "what is the weather")).toBe(0);
  });
});

describe("matchFaq", () => {
  it("returns the IPPT entry for an IPPT question", () => {
    expect(matchFaq("how does ippt scoring work")?.id).toBe("ippt");
  });

  it("returns the theme entry for a dark mode question", () => {
    expect(matchFaq("can I switch to dark mode")?.id).toBe("theme");
  });

  it("returns the ORD entry for an ORD question", () => {
    expect(matchFaq("when is my ord")?.id).toBe("ord");
  });

  it("returns null when nothing matches", () => {
    expect(matchFaq("tell me a joke about cats")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(matchFaq("")).toBeNull();
    expect(matchFaq(null)).toBeNull();
  });
});

describe("FAQ data integrity", () => {
  it("every FAQ has a unique id", () => {
    const ids = FAQS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every FAQ has a label, an answer, and at least one keyword", () => {
    for (const f of FAQS) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.answer.length).toBeGreaterThan(0);
      expect(f.keywords.length).toBeGreaterThan(0);
    }
  });

  it("faqById finds known ids and returns null otherwise", () => {
    expect(faqById("journal")?.id).toBe("journal");
    expect(faqById("does-not-exist")).toBeNull();
  });
});
