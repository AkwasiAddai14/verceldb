import mongoose, { Schema, Document, Model } from 'mongoose';


export interface IShiftArray extends Document {
    employer: mongoose.Schema.Types.ObjectId;
    applications: mongoose.Schema.Types.ObjectId[];
    reserves: mongoose.Schema.Types.ObjectId[];
    accepted: mongoose.Schema.Types.ObjectId[];
    flexpools: mongoose.Schema.Types.ObjectId[];
    shifts: mongoose.Schema.Types.ObjectId[];
    employerName: string,
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
    status: string;
    inFlexpool: boolean;
}

const shiftArraySchema: Schema<IShiftArray> = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    applications: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Applications',
            required: false
        }
    ],
    accepted: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: false
        }
    ],
    reserves: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: false
        }
    ],
    flexpools: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flexpool',
        required: false
    }],
    shifts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift'
    }],
    title: { type: String, required: true },
    employerName: { type:  String, required: true},
    function: { type: String, required: true },
    image: { type: String, required: true },
    hourlyRate: { type: Number, required: true },
    spots: { type: Number, required: true },
    adres: { type: String, required: true },
    startingDate: { type: Date, required: false },
    endingDate: { type: Date, required: false },
    starting: { type: String, required: true },
    ending: { type: String, required: true },
    break: { type: String, required: false },
    description: { type: String, required: true },
    skills: [{ type: String, required: false }],
    dresscode: [{ type: String, required: false }],
    available: { type: Boolean, required: true, default: true },
    status: { type: String, default: 'beschikbaar'},
    inFlexpool: { type: Boolean, default: false }
});

const ShiftArray: Model<IShiftArray> = mongoose.models.ShiftArray || mongoose.model<IShiftArray>('ShiftArray', shiftArraySchema);
export default ShiftArray;
