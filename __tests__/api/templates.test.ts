import { GET } from "@/app/api/templates/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  db: {
    template: {
      findMany: jest.fn(),
    },
  },
}));

const mockAuth = auth as jest.Mock;
const mockFindMany = db.template.findMany as jest.Mock;

describe("GET /api/templates", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns templates list when authenticated", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValueOnce([
      { id: "t1", name: "Template 1", category: "Dịch vụ", isPublic: true },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Template 1");
  });
});
