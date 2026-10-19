import { z } from "zod";

export const ONLINE_ORDER_STATUSES = ["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

/** Cap per order so a single public submission can't create an unbounded payload. */
export const MAX_ONLINE_ORDER_LINES = 50;

export const placeOnlineOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your name").max(150),
  phone: z.string().trim().min(5, "Please enter a valid phone number").max(30),
  email: z.string().trim().email("Please enter a valid email").max(190).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(1000).optional(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(64),
        quantity: z.coerce.number().int().min(1).max(1000)
      })
    )
    .min(1, "Your cart is empty")
    .max(MAX_ONLINE_ORDER_LINES)
});

export type PlaceOnlineOrderInput = z.infer<typeof placeOnlineOrderSchema>;
