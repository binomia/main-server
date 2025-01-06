import { z } from 'zod'


export class TopUpSchema {
    static createTopUp = z.object({
        fullName: z.string(),
        phone: z.string(),
        amount: z.number().positive(),
        companyId: z.number()
    })
}
