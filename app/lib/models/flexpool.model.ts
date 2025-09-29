import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFlexpool extends Document {
  titel: string;
  employer: mongoose.Schema.Types.ObjectId;
  employerName: string;
  imageUrl: string;
  employees: mongoose.Schema.Types.ObjectId[];
  shifts: mongoose.Schema.Types.ObjectId[];
}

const flexpoolSchema: Schema<IFlexpool> = new mongoose.Schema({
  titel: { type: String, required: true },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true,
  },
  employerName: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: []
  }],
  shifts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftArray',
    default: []
  }]
});

const Flexpool: Model<IFlexpool> = mongoose.models.Flexpool || mongoose.model<IFlexpool>('Flexpool', flexpoolSchema);
export default Flexpool;

