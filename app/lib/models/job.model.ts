import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJob extends Document {
    employer: mongoose.Schema.Types.ObjectId;
    vacancy: mongoose.Schema.Types.ObjectId;
    title: string;
    date: string,
    workingtime: {
        starting: string,
        ending: string,
        break: number
    }
    employees: {
        freelancerId: mongoose.Schema.Types.ObjectId;
        city: string;
        name: string;
        profilephoto: string;
        rating: number;
        dateOfBirth: string;
        ratingCount: number; 
      }[];
    amount: number,
    status: string,
    index: number,
}

const jobSchema: Schema<IJob> = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    vacancy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vacancies',
        required: true
    },
    title:{ type: String, required: true },
    date: {type: String, required: true},
    workingtime: {
        starting: { type: String, required: true }, // Bijvoorbeeld: "09:00"
        ending: { type: String, required: true }, // Bijvoorbeeld: "17:00"
        break: { type: Number, required: true }, // Pauze in minuten
      },
      employees: [
        {
            freelancerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Employee', // Referentie naar Freelancer-model
                required: true,
              },
          city: { type: String, required: false },
          name: { type: String, required: true },
          profilephot: { type: String, required: true },
          rating: { type: Number, required: false },
          dateOfBirth: { type: String, required: true },
          ratingCount: { type: Number, required: false },
        },
      ],
      amount: {
        type: Number, // Gebruik `Number` in plaats van `Double` voor compatibiliteit met Mongoose
        required: true,
      },
      status: { 
        type: String, 
        required: false
    },
    index: {
        type: Number, 
        required: true 
    },
});

const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', jobSchema);
export default Job;