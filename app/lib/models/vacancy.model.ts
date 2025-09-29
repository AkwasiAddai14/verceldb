import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVacancy extends Document {
    employer: mongoose.Schema.Types.ObjectId;
    applications: mongoose.Schema.Types.ObjectId[];
    jobs: mongoose.Schema.Types.ObjectId[];
    employerName: string,
    title: string;
    function: string;
    image: string;
    hourlyRate: number;
    adres: {
        street: string,
        housenumber: string,
        postcode: string,
        city: string,
    };
    startingDate: Date;
    endingDate: Date;
    times: [{
        starting: string; // Bijvoorbeeld: "09:00"
        ending: string; // Bijvoorbeeld: "17:00"
        break?: number; // Bijvoorbeeld: 30 (voor 30 minuten pauze)
      }];
      description: string;
      skills?: string[];
      dresscode?: string[];
      available: boolean;
      surcharges: [{
        surcharge: boolean,
        surchargeType: number,
        surchargePercentage: number,
        surchargeVan: string,
        surchargeTot: string,
      }],
      label: string
}

const vacancySchema: Schema<IVacancy> = new mongoose.Schema({
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
    jobs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: false
        }
    ],
    title: { type: String, required: true },
    employerName: { type:  String, required: true},
    function: { type: String, required: true },
    image: { type: String, required: true },
    hourlyRate: { type: Number, required: true },
    adres: {
        street: { type: String, required: true },
        housenumber: { type: String, required: true },
        postcode: { type: String, required: true },
        city: { type: String, required: true },
    },
    startingDate: { type: Date, required: false },
    endingDate: { type: Date, required: false },
    times: [{
        starting: { type: String, required: true }, // Bijvoorbeeld: "09:00"
        ending: { type: String, required: true }, // Bijvoorbeeld: "17:00"
        break: { type: Number, required: false }, // Bijvoorbeeld: 30 (voor 30 minuten pauze)
      }],
    description: { type: String, required: true },
    skills: [{ type: String, required: false }],
    dresscode: [{ type: String, required: false }],
    available: { type: Boolean, required: true, default: true },
    surcharges: [{
        surcharge: { type: Boolean},
        surchargeType: { type: Number},
        surchargePercentage: { type: Number},
        surchargeVan: { type: String},
        surchargeTot: {type: String},
}],
label: { type: String, required: false }
});

const Vacancy: Model<IVacancy> = mongoose.models.Vacancy || mongoose.model<IVacancy>('Vacancy', vacancySchema);
export default Vacancy;