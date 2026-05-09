import { GET, POST } from "@/app/api/contracts/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  db: {
    contract: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    user: { findUniqueOrThrow: jest.fn() },
    template: { findUniqueOrThrow: jest.fn() },
  },
}));

const mockAuth = auth as jest.Mock;

describe("GET /api/contracts", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns contracts list", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    (db.contract.findMany as jest.Mock).mockResolvedValueOnce([
      { id: "c1", title: "HĐ Test" },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].title).toBe("HĐ Test");
  });
});

describe("POST /api/contracts", () => {
  it("returns 400 when missing fields", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(
      new Request("http://localhost/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });
});
