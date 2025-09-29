import { z } from 'zod';

export const createCompanyValidation = z.object({
    companyId: z.string(),
    name: z.string(),
    country: z.string(),
    displayname: z.string(),
    profilephoto: z.string(),
    bio: z.string(),
    CompanyRegistrationNumber: z.string().optional(),
    VATidnr: z.string(),
    postcode: z.string(),
    housenumber: z.string(),
    street: z.string(),
    city: z.string(),
    phone: z.string(),
    email: z.string(),
    iban: z.string()
});
/* import { getDictionary } from '@/app/[lang]/dictionaries';
import { Locale } from '@/i18n.config';

export const createCompanyValidation = async (lang: Locale) => {
    const { Validations } = await getDictionary(lang);

return z.object({
    companyId: z.string(),
    name: z.string({ required_error: Validations.EmployerValidations.Naam }),
    country: z.string({ required_error: Validations.EmployerValidations.Land }),
    displayname: z.string(),
    profilephoto: z.string(),
    bio: z.string(),
    CompanyRegistrationNumber: z.string().optional(),
    VATidnr: z.string(),
    postcode: z.string({ required_error: Validations.EmployerValidations.Postcode }),
    housenumber: z.string({ required_error: Validations.EmployerValidations.Huisnummer }),
    street: z.string({ required_error: Validations.EmployerValidations.Straat }),
    city: z.string({ required_error: Validations.EmployerValidations.Stad }),
    phone: z.string({ required_error: Validations.EmployerValidations.Telefoonnumer }),
    email: z.string({ required_error: Validations.EmployerValidations.Emailadres }),
    iban: z.string({ required_error: Validations.EmployerValidations.IBAN })
});
} */