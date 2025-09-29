import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IEmployer extends Document {
  clerkId: string;
  name: string;
  displayname?: string;
  bio?: string;
  profilephoto?: string;
  country: string;
  CompanyRegistrationNumber: string;
  VATidnr?: string;
  postcode: string;
  housenumber: string;
  city?: string;
  street?: string;
  phone: string;
  email: string;
  iban?: string;
  onboarded?: boolean;
  ratingCount?: number;
  rating?: number;
  invoices: mongoose.Types.ObjectId[];
  filialen: mongoose.Types.ObjectId[];
  flexpools: mongoose.Types.ObjectId[];
  shifts: mongoose.Types.ObjectId[];
  checkouts: mongoose.Types.ObjectId[];
  vacancies: mongoose.Types.ObjectId[];
  applications: mongoose.Types.ObjectId[];
  jobs: mongoose.Types.ObjectId[];
}

const bedrijfSchema: Schema<IEmployer> = new mongoose.Schema({
  clerkId: { type: String, required: true },
  name: { type: String, required: true },
  displayname: { type: String, required: false },
  bio: { type: String, required: false },
  country: { type: String, required: true },
  profilephoto: { type: String, required: false },
  CompanyRegistrationNumber: { type: String, required: true },
  VATidnr: { type: String, required: false },
  postcode: { type: String, required: true },
  housenumber: { type: String, required: true },
  city: { type: String, required: false },
  street: { type: String, required: false },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  iban: { type: String, required: false },
  onboarded: { type: Boolean, default: false },
  ratingCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  invoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice"
  }],
  filialen: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer'
  }],
  flexpools: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flexpool'
  }],
  shifts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftArray'
  }],
  checkouts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  }],
  vacancies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vacancy'
  }],
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  jobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
});

const Employer: Model<IEmployer> = mongoose.models.Employer || mongoose.model<IEmployer>('Employer', bedrijfSchema);
export default Employer;