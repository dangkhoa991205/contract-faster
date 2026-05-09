import { Plan } from "@prisma/client";

type QuotaLimits = {
  contracts: number;
  aiChatsPerDay: number;
};

export function getQuotaLimits(plan: Plan): QuotaLimits {
  switch (plan) {
    case "FREE":
      return { contracts: 3, aiChatsPerDay: 0 };
    case "SOLO":
      return { contracts: 50, aiChatsPerDay: 20 };
    case "TEAM":
      return { contracts: Infinity, aiChatsPerDay: Infinity };
    case "ENTERPRISE":
      return { contracts: Infinity, aiChatsPerDay: Infinity };
  }
}
