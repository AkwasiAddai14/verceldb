"use server"

import { connectToDB} from "../mongoose";
import Flexpool, { IFlexpool } from "../models/flexpool.model";
import Employer, { IEmployer } from "../models/employer.model";
import Employee, { IEmployee } from "../models/employee.model";
import mongoose, { Types } from "mongoose";
import { currentUser } from "@clerk/nextjs/server";
import Shift from "../models/shift.model";
import ShiftArray from "../models/shiftArray.model";




export async function maakFlexpool({
  bedrijfId,
  titel,
  freelancers = [],
  shifts = []
}: {
  bedrijfId: mongoose.Types.ObjectId,
  titel: string,
  freelancers?: mongoose.Types.ObjectId[],
  shifts?: mongoose.Types.ObjectId[]
}) {
  try {
    // Create a new Flexpool instance
    await connectToDB();
    const berijf = await Employer.findById(bedrijfId);
    if(!berijf){
      throw new Error(`Company with ID ${bedrijfId} not found`);
    }
    const newFlexpool = new Flexpool({
      titel,
      employerName: berijf.displayname,
      imageUrl: berijf.profilephoto || '',
      bedrijf: bedrijfId,
      freelancers,
      shifts
    });

    // Save the new Flexpool to the database
    const savedFlexpool = await newFlexpool.save();

    // Find the associated company and update it
    const company = await Employer.findById(bedrijfId);
    if (!company) {
      throw new Error(`Company with ID ${bedrijfId} not found`);
    }

    company.flexpools.push(savedFlexpool._id as unknown as mongoose.Types.ObjectId); // Ensure the ID is of correct type
    await company.save(); // Save the updated company document

    return [savedFlexpool._id, savedFlexpool.titel];
  } catch (error) {
    console.error('Error creating flexpool:', error);
    throw new Error('Error creating flexpool');
  }
}

export async function voegAanFlexpool({
    flexpoolId,
    freelancerId
}: {
    flexpoolId: mongoose.Types.ObjectId,
    freelancerId: mongoose.Types.ObjectId
}){
    try {
      await connectToDB()
        const flexpool = await Flexpool.findById(flexpoolId);
    if (!flexpool) {
      throw new Error("Flexpool not found");
    }

    // Check if each freelancer exists before adding
    const freelancer = await Employee.findById(freelancerId);
    if (!freelancer) {
      throw new Error(`Freelancer with ID ${freelancerId} not found`);
    }

    // Add freelancers to the flexpool
    flexpool.employees.push(freelancer._id);
    freelancer.flexpools.push(flexpool._id);
    await freelancer.save();
    // Save the updated flexpool
    await flexpool.save();
    // Return the updated flexpool
    return { success: true, message: "Freelancer successfully added to flexpool." };
  } catch (error) {
    console.error("Error adding freelancers to flexpool:", error);
    throw new Error("Error adding freelancers to flexpool");
  }
}



export const verwijderUitFlexpool = async ({
    flexpoolId,
    freelancerId,
  }: {
    flexpoolId: mongoose.Types.ObjectId;
    freelancerId: mongoose.Types.ObjectId;
  }) => {
    try {
     await connectToDB()
      // Find the Flexpool to ensure it exists
      const flexpool = await Flexpool.findById(flexpoolId);
      if (!flexpool) {
        throw new Error("Flexpool not found");
      }
  
      // Remove the freelancer from the flexpool
      flexpool.employees = flexpool.employees.filter(
        (id) => id.toString() !== freelancerId.toString()
      );
  
      // Save the updated flexpool
       await flexpool.save();
  
      // Return the updated flexpool
      return { success: true, message: "Freelancer successfully removed from flexpool." };
    } catch (error) {
      console.error("Error removing freelancer from flexpool:", error);
      throw new Error("Error removing freelancer from flexpool");
    }
  };

export const verwijderFlexpool = async (flexpoolId: mongoose.Types.ObjectId) => {
    try {
       await connectToDB()
        // Find the flexpool
        const flexpool = await Flexpool.findById(flexpoolId);
        if (!flexpool) {
            throw new Error('Flexpool not found');
        }

        // Delete the flexpool
        await Flexpool.findByIdAndDelete(flexpoolId);

        // Return the deleted flexpool
        return flexpool;
    } catch (error) {
        console.error('Error deleting flexpool:', error);
        throw new Error('Error deleting flexpool');
    }
};

export const haalFlexpoolFreelancer = async (userId: Types.ObjectId | string ): Promise<IFlexpool[] | []> => {
    try {
      await connectToDB();
        // Zoek de freelancer op basis van het gegeven ID
        let freelancer;
        let flexpools;
    if(mongoose.Types.ObjectId.isValid(userId)){
         freelancer = await Employee.findById(userId)
        if (freelancer && freelancer.flexpools && freelancer.flexpools.length > 0) {
          // Fetch the related Flexpool documents
          flexpools = await Flexpool.find({ _id: { $in: freelancer.flexpools } })
          console.log(flexpools)
          console.log("Flexpools fetched successfully.");
          return flexpools;
        }
    }
        // Case 2: If freelancerId is not provided, use the logged-in user (Clerk)
        if(userId.toString() !== ""){
          freelancer = await Employee.findOne({clerkId : userId});
          if (freelancer && freelancer.flexpools && freelancer.flexpools.length > 0) {
            // Fetch the related Flexpool documents
            flexpools = await Flexpool.find({ _id: { $in: freelancer.flexpools } })
            console.log(flexpools)
            console.log("Flexpools fetched successfully.");
            return flexpools;
          }
        } else {
          const user = await currentUser();
          if (user) {
             freelancer = await Employee.findOne({ clerkId: user.id });
            if (freelancer && freelancer.flexpools && freelancer.flexpools.length > 0) {
              // Fetch the related Flexpool documents
              flexpools = await Flexpool.find({ _id: { $in: freelancer.flexpools } })
              console.log(flexpools)
              console.log("Flexpools fetched successfully.");
              return flexpools;
            }
        } else {
          console.log('No flexpools found for this freelancer.');
          return [];
        }   
    }
    return flexpools || [];// Retourneer de flexpools van de freelancer
  } catch (error) {
  console.error('Error fetching flexpools:', error);
  throw new Error('Failed to fetch flexpools');
  }
}

export const haalShiftsInFlexpool = async (flexpoolId: Types.ObjectId | string) => {
  try {
    await connectToDB();
    if(mongoose.Types.ObjectId.isValid(flexpoolId)){
    console.log('function called')
    const flexpool = await Flexpool.findById(flexpoolId);
    console.log(flexpool)
if (flexpool) {
    const shifts = await Shift.find({ _id: { $in: flexpool.shifts } });
    console.log(shifts)
    return shifts;
   }   // Now you can safely use `shifts`
    } else {
    console.error('Flexpool not found');
}
  } catch(error) {
    console.error('Error fetching shifts:', error);
  throw new Error('Failed to fetch shifts');
  }
}

export const haalFlexpool = async (flexpoolId: string) => {
  try {
    await connectToDB();
      // Zoek de freelancer op basis van het gegeven ID
      const flexpool = await Flexpool.findById(flexpoolId).populate({
        path: 'shifts',
        model: 'ShiftArray',
        select: 'titel begindatum aanmeldingen opdrachtgeverNaam plekken afbeelding inFlexpool uurtarief begintijd eindtijd uurtarief', // Select only necessary fields to avoid deep recursion
      })
      .populate({
        path: 'freelancers',
        model: 'Freelancer',
        select: 'voornaam achternaam emailadres ratingCount stad profielfoto punctualiteit opkomst rating', // Select only necessary fields
      })
      .lean();

      if (!flexpool) {
          throw new Error('Flexpool niet gevonden');
      }
      console.log(flexpool)
      // Retourneer de flexpools van de freelancer
      return flexpool;
  } catch (error) {
      console.error('Error fetching flexpools:', error);
      throw new Error('Failed to fetch flexpools');
  }
};

export const haalFlexpoolShifts = async (flexpoolId: string) => {
  try {
    await connectToDB();

    // Zoek de flexpool op basis van het gegeven ID
    const flexpool = await Flexpool.findById(flexpoolId);
    if (!flexpool) {
      throw new Error('Flexpool niet gevonden');
    }

    // Haal de huidige gebruiker op en zoek bijbehorende freelancer
    const user = await currentUser();
    if (!user) {
      throw new Error('Gebruiker niet gevonden');
    }

    const freelancer = await Employee.findOne({ clerkId: user.id });
    if (!freelancer) {
      throw new Error('Freelancer niet gevonden');
    }

    const freelancerId = freelancer._id;

    // Zoek ShiftArrays die voldoen aan de criteria:
    // 1. Bevatten de flexpool ID in de flexpools array
    // 2. Bevatten de freelancer ID niet in de aanmeldingen, aangenomen, of reserves arrays
    const shifts = await ShiftArray.find({
      flexpools: flexpoolId, // Flexpool aanwezig
      aanmeldingen: { $nin: [freelancerId] },
      aangenomen: { $nin: [freelancerId] },
      reserves: { $nin: [freelancerId] },
      beschikbaar: true // Optioneel: Alleen beschikbare shifts
    }).lean();

    // Zet het ObjectId om naar een string voor frontend gebruik (optioneel)
    const result = shifts.map(shift => ({
      ...shift,
      _id: shift._id.toString(),
      opdrachtgever: shift.employer.toString(),
      flexpools: shift.flexpools.map((id: any) => id.toString()),
      aanmeldingen: shift.applications.map((id: any) => id.toString()),
      aangenomen: shift.accepted.map((id: any) => id.toString()),
      reserves: shift.reserves.map((id: any) => id.toString())
    }));

    return result;

  } catch (error) {
    console.error('Error fetching flexpool shifts:', error);
    throw new Error('Failed to fetch flexpool shifts');
  }
};


export const haalFlexpools = async (bedrijfId: string): Promise<IFlexpool[]> => {
  try {
    console.log('Fetching flexpools for Bedrijf ID:', bedrijfId);

    // Fetch the Bedrijf document and populate the flexpools
    const bedrijf: IEmployer | null = await Employer.findById(bedrijfId)
      .populate('flexpools') // Populate the flexpools field
      .lean(); // Convert to plain JS objects to avoid circular references

    if (bedrijf && bedrijf.flexpools && bedrijf.flexpools.length > 0) {
      // Fetch the related Flexpool documents
      const flexpools = await Flexpool.find({ _id: { $in: bedrijf.flexpools } })
        .lean(); // Convert to plain JS objects

      console.log("Flexpools fetched successfully.");

      return flexpools;
    } else {
      console.log('No flexpools found for this Bedrijf.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching flexpools:', error);
    throw new Error('Failed to fetch flexpools');
  }
};



export const haalAlleFlexpools = async (objectIds: string[]): Promise<IFlexpool[]> => {
  try {
    await connectToDB()
    // Fetch all Flexpools matching the given array of IDs
    const flexpools: IFlexpool[] = await Flexpool.find({ _id: { $in: objectIds } });
    if (flexpools.length > 0) {
      return flexpools;
    } else {
      console.log('No flexpools found for the provided IDs.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching flexpools:', error);
    throw new Error('Failed to fetch flexpools');
  }
};