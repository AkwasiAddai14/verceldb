import mongoose, { Document, Types, Schema } from 'mongoose';

export interface IEmployee extends Document {
    flexpools: mongoose.Types.ObjectId[];
    shifts: mongoose.Types.ObjectId[];
    checkouts: mongoose.Types.ObjectId[];
    invoices: mongoose.Types.ObjectId[]; 
    applications: mongoose.Types.ObjectId[],
    job: mongoose.Types.ObjectId[],
    clerkId: string;
    firstname: string;
    infix?: string;
    lastname: string;
    country: string;
    dateOfBirth: Date;
    phone?: string;
    email?: string;
    SocialSecurity?: string;
    taxBenefits?: boolean;
    SalaryTaxDiscount?: boolean;
    companyRegistrationNumber?: string;
    VATidnr?: string;
    iban: string;
    postcode: string;
    housenumber: string;
    street?: string;
    city?: string;
    onboarded?: boolean;
    profilephoto?: string;
    ratingCount?: number;
    rating?: number;
    attendance?: number;
    punctualiy?: number;
    bio?: string;
  }

const employeeSchema = new mongoose.Schema({
    clerkId: { type: String, required: true },
    firstname: { type: String, required: true },
    infix: { type: String, required: false },
    lastname: { type: String, required: true },
    country: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: false },
    SocialSecurity: { type: String, required: false },
    taxBenefits: { type: Boolean, default: false },
    SalaryTaxDiscount: { type: Boolean, default: false },
    companyRegistrationNumber: { type: String, required: false },
    VATidnr: { type: String, required: false },
    iban: { type: String, required: true },
    postcode: { type: String, required: true },
    housenumber: { type: String, required: true },
    street: { type: String, required: false },
    city: { type: String, required: false },
    onboarded: { type: Boolean, default: false },
    profilephoto: { type: String, required: false },
    ratingCount: { type: Number, default: 0 },
    rating: { type: Number, default: 5 },
    attendance: { type: Number, default: 100 },
    punctuality: { type: Number, default: 100 },
    bio: { type: String, required: false, default: '' }, // Default value added
    experience: [
        {
            bedrijf: { type: String, required: true },
            functie: { type: String, required: true },
            duur: { type: String, required: true }
        }
    ],
    skills: [
        {
            vaardigheid: { type: String, required: false }
        }
    ],
    education: [
        {
            naam: { type: String, required: true },
            school: { type: String, required: true },
            niveau: { type: String, required: false }
        }
    ],
    shifts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Shift",
                required: false,
            },
    ],
    checkouts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shift",
            required: false,
        },
],
    flexpools: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Flexpool"
        }
    ],
    invoices: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice"
        }
    ],
    applications: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application",
            required: false,
        },
],
    jobs: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: false,
    },
],
});

// Ensure indexes are created as needed (optional)
// freelancerSchema.index({ clerkId: 1 });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
export default Employee;
