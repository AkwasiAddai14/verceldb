import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayslip extends Document {
    issueDate: string;
    dueDate: string;
    subtotal: number;
    tap: number;
    amount: number;
    status: string,
    jobs: {
        id: mongoose.Schema.Types.ObjectId,
        date: string;
        title: string;
        rate: string;
        amount: string;
        hours: number;
        workingtime: {
            starting: string,
            ending: string,
            break: number
        }
    }[],
    employee: {
        id: mongoose.Schema.Types.ObjectId,
        name: string,
        street: string,
        housenumber: string,
        postcode: string,
        city: string,
        IBAN: string,
        Profilephoto: string,
        geboortedatum: string,
    },
    employer: {
        id: mongoose.Schema.Types.ObjectId,
        name: string,
        street: string,
        housenumber: string,
        postcode: string,
        city: string,
        IBAN: string,
        KVK: string,
        VAT: string,
    },
    activity: {
        id: number,
        activitytype: string,
        person: {
            name: string,
            profilephoto: string,
        },
        comment: string,
        mood: string,
        date: string,
        dateTime: Date,
    }[]
}

const payslipSchema: Schema<IPayslip> = new mongoose.Schema ({
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    subtotal: { type: Number, required: true },
    tap: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true },
    jobs:[{
       id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
       amount: { type: Number, required: true },
       title: { type: String, required: true },
       rate: { type: String, required: true },
       date: { type: String, required: true },
       hours: { type: Number, required: true },
       workingtime: {
        starting: { type: String, required: true },
        ending: { type: String, required: true },
        break: { type: Number, required: true }
       }
    }], 
    employer: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
        name: { type: String, required: true },
        street: { type: String, required: true },
        housenumber: { type: String, required: true },
        postcode: { type: String, required: true },
        city: { type: String, required: true },
        IBAN: { type: String, required: true },
        KVK: { type: String, required: true },
        VAT: { type: String, required: true }
    },
    employee: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        name: { type: String, required: true },
        profilephoto: { type: String, required: true },
        geboortedatum: { type: String, required: true },
        IBAN: { type: String, required: true },
        street: { type: String, required: true },
        housenumber: { type: String, required: true },
        postcode: { type: String, required: true },
        city: { type: String, required: true }
    },
    activity: [{
        id: { type: Number},
        activitytype: { type: String, required: true },
        comment: { type: String, required: false },
        mood: { type: String, required: false },
        date: { type: String, required: true },
        dateTime: { type: Date, required: true },
        person: {
            name: { type: String, required: true },
            profilephoto: { type: String, required: true }
        }
    }]
})

const Payslip: Model<IPayslip> = mongoose.models.Payslip || mongoose.model<IPayslip>('Payslip', payslipSchema)
export default Payslip;