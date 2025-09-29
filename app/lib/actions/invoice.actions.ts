"use server"

import  mongoose, { Document, Types } from 'mongoose';
import PDFDocument from 'pdfkit'
import nodemailer from 'nodemailer';
import { Options } from 'nodemailer/lib/mailer';
import fs from 'fs';
import path from 'path';
import Factuur from '../models/invoice.model';
import cron from 'node-cron';
import { connectToDB } from '../mongoose';
import Shift, { ShiftType } from '../models/shift.model';
import { getWeek } from 'date-fns'; // Assuming you have date-fns installed
import Employee, { IEmployee } from '../models/employee.model';
import Bedrijf from '../models/employer.model';
import { currentUser } from '@clerk/nextjs/server';






export async function createFacturenForAllFreelancers() {
    try {
        const freelancers = await Employee.find(); // Fetch all freelancers

        for (const freelancer of freelancers) {
            // Fetch the shifts with the status 'checkout geaccepteerd' for this freelancer
            const shifts = await Shift.find({
                _id: { $in: freelancer.checkouts },
                status: 'checkout geaccepteerd',
            }).select('_id');

            if (shifts.length > 0) {
                // Call the function to create an invoice for this freelancer
                const shiftObjectIds = shifts.map((shift) => new Types.ObjectId(shift._id));
                await createFactuurForFreelancer({
                    freelancerId: freelancer._id,
                    shifts: shiftObjectIds,
                });
            }
        }

        console.log('Facturen created for all freelancers.');
    } catch (error) {
        console.error('Error creating facturen for freelancers:', error);
    }
}



interface CreateFactuurParamsFreelancer {
    freelancerId: mongoose.Types.ObjectId;
    shifts: mongoose.Types.ObjectId[];
}

export const createFactuurForFreelancer = async ({ freelancerId, shifts }: CreateFactuurParamsFreelancer) => {
    try {
        // Get the current week number
        const currentWeek = getWeek(new Date());

        // Create a new Factuur instance
        const newFactuur = new Factuur({
            week: currentWeek.toString(),
            shifts: shifts,
            opdrachtnemers: [freelancerId],
            werkdatum: new Date().toLocaleDateString(), // Set the current date as werkdatum
            tijd: new Date().toLocaleTimeString(), // Set the current time
            totaalbedrag: await calculateTotalAmountFreelancer(shifts), // Function to calculate total amount
        });

        await newFactuur.save();

        console.log(`Factuur created for freelancer with ID ${freelancerId} for week ${currentWeek}`);
    } catch (error: any) {
        throw new Error(`Failed to create factuur: ${error.message}`);
    }
};

// Helper function to calculate the total amount based on shifts
const calculateTotalAmountFreelancer = async (shifts: mongoose.Types.ObjectId[]): Promise<string> => {
    let totaalBedrag = 0;

    // Iterate through each shift to calculate the total amount
    for (const shiftId of shifts) {
        // Find the shift by its ObjectId
        const shift = await Shift.findById(shiftId) as ShiftType;

        if (shift) {
            const { checkoutstarting, checkoutending, checkoutpauze, hourlyRate } = shift;

            // Parse the times to calculate the duration worked
            const begintijd = new Date(`1970-01-01T${checkoutstarting}:00Z`);
            const eindtijd = new Date(`1970-01-01T${checkoutending}:00Z`);
            const pauzeInMinutes = checkoutpauze ? parseInt(checkoutpauze, 10) : 0;

            // Calculate the total time worked in hours, subtracting the pause time
            const timeWorkedInHours = (eindtijd.getTime() - begintijd.getTime()) / (1000 * 60 * 60) - (pauzeInMinutes / 60);

            // Calculate the amount for this shift
            const shiftAmount = timeWorkedInHours * hourlyRate * 1.21;

            // Add the shift amount to the total
            totaalBedrag += shiftAmount;
            shift.totaalAmount = totaalBedrag;
            shift.status = 'afgerond';
            await shift.save();
        }
    }
    
    // Return the total amount as a string formatted to two decimal places
    return totaalBedrag.toFixed(2);
};

export const processCheckoutsForAllFreelancers = async () => {
    try {
        await connectToDB(); // Ensure you are connected to MongoDB

        // Get all freelancers
        const freelancers = await Employee.find().populate('checkouts');

        // Iterate through each freelancer
        for (const freelancer of freelancers) {
            // Filter checkouts with status 'checkout geaccepteerd'
            const acceptedCheckouts = freelancer.checkouts.filter(
                (checkout: any) => checkout.status === 'checkout geaccepteerd'
            );

            if (acceptedCheckouts.length > 0) {
                // Extract the shift IDs from accepted checkouts
                const shiftIds = acceptedCheckouts.map((checkout: any) => checkout._id);

                // Create a new factuur for the freelancer
                await createFactuurForFreelancer({
                    freelancerId: freelancer._id,
                    shifts: shiftIds,
                });

                // Optionally, remove these checkouts from the freelancer's array
                freelancer.checkouts = freelancer.checkouts.filter(
                    (checkout: any) => checkout.status !== 'checkout geaccepteerd'
                );

                // Save the updated freelancer document
                await freelancer.save();
            }
        }

        console.log('Processed all freelancers for checkout geaccepteerd shifts.');
    } catch (error: any) {
        throw new Error(`Failed to process checkouts: ${error.message}`);
    }
};



interface CreateFactuurParamsBedrijf {
    bedrijfId: mongoose.Types.ObjectId;
    shifts: mongoose.Types.ObjectId[];
}

export async function createFacturenForAllBedrijven() {
    try {
        const bedrijven = await Bedrijf.find(); // Fetch all bedrijven

        for (const bedrijf of bedrijven) {
            const bedrijfId = bedrijf._id as Types.ObjectId; // Ensure _id is treated as an ObjectId

            // Fetch the shifts associated with this bedrijf
            const shifts = await Shift.find({_id: { $in: bedrijf.checkouts },
                status: 'checkout geaccepteerd',}).select('_id').exec(); // Get shifts linked to this bedrijf

            if (shifts.length > 0) {
                await createFactuurForBedrijf({ 
                    bedrijfId, 
                    shifts: shifts.map(shift => shift._id as unknown as Types.ObjectId)  // Ensure shift._id is treated as an ObjectId
                });
            } else {
                console.log(`No shifts found for bedrijf with ID ${bedrijfId}`);
            }
        }

        console.log('Facturen created for all bedrijven.');
    } catch (error) {
        console.error('Error creating facturen for bedrijven:', error);
    }
}

export const createFactuurForBedrijf = async ({ bedrijfId, shifts }: CreateFactuurParamsBedrijf) => {
    try {
        // Get the current week number
        const currentWeek = getWeek(new Date());

        // Create a new Factuur instance
        const newFactuur = new Factuur({
            week: currentWeek.toString(),
            shifts: shifts,
            opdrachtgever: [bedrijfId],
            werkdatum: new Date().toLocaleDateString(), // Set the current date as werkdatum
            tijd: new Date().toLocaleTimeString(), // Set the current time
            totaalbedrag: await calculateTotalAmountBedrijf(shifts), // Function to calculate total amount
        });

        await newFactuur.save();

        console.log(`Factuur created for bedrijf with ID ${bedrijfId} for week ${currentWeek}`);
    } catch (error: any) {
        throw new Error(`Failed to create factuur: ${error.message}`);
    }
};

// Helper function to calculate the total amount based on shifts
const calculateTotalAmountBedrijf = async (shifts: mongoose.Types.ObjectId[]): Promise<number> => {
    let totaalBedrag = 0;

    for (const shiftId of shifts) {
        const shift = await Shift.findById(shiftId) as ShiftType;

        if (shift) {
            const { checkoutstarting, checkoutending, checkoutpauze, hourlyRate } = shift;

            // Validate times
            if (!checkoutstarting || !checkoutending || isNaN(new Date(`1970-01-01T${checkoutstarting}:00Z`).getTime()) || isNaN(new Date(`1970-01-01T${checkoutending}:00Z`).getTime())) {
                console.error(`Invalid begintijd or eindtijd for shift ${shiftId}`);
                continue; // Skip this shift
            }

            // Parse times
            const begintijd = new Date(`1970-01-01T${checkoutstarting}:00Z`);
            const eindtijd = new Date(`1970-01-01T${checkoutending}:00Z`);

            // Validate pauze and uurtarief
            const pauzeInMinutes = isNaN(parseInt(checkoutpauze?.toString() || '0', 10)) ? 0 : parseInt(checkoutpauze?.toString() || '0', 10);
            const uurTariefValue = isNaN(parseFloat(hourlyRate?.toString() || '0')) ? 0 : parseFloat(hourlyRate?.toString() || '0');


            if (uurTariefValue <= 0) {
                console.error(`Invalid uurtarief for shift ${shiftId}`);
                continue; // Skip this shift
            }

            // Calculate the total time worked in hours
            const timeWorkedInHours = (eindtijd.getTime() - begintijd.getTime()) / (1000 * 60 * 60) - (pauzeInMinutes / 60);

            // Ensure timeWorkedInHours is not negative or NaN
            if (isNaN(timeWorkedInHours) || timeWorkedInHours <= 0) {
                console.error(`Invalid time worked for shift ${shiftId}`);
                continue;
            }

            // Calculate the amount for this shift
            const shiftAmount = timeWorkedInHours * (uurTariefValue + 2.50) * 1.21;

            // Accumulate the shift amount to the total
            totaalBedrag += shiftAmount;
        }
    }

    // Return the total amount as a number
    return parseFloat(totaalBedrag.toFixed(2));
};




export const processCheckoutsForAllBedrijven = async () => {
    try {
        await connectToDB(); // Ensure you are connected to MongoDB

        // Get all bedrijven
        const bedrijven = await Bedrijf.find().populate('checkouts');

        // Iterate through each bedrijf
        for (const bedrijf of bedrijven) {
            // Filter checkouts with status 'checkout geaccepteerd'
            const acceptedCheckouts = bedrijf.checkouts.filter(
                (checkout: any) => checkout.status === 'checkout geaccepteerd'
            );

            if (acceptedCheckouts.length > 0) {
                // Extract the shift IDs from accepted checkouts
                const shiftIds = acceptedCheckouts.map((checkout: any) => checkout._id);

                const bedrijfId = bedrijf._id as mongoose.Types.ObjectId;
                // Create a new factuur for the bedrijf
                await createFactuurForBedrijf({
                    bedrijfId,
                    shifts: shiftIds,
                });

                // Optionally, remove these checkouts from the bedrijf's array
                bedrijf.checkouts = bedrijf.checkouts.filter(
                    (checkout: any) => checkout.status !== 'checkout geaccepteerd'
                );

                // Save the updated bedrijf document
                await bedrijf.save();
            }
        }

        console.log('Processed all bedrijven for checkout geaccepteerd shifts.');
    } catch (error: any) {
        throw new Error(`Failed to process checkouts: ${error.message}`);
    }
};


interface FactuurParams {
    shiftId: string;
}

export async function maakFactuur({ shiftId }: FactuurParams) {
    try {
        // Fetch checkout information
        const checkout = await Shift.findOne({ shift: shiftId })
        .populate('opdrachtgever')
        .populate('opdrachtnemer')
            

        if (!checkout) {
            throw new Error(`Checkout not found for shift ID: ${shiftId}`);
        }

        const opdrachtgever = checkout.employer;
        const opdrachtnemer = checkout.employee;
        
        if (opdrachtnemer && opdrachtgever) {
        // Calculate total amount to be paid
        let workedHours;
        if (checkout.starting && checkout.ending) {
             workedHours = 
              (new Date(checkout.ending).getTime() - new Date(checkout.starting).getTime()) / (1000 * 60 * 60) -
              (0 / 60);
            
          } else {
             workedHours = 
              (new Date(checkout.ending).getTime() - new Date(checkout.starting).getTime()) / (1000 * 60 * 60) -
              (0 / 60);
            console.warn("Invalid begintijd or eindtijd:", checkout.starting, checkout.ending);
          }
          const totalAmount = workedHours * checkout.hourlyRate * 1.21;

        // Create a PDF document
        const doc = new PDFDocument();

        // Define file path
        const filePath = path.join(__dirname, `../../invoices/${shiftId}.pdf`);
        doc.pipe(fs.createWriteStream(filePath));

        // Add content to the PDF
        doc.fontSize(20).text('Factuur', { align: 'center' });

        doc.moveDown();
        doc.fontSize(12).text(`Opdrachtgever:`);
        doc.text(`Naam: ${opdrachtgever.displayname}`);
        doc.text(`Adres: ${opdrachtgever.street} ${opdrachtgever.housenumber}, ${opdrachtgever.city}`);
        doc.text(`KVK Nummer: ${opdrachtgever.CompanyRegistrationNumber}`);

        /* if (opdrachtnemer && 'btwid' in opdrachtnemer) {
            doc.moveDown();
            doc.text(`Opdrachtnemer:`);
            doc.text(`Naam: ${opdrachtnemer.firstname} ${opdrachtnemer.lastname}`);
            doc.text(`Adres: ${opdrachtnemer.street} ${opdrachtnemer.housenumber}, ${opdrachtnemer.city}`);
            doc.text(`IBAN: ${opdrachtnemer.iban}`);
            doc.text(`BTW Nummer: ${opdrachtnemer.btwid}`);
        } else {
            // Handle the case where opdrachtnemer is just an ObjectId or is undefined
            doc.text(`Opdrachtnemer information is not fully populated.`);
        } */

        doc.moveDown();
        doc.text(`Shift Details:`);
        doc.text(`Titel: ${checkout.title}`);
        doc.text(`Begintijd: ${checkout.starting}`);
        doc.text(`Eindtijd: ${checkout.ending}`);
        doc.text(`Pauze: ${checkout.break || 0} minuten`);
        doc.text(`Uurtarief: ${checkout.hourlyRate}`)
        doc.text("BTW-tarief: 21%")

        doc.moveDown();
        doc.fontSize(14).text(`Te ontvangen bedrag: €${totalAmount.toFixed(2)}`, { align: 'right' });

        // Finalize the PDF and end the stream
        doc.end();

        console.log('Invoice created successfully.');
    }  else {
        throw new Error('Opdrachtgever or opdrachtnemer is missing, cannot create invoice.');
    } 
} catch (error: any) {
    throw new Error(`Failed to create invoice: ${error.message}`);
}
}



// Define an interface representing the document in MongoDB
interface CheckoutDoc extends Document {
    opdrachtgever: Types.ObjectId;
    opdrachtnemer: Types.ObjectId;
    shift: Types.ObjectId;
    titel: string;
    afbeelding: string;
    uurtarief: number;
    datum: Date;
    begintijd: Date;
    eindtijd: Date;
    pauze?: number;
    feedback?: string;
    opmerking?: string;
}

export async function maakFacturen() {
    try {
        await connectToDB();

        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1));
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const checkouts = await Shift.find({
            status: false,
            datum: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('opdrachtgever opdrachtnemer');

        const checkoutsByBusiness: Record<string, CheckoutDoc[]> = {};
        checkouts.forEach(checkout => {
            const bedrijfID = checkout.employer.toString();
            if (!checkoutsByBusiness[bedrijfID]) {
                checkoutsByBusiness[bedrijfID] = [];
            }
            /* checkoutsByBusiness[bedrijfID].push(checkout) */;
        });

        for (const bedrijfID in checkoutsByBusiness) {
            const checkoutsForBusiness = checkoutsByBusiness[bedrijfID];

            const factuurData = {
                shift: checkoutsForBusiness.map(checkout => checkout.shift),
                opdrachtgever: checkoutsForBusiness.map(checkout => checkout.opdrachtgever),
                opdrachtnemer: new Types.ObjectId(bedrijfID),
                datum: new Date(),
                tijd: '...', // Replace with actual time data
                werktijden: '...', // Replace with actual work hours data
                werkdatum: '...', // Replace with actual work date data
                pauze: checkoutsForBusiness.reduce((acc, checkout) => acc + (checkout.pauze || 0), 0)
            };
            const factuur = new Factuur(factuurData);
            await factuur.save();

            await Shift.updateMany(
                { _id: { $in: checkoutsForBusiness.map(checkout => checkout._id) } },
                { $set: { status: true } }
            );
        }
    } catch (error: any) {
        console.error('Error creating bundled invoices:', error);
        throw new Error(`Failed to create bundled invoices: ${error.message}`);
    }
}


export async function haalFacturen(id: string) {
    try {
        // Find all facturen
        const facturen = await Factuur.find({
            opdrachtgever: { $in: [id] }  // Checks if the id is within the opdrachtgever array
        })
        
        return facturen;
    } catch (error:any) {
        console.error('Error retrieving facturen:', error);
        throw new Error(`Failed to retrieve facturen: ${error.message}`);
    }
}

export async function haalFacturenFreelancer(id: string) {
    try {
        await connectToDB();
        const facturen = await Factuur.find({
            opdrachtnemers: { $in: [id] }  // Checks if the id is within the opdrachtgever array
        })
        return facturen;
    } catch (error: any) {
        console.error('Error retrieving facturen:', error);
        throw new Error(`Failed to retrieve facturen: ${error.message}`);
    }
}

export const haalFactuurShifts = async (id:string) => {
    try {
        await connectToDB();
        const factuur = await Factuur.findById(id)
        if(factuur){
          const shifts = await Shift.find({_id: {$in: factuur.shifts}})
          return shifts;
        }
      } catch (error:any) {
        throw new Error(`Failed to find shift: ${error.message}`);
      }
}

export async function haalAfgerondeShifts(clerkId: string){
    try{
        const freelancer = await Employee.findOne({clerkId: clerkId})

        const shifts = await Shift.find(
            {opdrachtnemer: freelancer._id},
            { status: 'afgerond'}
        )

        return shifts;
    } catch (error: any) {
        console.error('Error retrieving shifts:', error);
        throw new Error(`Failed to retrieve shifts: ${error.message}`);
    }
};

export async function haalInShiftsFacturen(factuurId: any){
    try {
        const factuur = await Factuur.findById(factuurId);
        const shiftIds = factuur.shifts;

        const shifts = await Shift.find({ _id: { $in: shiftIds } });
        return shifts;
    } catch (error) {
        
    }
};

export async function haalFactuur (id: string){
    try{

        await connectToDB()
        const factuur = await Factuur.findById(id).lean();
        console.log(factuur);
        return factuur;
    } catch (error: any) {

        console.error('Error retrieving facturen:', error);
        throw new Error(`Failed to retrieve facturen: ${error.message}`);

    }
    
}


interface VerstuurFactuurParams {
    shiftId: string;
}

export async function verstuurFactuur({ shiftId }: VerstuurFactuurParams) {

// Get today's date
const today = new Date();
// Check if today is Friday
if (today.getDay() === 5) { // Friday is day number 5 (0 is Sunday, 1 is Monday, ..., 6 is Saturday)
    try {
        // Generate the invoice PDF
        const filePath = await maakFactuur({ shiftId });

        // Fetch checkout information
        const checkout = await Shift.findOne({ shift: shiftId })
            .populate('opdrachtgever')
            .populate('opdrachtnemer')
            

        if (!checkout) {
            throw new Error(`Checkout not found for shift ID: ${shiftId}`);
        }

        const opdrachtnemer = checkout.employee;
       

        // Create a transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.example.com', // Replace with your SMTP server
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: 'your_email@example.com', // Replace with your email
                pass: 'your_email_password' // Replace with your email password
            }
        });


        if (!opdrachtnemer ) {
            throw new Error('Opdrachtnemer is missing, cannot create invoice.');
        }
        // Adjust the mailOptions object to ensure proper typing
        if ('email' in opdrachtnemer) {
            // Adjust the mailOptions object to ensure proper typing
            const mailOptions: Options = {
                from: '"Your Company" <your_email@example.com>', // Replace with your email
                to: opdrachtnemer.email, // Freelancer's email
                subject: `Invoice for Shift: ${checkout.title} on ${checkout.startingDate}`,
                text: 'Please find attached the invoice for your recent shift.',
                attachments: [
                    {
                        filename: `invoice-${shiftId}.pdf`,
                        path: filePath as unknown as string, // Ensure filePath is a string
                        contentType: 'application/pdf'
                    }
                ]
            };

        // Send email
        await transporter.sendMail(mailOptions);

        console.log('Invoice sent successfully.');
    } else {
        throw new Error('Opdrachtnemer details are incomplete, cannot create invoice.');
    }
} catch (error: any){
    console.log(error)
}
}
}

/* async function createInvoice(data: { to: any; from: any; total: any; toEmail: any; }) {
    // Load the existing PDF template
    const existingPdfBytes = fs.readFileSync('Invoice_junter.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Draw text fields
    firstPage.drawText(data.to, { x: 50, y: 700, size: 12, color: rgb(0, 0, 0) });
    firstPage.drawText(data.from, { x: 50, y: 680, size: 12, color: rgb(0, 0, 0) });
    firstPage.drawText(data.total, { x: 450, y: 150, size: 12, color: rgb(0, 0, 0) });

    // Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();

    // Save the modified PDF
    fs.writeFileSync('Invoice_generated.pdf', pdfBytes);

    // Send the invoice via email
    sendInvoiceEmail(data.toEmail, 'Invoice_generated.pdf');
} */

function sendInvoiceEmail(toEmail: any, filePath: string) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com',
            pass: 'your-email-password',
        },
    });

    let mailOptions = {
        from: 'your-email@gmail.com',
        to: toEmail,
        subject: 'Your Invoice',
        text: 'Please find attached your invoice.',
        attachments: [
            {
                filename: 'Invoice_generated.pdf',
                path: filePath,
            },
        ],
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

// Example data
const invoiceData = {
    to: 'Junter Company',
    from: 'Your Company',
    total: '$3900',
    toEmail: 'client@example.com',
};

/* createInvoice(invoiceData); */

cron.schedule('0 1 * * 4', async () => {
    try {
        console.log('Running scheduled tasks for creating facturen...');

        // Create facturen for all freelancers
        await createFacturenForAllFreelancers();

        // Create facturen for all bedrijven
        await createFacturenForAllBedrijven();

        console.log('Scheduled tasks completed successfully.');
    } catch (error) {
        console.error('Error running scheduled tasks:', error);
    }
}, {
    timezone: "Europe/Amsterdam" // Adjust timezone as per your requirement
});

cron.schedule('0 1 * * 5', async () => {
    try {
        console.log('Running scheduled tasks for creating facturen...');

        // Create facturen for all freelancers
        await createFacturenForAllFreelancers();

        // Create facturen for all bedrijven
        await createFacturenForAllBedrijven();

        console.log('Scheduled tasks completed successfully.');
    } catch (error) {
        console.error('Error running scheduled tasks:', error);
    }
}, {
    timezone: "Europe/Amsterdam" // Adjust timezone as per your requirement
});

export const cloudFactuur = async () => {
    cron.schedule('0 1 * * 4', async () => {
        try {
            console.log('Running scheduled tasks for creating facturen...');
    
            // Create facturen for all freelancers
            await createFacturenForAllFreelancers();
    
            // Create facturen for all bedrijven
            await createFacturenForAllBedrijven();
    
            console.log('Scheduled tasks completed successfully.');
        } catch (error) {
            console.error('Error running scheduled tasks:', error);
        }
    }, {
        timezone: "Europe/Amsterdam" // Adjust timezone as per your requirement
    });
    
    cron.schedule('0 1 * * 5', async () => {
        try {
            console.log('Running scheduled tasks for creating facturen...');
    
            // Create facturen for all freelancers
            await createFacturenForAllFreelancers();
    
            // Create facturen for all bedrijven
            await createFacturenForAllBedrijven();
    
            console.log('Scheduled tasks completed successfully.');
        } catch (error) {
            console.error('Error running scheduled tasks:', error);
        }
    }, {
        timezone: "Europe/Amsterdam" // Adjust timezone as per your requirement
    });
}

export const cloudFacturen = async () => {
    await createFacturenForAllFreelancers();
    await createFacturenForAllBedrijven();
}