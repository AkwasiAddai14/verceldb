import mongoose, { Schema, Document, Model } from 'mongoose';


export interface IApplication extends Document {
    employer: mongoose.Schema.Types.ObjectId;
    vacancy: mongoose.Schema.Types.ObjectId;
    status: string;
    jobs: 
        {
        date: string;
        amount: number;
        dienstId: mongoose.Schema.Types.ObjectId
        starting: string,
        ending: string,
        break: number
    }[],
    employees: {
        employeeId: mongoose.Schema.Types.ObjectId
        name: string,
        profilephoto: string
        rating: Number;
        bio: string;
        dateOfBirth: string;
        shifts: number;
        city: string;
        email: string;
        phone: string;
    },
}

const ApplicationSchema: Schema<IApplication> = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    vacancy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vacancy',
        required: true
    },
    status: {
        type: String,
        required: true,
    },
    jobs: [{
        jobId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Dienst', // Referentie naar Freelancer-model
            required: true,
          },
        date: { type: String, required: false },
        amount: { type: String, required: false },
        starting: { type: String, required: true }, // Bijvoorbeeld: "09:00"
        ending: { type: String, required: true }, // Bijvoorbeeld: "17:00"
        break: { type: Number, required: true }, // Pauze in minuten
      }],
      employees: 
        {
            employeeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Freelancer', // Referentie naar Freelancer-model
                required: true,
              },
          name: { type: String, required: true },
          profilephoto: { type: String, required: true },
          rating: { type: Number, required: false },
          dateOfBirth: { type: String, required: true },
          bio: { type: String, required: true},
          city: { type: String, required: true },
          shifts: { type: Number, required: true },
          email: { type: String, required: true },
          phone: { type: String, required: true },
        },
});

const Application: Model<IApplication> = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
export default Application;
