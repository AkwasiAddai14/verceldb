import mongoose, { Document, Model } from 'mongoose';

const shiftSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'Employee',
    required: false
  },
  flexpools: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flexpool', // corrected to match the Flexpool model
    required: false
  }],
  substitue: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Employee'
  }],
  shiftArrayId: { type: String },
  title: { type: String, required: true },
  employerName: { type:  String, required: true},
  function: { type: String, required: true },
  image: { type: String, required: true },
  hourlyRate: { type: Number, required: true },
  spots: { type: Number, required: true },
  adres: { type: String, required: true },
  startingDate: { type: Date, required: true },
  endingDate: { type: Date, required: true },
  starting: { type: String, required: true },
  ending: { type: String, required: true },
  break: { type: String, required: false },
  description: { type: String, required: true },
  skills: [{ type: String, required: false }],
  dresscode: [{ type: String, required: false }],
  available: { type: Boolean, required: true, default: true },
  inFlexpool: { type: Boolean, default: false },
  checkoutstarting: { type: String, required: false }, // Using Date type for time
  checkoutending: { type: String, required: false }, // Using Date type for time
  checkoutbreak: { type: String, required: false },
  feedback: { type: String },
  remark: { type: String },
  ratingEmployee: { type: Number },
  ratingEmployer: { type: Number },
  status: { type: String, required: true },
  totalAmount: { type: Number, required: false },
  employeeProfilephoto: { type: String, required: false },
  employeeFirstname: { type: String, required: false },
  employeeLastname: { type: String, required: false },
});

interface FreelancerDetails {
  iban: string;
  VATidnr: string;
  housenumber: string;
  street: string;
  city: string;
  firstname: string;
  lastname: string;
  email: string;
  profilephoto: string;
}

export interface ShiftType extends Document {
  employer: mongoose.Types.ObjectId & { displayname: string; city: string; street: string; housenumber: string; CompanyRegistrationNumber: string; email: string };
  employee?: mongoose.Types.ObjectId | (mongoose.Schema.Types.ObjectId & FreelancerDetails);
  flexpools?: (mongoose.Types.ObjectId & { titel: string })[];
  substitutes?: mongoose.Types.ObjectId[];
  _id: string;
  employerName: string;
  shiftArrayId: string;
  title: string;
  function: string;
  image: string;
  hourlyRate: number;
  spots: number;
  adres: string;
  startingDate: Date;
  endingDate: Date;
  starting: string;
  ending: string;
  break?: string;
  description: string;
  skills?: string[];
  dresscode?: string[];
  available: boolean;
  inFlexpool?: boolean;
  checkoutstarting: string;
  checkoutending: string;
  checkoutpauze: string;
  feedback: string;
  remark: string;
  ratingEmployer: number;
  ratingEmployee: number;
  status: string;
  totaalAmount: number;
  employeeProfilephoto: string;
  employeeFirstname: string;
  employeeLastname: string;
};

const Shift: Model<ShiftType> = mongoose.models.Shift || mongoose.model<ShiftType>('Shift', shiftSchema);

export default Shift;
