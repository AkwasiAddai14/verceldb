"use server"

import { connectToDB } from "../mongoose";
import cron from 'node-cron';
import Shift from '../models/shift.model';
import Employer from "../models/employer.model";
import Employee, { IEmployee } from "../models/employee.model";
import mongoose, { Types } from "mongoose";
import  { sendEmailBasedOnStatus }  from '@/app/lib/actions/shift.actions'
import { currentUser } from "@clerk/nextjs/server";

export async function updateShiftsAndMoveToCheckout() {
  try {
    await connectToDB();

    // Step 1: Find shifts with the status 'aangenomen'
    const shifts = await Shift.find({ status: 'aangenomen' });

    const currentTime = new Date();

    for (const shift of shifts) {
      const shiftStartDateTime = new Date(shift.startingDate);
      const [hours, minutes] = shift.starting.split(':').map(Number);
      shiftStartDateTime.setHours(hours, minutes, 0, 0);

      const timeDifference = currentTime.getTime() - shiftStartDateTime.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);

      if (hoursDifference >= 1) {
        // Step 2: Change status to 'voltooi checkout'
        shift.status = 'voltooi checkout';

        // Step 3: Find the freelancer associated with the shift
        const freelancer = await Employee.findById(shift.employer) as IEmployee;
        if (!freelancer) {
          throw new Error(`Freelancer with ID ${shift.employer} not found`);
        }

        // Step 4: Remove the shift from the freelancer's shifts array
        freelancer.shifts = freelancer.shifts.filter((s) => (s as unknown as mongoose.Types.ObjectId).toString() !== shift._id.toString());

        // Step 5: Push the shift into the freelancer's checkouts array
        if (!freelancer.checkouts) {
          freelancer.checkouts = []; // Initialize the checkouts array if it doesn't exist
        }
        freelancer.checkouts.push(shift._id as unknown as mongoose.Types.ObjectId);

        // Send an email notification
        await sendEmailBasedOnStatus(freelancer.email as string, shift, 'voltooi checkout', freelancer, shift.employer);

        // Step 6: Save the updated shift and freelancer
        await shift.save();
        await freelancer.save();
      }
    }

    return { success: true, message: "Shifts successfully updated and moved to checkout where applicable" };
  } catch (error: any) {
    throw new Error(`Failed to update shifts and move to checkout: ${error.message}`);
  }
}

interface CheckoutParams {
    shiftId: string;
    rating: number;
    begintijd: string;
    eindtijd: string;
    pauze?: string;
    feedback?: string;
    opmerking?: string;
    laat?: boolean; 
}


export const vulCheckout = async ({ shiftId, rating, begintijd, eindtijd, pauze, feedback, opmerking }: CheckoutParams) => {
    try {
      await connectToDB();
        // Find and update the checkout shift document directly
        const checkout = await Shift.findById(shiftId);

        if (!checkout) {
            throw new Error(`Checkout not found for shift ID: ${shiftId}`);
        }

        // Update the fields in checkout object directly, then save it
        if (rating !== undefined) checkout.ratingEmployer = rating;
        if (begintijd !== undefined) checkout.checkoutstarting = begintijd;
        if (eindtijd !== undefined) checkout.checkoutending = eindtijd;
        if (pauze !== undefined) checkout.checkoutpauze = pauze /* as unknown as number */;
        if (feedback !== undefined) checkout.feedback = feedback;
        if (opmerking !== undefined) checkout.remark = opmerking;
        checkout.status = "checkout ingevuld";

        // Save the updated checkout document
        await checkout.save({ validateModifiedOnly: true });

        // Update the opdrachtgever rating
        const opdrachtgever = await Employer.findById(checkout.employer);
        if (opdrachtgever) {
            const allRatings = await Shift.find({ opdrachtgever: opdrachtgever._id }).select('ratingBedrijf');
            const validRatings = allRatings.map(shift => shift.ratingEmployer).filter(r => r !== undefined) as number[];
            const averageRating = validRatings.length ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length : 0;

            opdrachtgever.checkouts.push(new mongoose.Types.ObjectId(checkout._id));
            opdrachtgever.rating = averageRating;
            await opdrachtgever.save();
        }

        console.log('Checkout fields updated successfully.');
        return { success: true, message: "Checkout fields updated successfully." };
    } catch (error: any) {
        console.error(`Failed to update checkout: ${error.message}`);
        throw new Error(`Failed to update checkout: ${error.message}`);
    }
};



export const accepteerCheckout = async ({
  shiftId,
  rating,
  feedback,
  laat,
}: {
  shiftId: string;
  rating: number;
  feedback: string;
  laat: boolean;
}) => {
  try {
    // Fetch the shift document and check for existence
    const shift = await Shift.findById(shiftId).populate("opdrachtnemer opdrachtgever");
    if (!shift) {
      throw new Error(`Shift not found for ID: ${shiftId}`);
    }

    // Update shift feedback and status
    shift.feedback = feedback;
    shift.status = "checkout geaccepteerd";
    await shift.save();

    const opdrachtnemerId = shift.employee;
    const opdrachtgeverId = shift.employer;

    // Fetch the freelancer document
    const freelancer = await Employee.findById(opdrachtnemerId);
    if (!freelancer) {
      throw new Error(`Freelancer not found for ID: ${opdrachtnemerId}`);
    }

    // Update Freelancer's rating
    const currentRating = freelancer.rating || 5;
    const totalRatings = freelancer.ratingCount || 0;

    const newTotalRating = currentRating * totalRatings + rating;
    const newRatingCount = totalRatings + 1;
    const newAverageRating = newTotalRating / newRatingCount;

    // Handle lateness (decrease punctuality if `laat` is true)
    let punctualityDecrease = 0;
    if (laat) {
      punctualityDecrease = (1 / newRatingCount) * 100;
      freelancer.punctualiteit = Math.max(0, freelancer.punctualiteit - punctualityDecrease); // Prevent negative punctuality
    }

    // Atomic update for rating, rating count, and punctuality
    await Employee.updateOne(
      { _id: opdrachtnemerId },
      {
        $set: {
          rating: newAverageRating,
          punctualiteit: freelancer.punctualiteit,
        },
        $inc: {
          ratingCount: 1,
        },
      }
    );

    // Optional: Update shifts status in `Bedrijf` if needed (commented out based on your code)
    /*
    await Bedrijf.updateOne(
      { _id: opdrachtgeverId, "shifts.shift": shiftId },
      { $set: { "shifts.$.status": "checkout geaccepteerd" } }
    );
    */

    // Send email notification after successful updates
    await sendEmailBasedOnStatus(freelancer.email as string,
      shift,
      "checkout geaccepteerd",
      " ",
      " ",
      );

    console.log("Checkout accepted successfully.");
    return { success: true, message: "Checkout fields updated successfully." };
  } catch (error: any) {
    throw new Error(`Failed to accept checkout: ${error.message}`);
  }
};

export const weigerCheckout = async ({ shiftId, rating, begintijd, eindtijd, pauze, feedback, opmerking, laat }: CheckoutParams) => {
  try {
      // Prepare the update object, setting only provided fields
      const updateFields: any = {
          status: 'Checkout geweigerd' // Set the status as 'Checkout geweigerd'
      };

      if (rating !== undefined) {
          updateFields.ratingFreelancer = rating;
      }
      if (begintijd !== undefined) {
          updateFields.checkoutbegintijd = begintijd;
      }
      if (eindtijd !== undefined) {
          updateFields.checkouteindtijd = eindtijd;
      }
      if (pauze !== undefined) {
          updateFields.checkoutpauze = pauze;
      }
      if (feedback !== undefined) {
          updateFields.feedback = feedback;
      }
      if (opmerking !== undefined) {
          updateFields.opmerking = opmerking;
      }

      const shift = await Shift.findByIdAndUpdate(shiftId, updateFields, { new: true });
            if (!shift) {
               throw new Error(`Shift not found for ID: ${shiftId}`);
               }

      if (laat === true) {
        const freelancerId = shift.employer; // Assuming `opdrachtnemer` is the field for freelancer
        const freelancer = await Employee.findById(freelancerId);
  
        if (freelancer) {
          // Increment rating count
          freelancer.ratingCount += 1;
  
          // Calculate the decrease in punctuality
          const decrementValue = (1 / freelancer.ratingCount) * 100;
          freelancer.punctualiteit -= decrementValue;
  
          // Ensure punctuality does not fall below 0%
          if (freelancer.punctualiteit < 0) {
            freelancer.punctualiteit = 0;
          }
  
          // Save the updated freelancer document
          await freelancer.save();
        }
      }

      // Update the checkout document with the specified fields
      const result = await Shift.updateOne({ _id: shiftId }, { $set: updateFields });

      if (result.matchedCount === 0) {
          throw new Error(`Checkout not found for shift ID: ${shiftId}`);
      }

      console.log('Checkout geweigerd successfully.');
      return { success: true, message: "Checkout fields updated successfully." };
  } catch (error: any) {
      console.error(`Failed to weiger checkout: ${error.message}`);
      throw new Error(`Failed to weiger checkout: ${error.message}`);
  }
};


export const noShowCheckout = async ({ shiftId }: { shiftId: string }) => {
  try {
      // Find the checkout document by shiftId and update its status to 'no show'
      const checkout = await Shift.findByIdAndUpdate(
        shiftId, 
        { status: 'no show' }, // Set the status to 'no show'
        { new: true, runValidators: true } // Options to return the updated document and validate updates
      );

      if (!checkout) {
          throw new Error(`Checkout not found for shift ID: ${shiftId}`);
      }
      const freelancerId = checkout.employer; // Assuming `opdrachtnemer` is the field for freelancer
      const freelancer = await Employee.findById(freelancerId);

      if (freelancer) {
        // Calculate the decrease in punctuality
        const decrementValue = 1 / freelancer.ratingCount;
        freelancer.opkomst -= decrementValue;

        // Ensure punctuality does not fall below 0%
        if (freelancer.opkomst < 0) {
          freelancer.opkomst = 0;
        }

        // Save the updated freelancer document
        await freelancer.save();
      }

      console.log('No show checkout submitted successfully.');
      return {
        success: true,
        message: "No show checkout submitted",
      };
  } catch (error: any) {
      console.error(`Failed to submit no show checkout: ${error.message}`);
      throw new Error(`Failed to submit no show checkout: ${error.message}`);
  }
};



export const haalBedrijvenCheckouts = async (bedrijfId: string) => {
  try {
    await connectToDB();
    const bedrijf = await Employer.findById(bedrijfId)
    if(bedrijf){
      const checkouts = await Shift.find({_id: {$in: bedrijf.checkouts}, status: 'checkout ingevuld'})
      return checkouts;
    }
    else {
      const user = await currentUser();
      if(user){
        const bedrijf = await Employer.findOne({clerkId: user.id});
        if(bedrijf) {
          const checkouts = await Shift.find({_id: {$in: bedrijf.checkouts}})
          return checkouts;
        }  
      }
    }
  } catch (error:any) {
    throw new Error(`Failed to find shift: ${error.message}`);
  }
}
export const haalCheckouts = async (freelancerId: Types.ObjectId | string ) => {
  try {
    await connectToDB();
    let freelancer;
    let filteredShifts;
    if(mongoose.Types.ObjectId.isValid(freelancerId)){
      freelancer = await Employee.findById(freelancerId);
    // Case 1: If freelancerId is provided
      if (freelancer) {
        // Find shifts where the freelancer is 'opdrachtnemer' and 'status' is 'voltooi checkout'
          filteredShifts = await Shift.find({ 
          opdrachtnemer: freelancer._id,
          status: { $in: ['voltooi checkout', 'Checkout geweigerd', 'checkout geaccepteerd', 'checkout ingevuld', ] }
      });
      console.log(filteredShifts);
      return filteredShifts;
      } 
    }
      // Case 2: If freelancerId is not provided, use the logged-in user (Clerk)
      if(freelancerId.toString() !== ""){
        freelancer = await Employee.findOne({clerkId : freelancerId});
        if (freelancer) {
          // Find shifts where the logged-in freelancer is 'opdrachtnemer' and 'status' is 'voltooi checkout'
          const filteredShifts = await Shift.find({ opdrachtnemer: freelancer._id,
            status: { $in: ['voltooi checkout', 'Checkout geweigerd', 'checkout geaccepteerd', 'no show', 'checkout ingevuld'] }
            });
          return filteredShifts;
        } 
      } else {
        const user = await currentUser();
        if (user) {
          freelancer = await Employee.findOne({ clerkId: user.id });
          if (freelancer) {
            // Find shifts where the logged-in freelancer is 'opdrachtnemer' and 'status' is 'voltooi checkout'
            const filteredShifts = await Shift.find({ opdrachtnemer: freelancer._id,
              status: { $in: ['voltooi checkout', 'Checkout geweigerd', 'checkout geaccepteerd', 'no show', 'checkout ingevuld'] }
               });
            return filteredShifts;
          } else {
            console.log("No freelancer found for the current user");
            return [];
          }
        } else {
          console.log("Freelancer not found");
          return [];
        }
      }
    console.log("No user or freelancer found");
    return [];
  } catch (error: any) {
    throw new Error(`Failed to find shift: ${error.message}`);
  }
};

export const haalCheckoutsMetClerkId = async (clerkId: string) => {
  try {
    await connectToDB();
    const freelancer = await Employee.findOne({clerkId: clerkId})
    if (freelancer){
      const shifts = await Shift.find({
        opdrachtnemer: freelancer._id,
        status: { $in: ['voltooi checkout', 'Checkout geweigerd', 'checkout geaccepteerd', 'no show', 'checkout ingevuld'] }
        })
      console.log(shifts)
      return shifts || [];
    }
    else {
      const user = await currentUser();
        if (user) {
          const freelancer = await Employee.findOne({ clerkId: user.id });
          const checkouts = await Shift.find({
            opdrachtnemer: freelancer._id, 
            status: { $in: ['voltooi checkout', 'Checkout geweigerd', 'checkout geaccepteerd', 'no show', 'checkout ingevuld'] }
          })
          console.log(checkouts)
          return checkouts || [];
    }
  } 
} catch (error: any) {
  throw new Error(`Failed to find shift: ${error.message}`);
}
}

export const haalcheckout = async ({ shiftId }: { shiftId: string }) => {
  try {
    await connectToDB();
    const shift = await Shift.findById(shiftId).lean();
    return shift;
  } catch (error: any) {
    throw new Error(`Failed to find shift: ${error.message}`);
  }
};

export const updateNoShowCheckouts = async () => {
    try {
      // Connect to the database
      await connectToDB();
  
      // Find all freelancers
      await connectToDB();
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      // Find all shifts with status 'checkout ingevuld'
      const shifts = await Shift.find({ 
        status: 'voltooi checkout', 
        begindatum: { $lte: twoDaysAgo } 
    });
  
      if (shifts.length > 0) {
        // Iterate over all shifts and update their status to 'checkout geaccepteerd'
        for (const shift of shifts) {
          shift.status = 'no show';
          await shift.save(); // Save the updated shift
        }
      }
      console.log('All relevant checkouts updated to no show.');
    } catch (error) {
      console.error('Error updating checkouts:', error);
      throw new Error('Failed to update checkouts to no show');
    }
  };

  export const updateCheckoutStatus = async () => {
    try {
      // Ensure the DB is connected
      await connectToDB();
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      // Find all shifts with status 'checkout ingevuld'
      const shifts = await Shift.find({ 
        status: 'checkout ingevuld', 
        begindatum: { $lte: twoDaysAgo } 
    });
  
      if (shifts.length > 0) {
        // Iterate over all shifts and update their status to 'checkout geaccepteerd'
        for (const shift of shifts) {
          shift.status = 'checkout geaccepteerd';
          await shift.save(); // Save the updated shift
        }
  
        console.log(`${shifts.length} shifts updated to 'checkout geaccepteerd'`);
      } else {
        console.log('No shifts with status "checkout ingevuld" found.');
      }
    } catch (error) {
      console.error('Error updating checkout status:', error);
    }
  };

  cron.schedule('0 0 * * 4', async () => {
    try {
      console.log('Running updateNoShowCheckouts job at midnight on Wednesday');
  
      // Ensure DB is connected before running the function
      await connectToDB();
  
      // Run the function to update checkouts
      await updateNoShowCheckouts();
      await updateCheckoutStatus();
  
      console.log('Completed updateNoShowCheckouts job');
    } catch (error) {
      console.error('Error running updateNoShowCheckouts job:', error);
    }
  });

cron.schedule('0 * * * *', async () => {
    try {
      const result = await updateShiftsAndMoveToCheckout();
      console.log(result.message);
    } catch (error: any) {
      console.error('Error running updateShiftsAndMoveToCheckout:', error.message);
    }
  });

  export const cloudCheckouts1 = async () => {
    try {
      console.log('Running updateNoShowCheckouts job at midnight on Wednesday');
  
      // Ensure DB is connected before running the function
      await connectToDB();
  
      // Run the function to update checkouts
      await updateNoShowCheckouts();
      await updateCheckoutStatus();
  
      console.log('Completed updateNoShowCheckouts job');
    } catch (error) {
      console.error('Error running updateNoShowCheckouts job:', error);
    }
  }

  export const cloudCheckouts2 = async () => {
    try {
      const result = await updateShiftsAndMoveToCheckout();
      console.log(result.message);
    } catch (error: any) {
      console.error('Error running updateShiftsAndMoveToCheckout:', error.message);
    }
  }