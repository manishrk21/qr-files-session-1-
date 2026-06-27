// validations/auth.ts
import { z } from 'zod';

export const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export const SendOtpSchema = z.object({
  mobileNumber: z.string().regex(E164_REGEX, 'Must be E.164 format (e.g. +919876543210)'),
  restaurantId: z.string().uuid(),
});

export const VerifyOtpSchema = z.object({
  mobileNumber: z.string().regex(E164_REGEX),
  otp: z.string().length(6).regex(/^\d{6}$/),
  restaurantId: z.string().uuid(),
  tableToken: z.string().min(10),
});

export const GuestSessionSchema = z.object({
  restaurantId: z.string().uuid(),
  tableToken: z.string().min(10),
});

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(100),           // Google ID token from client
  restaurantId: z.string().uuid(),
  tableToken: z.string().min(10),
});

// validations/order.ts
export const CartItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const ValidateCartSchema = z.object({
  restaurantId: z.string().uuid(),
  items: z.array(CartItemSchema).min(1).max(30),
});

export const CreateOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  tableId: z.string().uuid(),
  items: z.array(CartItemSchema).min(1).max(30),
  specialInstructions: z.string().max(300).optional(),
});

export const AddOrderItemsSchema = z.object({
  items: z.array(CartItemSchema).min(1).max(10),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'preparing', 'ready', 'served', 'paid', 'cancelled']),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'other']).optional(),
  notes: z.string().max(200).optional(),
});

// validations/menu.ts
export const CreateMenuCategorySchema = z.object({
  name: z.string().min(1).max(60),
  displayOrder: z.number().int().min(0).default(0),
});

export const CreateMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(99999),
  foodType: z.enum(['veg', 'non_veg', 'egg']).default('veg'),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  preparationTimeMinutes: z.number().int().min(0).max(120).optional(),
  displayOrder: z.number().int().min(0).default(0),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();

export const CreateTableSchema = z.object({
  label: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(50).optional(),
});
