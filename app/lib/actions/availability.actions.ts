"use server"

import { connectToDB } from "../mongoose";
import { currentUser } from "@clerk/nextjs/server";
import mongoose, { SortOrder } from "mongoose";
import { Availability, IAvailability } from '@/app/lib/models/availability.model';
import { IEmployee } from '@/app/lib/models/employee.model';

interface FormData {
    dateType: 'single' | 'multiple'
    singleDate: Date
    startDate: Date
    endDate: Date
    fromTime: string
    toTime: string
    mainCategories: string[]
    subCategories: string[]
    addressType: 'current' | 'different' | 'any'
    distance: string
    street: string
    houseNumber: string
    postcode: string
    city: string
  }

interface SaveAvailabilityParams {
    formData: FormData;
    employee: IEmployee;
  }
  
  export async function saveAvailability({ formData, employee }: SaveAvailabilityParams): Promise<void> {
    try {
      await connectToDB();
  
      const availabilityData = {
        startingDate: formData.dateType === 'single' ? formData.singleDate : formData.startDate,
        endingDate: formData.dateType === 'single' ? formData.singleDate : formData.endDate,
        startingTime: formData.fromTime,
        endingTime: formData.toTime,
        preferences: [...formData.mainCategories, ...formData.subCategories],
        address: {
          street: formData.street,
          houseNumber: formData.houseNumber,
          postcode: formData.postcode,
          city: formData.city,
          preferences: formData.distance
        }
      };
  
      const newAvailability = new Availability({
        data: [availabilityData],
        employee,
        rating: [] // of hier ratings toevoegen als je die hebt
      });
  
      await newAvailability.save();
      console.log('Availability succesvol opgeslagen');
    } catch (error) {
      console.error('Fout bij opslaan van availability:', error);
      throw new Error('Kon availability niet opslaan');
    }
  };



export const vindBeschikbaarheidVanFreelancer = async (employeeId: string): Promise<IAvailability[]> => {
  try {
    await connectToDB();

    // Zorg dat employeeId juist is, en indien nodig een ObjectId is
    const beschikbaarheden = await Availability.find({ "employee._id": employeeId }).lean();

    return beschikbaarheden;
  } catch (error) {
    console.error('Fout bij ophalen van beschikbaarheden:', error);
    throw new Error('Kan beschikbaarheden niet ophalen');
  }
};
