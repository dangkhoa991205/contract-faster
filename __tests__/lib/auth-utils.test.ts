import { getQuotaLimits } from "@/lib/quota";

describe("getQuotaLimits", () => {
  it("returns 3 contracts for FREE plan", () => {
    expect(getQuotaLimits("FREE").contracts).toBe(3);
  });
  it("returns 50 contracts for SOLO plan", () => {
    expect(getQuotaLimits("SOLO").contracts).toBe(50);
  });
  it("returns Infinity for TEAM plan", () => {
    expect(getQuotaLimits("TEAM").contracts).toBe(Infinity);
  });
  it("returns Infinity for ENTERPRISE plan", () => {
    expect(getQuotaLimits("ENTERPRISE").contracts).toBe(Infinity);
  });
  it("returns 20 AI chat messages per day for SOLO", () => {
    expect(getQuotaLimits("SOLO").aiChatsPerDay).toBe(20);
  });
  it("returns Infinity AI chat messages for TEAM", () => {
    expect(getQuotaLimits("TEAM").aiChatsPerDay).toBe(Infinity);
  });
});
