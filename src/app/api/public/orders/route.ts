import { NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizePakistanMobileNumber,
  PAKISTAN_MOBILE_ERROR,
} from "@/lib/pakistan-phone";
import { createPublicOrder, OrderServiceError } from "@/server/orders/order-service";

const orderSchema = z
  .object({
    orderType: z.enum(["delivery", "pickup", "carhop"]),
    customerName: z.string().min(2).max(80),
    phone: z
      .string()
      .min(10)
      .max(24)
      .transform((value) => value.trim())
      .refine((value) => Boolean(normalizePakistanMobileNumber(value)), {
        message: PAKISTAN_MOBILE_ERROR,
      })
      .transform((value) => normalizePakistanMobileNumber(value)?.e164 ?? value),
    deliveryArea: z.string().optional(),
    deliveryLocation: z
      .object({
        accuracyMeters: z.number().min(0).max(50_000).optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
    address: z.string().max(240).optional(),
    landmark: z.string().max(120).optional(),
    carDetails: z.string().max(120).optional(),
    instructions: z.string().max(500).optional(),
    lines: z
      .array(
        z.object({
          menuItemId: z.string(),
          quantity: z.number().int().min(1).max(20),
          addOnIds: z.array(z.string()).default([]),
        }),
      )
      .min(1),
  })
  .superRefine((order, ctx) => {
    if (order.orderType === "delivery") {
      if (!order.deliveryArea) {
        ctx.addIssue({
          code: "custom",
          message: "Please select a delivery area.",
          path: ["deliveryArea"],
        });
      }

      if (!order.address || order.address.trim().length < 8) {
        ctx.addIssue({
          code: "custom",
          message: "Please add a complete delivery address.",
          path: ["address"],
        });
      }
    }

    if (order.orderType === "carhop" && (!order.carDetails || order.carDetails.trim().length < 3)) {
      ctx.addIssue({
        code: "custom",
        message: "Please add car color/model or plate detail.",
        path: ["carDetails"],
      });
    }
  });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please check the order details and try again.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin") ?? `${requestUrl.protocol}//${requestUrl.host}`;
    const order = await createPublicOrder(parsed.data, origin);

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not create this order.",
      },
      { status: error instanceof OrderServiceError ? error.status : 500 },
    );
  }
}
