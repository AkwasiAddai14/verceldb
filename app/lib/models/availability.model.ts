import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface IAddress {
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  preferences: string; // e.g., "5km", "10km", "20km"
}

export interface IAvailabilityData {
  startingDate: Date | string;
  endingDate: Date | string;
  startingTime: string;
  endingTime: string;
  preferences: string[];
  address: IAddress;
}

export interface IEmployee {
  _id: string;
  employeeFirstname: string;
  employeeLastname: string;
  employeeDateOfBirth: string;
  employeeProfilephoto: string;
  employeeRating: string | number;
}

export interface IRating {
  categoryName: string;
  rating: number;
}

export interface IAvailability extends Document {
  _id: string;
  data: IAvailabilityData[];
  employee: IEmployee;
  rating: IRating[];
}

// Mongoose Schema
const AvailabilitySchema = new Schema<IAvailability>({
  data: [{
    startingDate: { type: Schema.Types.Mixed, required: true }, // Can be either Date or String
    endingDate: { type: Schema.Types.Mixed, required: true }, // Can be either Date or String
    startingTime: { type: String, required: true },
    endingTime: { type: String, required: true },
    preferences: [{ type: String, required: true }],
    address: {
      street: { type: String, required: true },
      houseNumber: { type: String, required: true },
      postcode: { type: String, required: true },
      city: { type: String, required: true },
      preferences: { type: String, required: true }
    }
  }],
  employee: {
    _id: { type: String, required: true },
    employeeFirstname: { type: String, required: true },
    employeeLastname: { type: String, required: true },
    employeeDateOfBirth: { type: String, required: true },
    employeeProfilephoto: { type: String, required: true },
    employeeRating: { type: Schema.Types.Mixed, required: true } // Can be either String or Number
  },
  rating: [{
    categoryName: { type: String, required: true },
    rating: { type: Number, required: true }
  }]
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Create and export the model
export const Availability = mongoose.models.Availability || mongoose.model<IAvailability>('Availability', AvailabilitySchema);