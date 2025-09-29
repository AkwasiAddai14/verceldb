import cron from 'node-cron';
import { connectToDB } from '@/app/lib/mongoose'// Update with your DB connection path
import Employee from '@/app/lib/models/employee.model'; // Update with your Freelancer model path
import { afrondenShift } from './actions/shift.actions'; // Update with your afrondenShift function path

async function checkAndCompleteShifts() {
    try {
        await connectToDB();

        // Find all freelancers with shifts
        const freelancers = await Employee.find({ 'shifts.0': { $exists: true } });

        for (const freelancer of freelancers) {
            // Iterate through freelancer's shifts
            for (const shift of freelancer.shifts) {
                // Check only shifts with status 'aangenomen'
                if (shift.status === 'aangenomen') {
                    const now = new Date();
                    const shiftBeginTime = new Date(shift.begintijd);

                    // Check if 2 hours have passed since shift begin time
                    const timeDifference = now.getTime() - shiftBeginTime.getTime();

                    // Check if 2 hours have passed since shift begin time (2 hours = 2 * 60 * 60 * 1000 milliseconds)
                    if (timeDifference >= 2 * 60 * 60 * 1000) {
                        await afrondenShift({ shiftId: shift._id });
                    }
                }
            }
        }
    } catch (error:any) {
        console.error(`Failed to check and complete shifts: ${error.message}`);
    }
}

// Schedule the job to run every 30 minutes
cron.schedule('*/30 * * * *', () => {
    console.log('Running scheduled job to check and complete shifts');
    checkAndCompleteShifts();
});