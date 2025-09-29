import * as z from 'zod';

export const CheckoutValidation = z.object({
    begintijd: z.string().optional(),
    eindtijd: z.string().optional(),
    pauze: z.string().optional(),
    rating: z.number().optional(),
    feedback: z.string().optional(),
    opmerking: z.string().optional(),
    laat: z.boolean().optional(),
})