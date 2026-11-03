import { describe, expect, it } from "vitest";
import { isAxisInviteOriginAllowed } from "../../supabase/functions/_shared/axisInviteOrigin";

describe("AXIS invite origins", () => {
  it("accepts this project's editor preview", () => {
    const origin = "https://627def1f-fd7a-43f0-b494-ed91ad01bed2.lovableproject.com";
    expect(isAxisInviteOriginAllowed(origin, origin)).toBe(true);
  });
  it("accepts the published site", () => {
    const origin = "https://axisbensaude.lovable.app";
    expect(isAxisInviteOriginAllowed(origin, origin)).toBe(true);
  });
  it("rejects an unrelated project", () => {
    const origin = "https://other-project.lovableproject.com";
    expect(isAxisInviteOriginAllowed(origin, origin)).toBe(false);
  });
  it("rejects a mismatched requesting origin", () => {
    expect(isAxisInviteOriginAllowed("https://axisbensaude.lovable.app", "https://evil.example")).toBe(false);
  });
  it("rejects hosts impersonating the allowed origin", () => {
    const origin = "https://axisbensaude.lovable.app.evil.example";
    expect(isAxisInviteOriginAllowed(origin, origin)).toBe(false);
  });
});