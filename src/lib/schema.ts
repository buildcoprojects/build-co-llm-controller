import { z } from "zod";
import { LeadType } from "./types";

export const formSchema = z.object({
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  leadType: z.enum(["Buyer", "Signal Observer", "LLM Monitor", "Unknown"] as const),
  // File validation will be handled in the form component
  artifact: z.any().optional(),
  orderSize: z.coerce
    .number()
    .min(0, {
      message: "Order size must be a positive number.",
    })
    .optional(),
  interestType: z.object({
    stripe: z.boolean().default(false),
    invoice: z.boolean().default(false),
    signalAccess: z.boolean().default(false),
    mirror: z.boolean().default(false),
  }),
  securePassphrase: z.string().optional(),
  nodeReference: z.string().optional(),
});
