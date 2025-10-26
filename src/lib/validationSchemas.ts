import { z } from 'zod';

export const gameSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Prize name is required" })
    .max(100, { message: "Prize name must be less than 100 characters" }),
  ticketPrice: z.string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Ticket price must be a valid positive number"
    })
    .refine((val) => parseFloat(val) <= 10000, {
      message: "Ticket price must be less than £10,000"
    }),
  maxTickets: z.string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: "Max tickets must be a positive number"
    })
    .refine((val) => parseInt(val) <= 1000000, {
      message: "Max tickets must be less than 1,000,000"
    }),
  drawDate: z.string()
    .min(1, { message: "Draw date is required" }),
  drawTime: z.string()
    .min(1, { message: "Draw time is required" }),
});

export const playerSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(50, { message: "First name must be less than 50 characters" }),
  lastName: z.string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(50, { message: "Last name must be less than 50 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z.string()
    .trim()
    .max(20, { message: "Phone must be less than 20 characters" })
    .optional(),
});

export const csvPlayerSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(50, { message: "First name must be less than 50 characters" }),
  lastName: z.string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(50, { message: "Last name must be less than 50 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Invalid email format" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z.string()
    .trim()
    .max(20, { message: "Phone must be less than 20 characters" })
    .optional(),
});
