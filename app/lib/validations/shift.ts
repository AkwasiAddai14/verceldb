import * as z from 'zod';


export const createShiftValidation = z.object({
    image: z.string(),
    title: z.string(),
    function: z.string(),
    hourlyRate: z.number().gt(13),
    startingDate: z.date(),
    endingDate: z.date(),
    adres: z.string(),
    starting: z.string(),
    ending: z.string(),
    break: z.string(),
    spots: z.number().gt(0),
    description: z.string(),
    skills: z.union([z.string(), z.array(z.string())]),
    dresscode: z.union([z.string(), z.array(z.string())]),
    inFlexpool: z.boolean(),
    flexpoolId: z.string(),
 });
/* import { getDictionary } from '@/app/[lang]/dictionaries';
import { Locale } from '@/i18n.config';

export const createShiftValidation = async (lang: Locale) => {
    const { Validations } = await getDictionary(lang);


return z.object({
    image: z.string(),
    title: z.string({ required_error: Validations.ShiftValidations.Titel }),
    function: z.string({ required_error: Validations.ShiftValidations.Functie }),
    hourlyRate: z.number().gt(13),
    startingDate: z.date({ required_error: Validations.ShiftValidations.Begindatum }),
    endingDate: z.date({ required_error: Validations.ShiftValidations.Einddatum }),
    adres: z.string({ required_error: Validations.ShiftValidations.Adres }),
    starting: z.string({ required_error: Validations.ShiftValidations.Begintijd }),
    ending: z.string({ required_error: Validations.ShiftValidations.Eindtijd }),
    break: z.string({ required_error: Validations.ShiftValidations.Pauze }),
    spots: z.number({ required_error: Validations.ShiftValidations.Plekken }).gt(0),
    description: z.string({ required_error: Validations.ShiftValidations.Beschrijving }),
    skills: z.union([z.string(), z.array(z.string())]),
    dresscode: z.union([z.string(), z.array(z.string())]),
    inFlexpool: z.boolean(),
    flexpoolId: z.string(),
 });
} */