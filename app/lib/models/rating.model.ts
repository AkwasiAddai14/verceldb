import mongoose, { Document, Schema } from 'mongoose';


export interface IEmployee {
    _id: string;
    employeeFirstname: string;
    employeeLastname: string;
    employeeDateOfBirth: string;
    employeeProfilephoto: string;
    employeeRating: string | number;
  }

export interface ICategory {
  categoryName: string;
  shiftCount: number;
  ratingCount: number;
  rating: number;
}

export interface IShift {
  shiftName: string;
  shiftCategory: string;
  shiftDate: Date | string;
  shiftRemark: string;
  shiftRating: number;
}

export interface IEmployer {
  shiftCount: number;
  ratingCount: number;
  shift: IShift;
}

export interface IRating extends Document {
  _id: string;
  employee: IEmployee;
  category: ICategory[];
  employer: IEmployer;
}

// Mongoose Schema
const RatingSchema = new Schema<IRating>({
  employee: {
    _id: { type: String, required: true },
    employeeFirstname: { type: String, required: true },
    employeeLastname: { type: String, required: true },
    employeeDateOfBirth: { type: String, required: true },
    employeeRating: { type: Number, required: true }
  },
  category: [{
    categoryName: { type: String, required: true },
    shiftCount: { type: Number, required: true },
    ratingCount: { type: Number, required: true },
    rating: { type: Number, required: true }
  }],
  employer: {
    shiftCount: { type: Number, required: true },
    ratingCount: { type: Number, required: true },
    shift: {
      shiftName: { type: String, required: true },
      shiftCategory: { type: String, required: true },
      shiftDate: { type: Schema.Types.Mixed, required: true }, // Can be either Date or String
      shiftRemark: { type: String, required: true },
      shiftRating: { type: Number, required: true }
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Create and export the model
export const Rating = mongoose.models.Rating || mongoose.model<IRating>('Rating', RatingSchema); 