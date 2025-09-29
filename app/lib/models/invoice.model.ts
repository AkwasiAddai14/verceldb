import mongoose, { Document } from 'mongoose';

export interface Iinvoice extends Document {
    week: string;
    jobs: mongoose.Schema.Types.ObjectId[];
    shifts: mongoose.Schema.Types.ObjectId[];
    employer: mongoose.Schema.Types.ObjectId;
    employee: mongoose.Schema.Types.ObjectId;
    date: Date;
    time: string;
    workdate: string;
    totalAmount: number; // Update to number
    isCompleted: boolean;  // Update to boolean
  }

const invoiceSchema = new mongoose.Schema({
   week: {type: String, required: true},
   Jobs: [{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Job"
   }],
    shifts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shift"
    }],
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employer"
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee"
    },
    date: {type: Date, default: Date.now},
    time: {type: String, required: true},
    workdate: {type: String, required: true},
    totalAmount: {type: Number, required: true},
    isCompleted: {type: Boolean, default: false}
});

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
export default Invoice;

