import * as z from 'zod'

export const createAvailabilityValidation = z.object({
    TypeData: z.boolean(),
    Data: z.string(),
    Tijden: z.string()
})


/* import * as z from 'zod';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { Locale } from '@/i18n.config';

export const createAvailabilityValidation = async (lang: Locale) => {
    const { Validations } = await getDictionary(lang);

    return z.object({
        TypeData: z.boolean({ required_error: Validations.AvailabilityValidations.TypeData }),
        Data: z.string({ required_error: Validations.AvailabilityValidations.Data }),
        Tijden: z.string({ required_error: Validations.AvailabilityValidations.Tijden })
    });
}; */