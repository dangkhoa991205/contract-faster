import { POST as smartFillPOST } from "@/app/api/ai/smart-fill/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "50 triệu VND" } }],
        }),
      },
    },
  },
}));
jest.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: jest.fn() },
    aiChat: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    contract: { findFirst: jest.fn() },
  },
}));

const mockAuth = auth as jest.Mock;

describe("POST /api/ai/smart-fill", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await smartFillPOST(
      new Request("http://localhost/api/ai/smart-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName: "GIA_TRI", fieldLabel: "Giá trị", fieldType: "number", templateName: "HĐ dịch vụ" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns suggestion when authenticated", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    (db.user.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({ plan: "SOLO" });
    const res = await smartFillPOST(
      new Request("http://localhost/api/ai/smart-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName: "GIA_TRI", fieldLabel: "Giá trị", fieldType: "number", templateName: "HĐ dịch vụ" }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestion).toBeDefined();
  });
});
