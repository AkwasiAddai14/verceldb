"use server"

import { connectToDB } from "../mongoose";
import Employee, { IEmployee } from "../models/employee.model";
import { currentUser } from "@clerk/nextjs/server";
import mongoose, { SortOrder } from "mongoose";



type Experience = {
    bedrijf: string;
    functie: string;
    duur: string;
  };
  
  type Skills = {
    vaardigheid: string;
  };
  
  type Education = {
    naam: string;
    school: string;
    niveau?: string;
  };
  
  type Employee = {
    clerkId: string;
    firstname: string;
    infix?: string;
    lastname: string;
    country: string;
    dateOfBirth: Date;
    email?: string;
    phone?: string;
    postcode: string;
    housenumber: string;
    street: string;
    city: string;
    onboarded: boolean;
    taxBenefit?: boolean;
    SalaryTaxDiscount?: boolean;
    VATidnr?: string;
    iban: string;
    bio?: string;
    companyRegistrationNumber?: string;
    profilephoto?: any;
    experience?: Experience[];
    skills?: Skills[];
    education?: Education[];
    SocialSecurity?: string; // Ensure bsn is included as it is required in the schema
  };


export const createEmployee = async (user:Employee) => {
    try {
      const newEmployee = await Employee.create(user);
      await Employee.findOneAndUpdate({clerkId: user.clerkId}, {
        onboarded:false
      },
      {
        upsert:true, new: true 
      });
      
        return JSON.parse(JSON.stringify(newEmployee))
        
        } 
    catch (error: any) {
          throw new Error(`Failed to create or update user: ${error.message}`);
      }
}


export const updateFreelancer = async  (user: Employee ) => {

    try {
         const newEmployee = await Employee.create(user);
      await Employee.findOneAndUpdate({clerkId: user.clerkId}, {
        onboarded:false
      },
      {
        upsert:true, new: true 
      });
      
        //return JSON.parse(JSON.stringify(newEmployee))
        
        return { success: true, message: 'Freelancer successfully updated.' };
    } catch (error) {
        console.error('Error updating freelancer:', error);
        throw new Error('Error updating freelancer');
    }
    
   } 

export const checkOnboardingStatusEmployee = async (clerkId:string) => {
  try {
    await connectToDB();
   
    const employee = await Employee.findOne({clerkId: clerkId})
    
     return employee?.onboarded ?? null;
  } catch (error) {
    console.error('failed to find stauts:', error);
    throw new Error('Failed to find status');
  }
};

export async function verwijderFreelancer(clerkId: string): Promise<Employee | null> {
  try {
      const deletedFreelancer = await Employee.findOneAndDelete({ clerkId: clerkId });
      if (!deletedFreelancer) {
          throw new Error('Freelancer not found');
      }
      return deletedFreelancer;
  } catch (error) {
      console.error('Error deleting freelancer:', error);
      throw new Error('Error deleting freelancer');
  }
}

export const haalFreelancerVoorCheckout = async (id: string) => {
try {
  await connectToDB();
  const freelancer = await Employee.findById(id).lean();
  return freelancer;
} catch (error:any) {
  console.error('Error retrieving freelancers:', error);
  throw new Error('Error retrieving freelancers');
}
}

export const haalFreelancer = async (clerkId: string): Promise<IEmployee | null> => {
  try {
    await connectToDB();

    let freelancer: IEmployee | null = null;

    if (mongoose.Types.ObjectId.isValid(clerkId)) {
      freelancer = await Employee.findById(clerkId).lean() as IEmployee | null;;
    }

    if (!freelancer && clerkId) {
      freelancer = await Employee.findOne({ clerkId }).lean() as IEmployee | null;;
    }

    if (!freelancer) {
      const user = await currentUser();
      if (user) {
        freelancer = await Employee.findOne({ clerkId: user.id }).lean() as IEmployee | null;;
      } else {
        console.log("No user logged in or found!");
      }
    }

    return freelancer ?? null;
  } catch (error) {
    console.error('Error retrieving freelancer:', error);
    throw new Error('Error retrieving freelancer');
  }
};


export const haalFreelancerProfielModal = async  (Id: string) => {
try {
  await connectToDB();

  const freelancer = await Employee.findById(Id).lean();

  console.log(freelancer)
    return freelancer;
    
} catch (error) {
    console.error('Error retrieving freelancers:', error);
    throw new Error('Error retrieving freelancers');
}
}

export const haalFreelancerVoorAdres = async  (clerkId: string) => {
try {
  const CurrentUser = await currentUser();
const metadata = CurrentUser?.unsafeMetadata.country
//connectToDB();
  await connectToDB();
  let freelancer;
  if(mongoose.Types.ObjectId.isValid(clerkId)){
    freelancer = await Employee.findById(clerkId);
  }
  if (clerkId.toString() !== ""){
    freelancer = await Employee.findOne({clerkId: clerkId});
  } else {
    const user = await currentUser();
    if (user) {
      freelancer = await Employee.findOne({clerkId: user!.id});
    }
    else {
      console.log("No user logged in or found!")
    }
  }
  console.log(freelancer)
    return freelancer.toObject();
} catch (error) {
    console.error('Error retrieving freelancers:', error);
    throw new Error('Error retrieving freelancers');
}
}

export const haalFreelancerFlexpool = async  (clerkId: string) => {
  
try {
    const freelancer = await Employee.findById(clerkId);
    return freelancer;
} catch (error) {
    console.error('Error retrieving freelancers:', error);
    throw new Error('Error retrieving freelancers');
}
}

export const haalFreelancers = async ({
  clerkId,
  searchString ="",
  pageNumber = 1,
  pageSize = 40,
  sortBy = "desc"
} : {
  clerkId: string,
  searchString?: string,
  pageNumber?: number,
  pageSize?: number,
  sortBy?: SortOrder; 
}) =>{ 
  try {
      // Build the search query
      const query = {
          $and: [
              { clerkId: { $ne: clerkId } }, // Exclude the provided clerkId
              {
                  $or: [
                      { voornaam: new RegExp(searchString, 'i') },
                      { achternaam: new RegExp(searchString, 'i') },
                      { emailadres: new RegExp(searchString, 'i') }
                  ]
              }
          ]
      };

      // Calculate the number of documents to skip for pagination
      const skipDocuments = (pageNumber - 1) * pageSize;

      // Execute the query with pagination and sorting
      const freelancers = await Employee.find(query)
          .sort({ voornaam: sortBy })
          .skip(skipDocuments)
          .limit(pageSize);

      // Get the total number of documents that match the query
      const totalFreelancers = await Employee.countDocuments(query);

      // Return the result with pagination info
      return {
          freelancers,
          totalFreelancers,
          totalPages: Math.ceil(totalFreelancers / pageSize),
          currentPage: pageNumber
      };
  } catch (error) {
      console.error('Error retrieving freelancers:', error);
      throw new Error('Error retrieving freelancers');
  }
};



export const haalAlleFreelancers = async (): Promise<Employee[]> => {
  try {
      await connectToDB();
      const opdrachtnemers = await Employee.find();
      
      console.log(opdrachtnemers)
      return opdrachtnemers || []; // Return an array with 'naam' property
  } catch (error) {
      console.error('Error fetching freelancers:', error);
      throw new Error('Failed to fetch freelancers');
  }
};

export const updateKorregeling = async (clerkId: string, value: any) => {
  try {
      const freelancer = await Employee.findOneAndUpdate({clerkId : clerkId}
          ,{ korregeling: value, },
{ new: true, runValidators: true });

  if (!freelancer) {
    throw new Error('Freelancer not found');
  }

  return freelancer;  // Return the updated freelancer object
} catch (error) {
  console.error('Error updating freelancer:', error);
  throw new Error('Failed to update freelancer');
}
} 
export const updateBio = async (clerkId: string, value: any) => {
  try {
      const freelancer = await Employee.findOneAndUpdate({clerkId : clerkId}
          ,{ bio: value, },
{ new: true, runValidators: true });

  if (!freelancer) {
    throw new Error('Freelancer not found');
  }

  return freelancer;  // Return the updated freelancer object
} catch (error) {
  console.error('Error updating freelancer:', error);
  throw new Error('Failed to update freelancer');
}
} 
export const updateWerkervaring = async (clerkId: string, value: any) => {
  try {
      const freelancer = await Employee.findOneAndUpdate(
          { clerkId: clerkId },  // Find freelancer by clerkId
          { 
            $addToSet: { werkervaring: value }  // Properly wrap $addToSet inside an object
          },
          { 
            new: true,  // Return the updated document
            runValidators: true  // Ensure schema validation is run
          }
        );

  if (!freelancer) {
    throw new Error('Freelancer not found');
  }

  return freelancer;  // Return the updated freelancer object
} catch (error) {
  console.error('Error updating freelancer:', error);
  throw new Error('Failed to update freelancer');
}
}
export const updateOpleiding = async (clerkId: string, value: any) => {
  try {
      const freelancer = await Employee.findOneAndUpdate(
          { clerkId: clerkId },  // Find freelancer by clerkId
          { 
            $addToSet: { opleidingen: value }  // Properly wrap $addToSet inside an object
          },
          { 
            new: true,  // Return the updated document
            runValidators: true  // Ensure schema validation is run
          }
        );

  if (!freelancer) {
    throw new Error('Freelancer not found');
  }

  return freelancer;  // Return the updated freelancer object
} catch (error) {
  console.error('Error updating freelancer:', error);
  throw new Error('Failed to update freelancer');
}
} 
export const updateProfielfoto  = async (clerkId: string, value: any) => {
  try {
      const freelancer = await Employee.findOneAndUpdate({clerkId : clerkId},
          
          { profielfoto: value, },
          { new: true, runValidators: true }
          
          );

  if (!freelancer) {
    throw new Error('Freelancer not found');
  }

  return freelancer;  // Return the updated freelancer object
} catch (error) {
  console.error('Error updating freelancer:', error);
  throw new Error('Failed to update freelancer');
}
}
export const updateAdres = async (clerkId: string, value: any) => {
  try {
      const freelancer = await Employee.findOneAndUpdate({clerkId : clerkId},
          
          { 
            straatnaam: value[0],
            huisnummer: value[1]
          },
          { new: true, runValidators: true }

);

  if (!freelancer) {
    throw new Error('Freelancer not found');
  }

  return freelancer;  // Return the updated freelancer object
} catch (error) {
  console.error('Error updating freelancer:', error);
  throw new Error('Failed to update freelancer');
}
} 
export const updateTelefoonnummer = async (clerkId: string, value: any) => {
  try {
      const freelancer = await Employee.findOneAndUpdate({clerkId : clerkId},
          { telefoonnummer: value, },
{ new: true, runValidators: true });

  if (!freelancer) {
    throw new Error('Freelancer not found');
  }

  return freelancer;  // Return the updated freelancer object
} catch (error) {
  console.error('Error updating freelancer:', error);
  throw new Error('Failed to update freelancer');
}
} 