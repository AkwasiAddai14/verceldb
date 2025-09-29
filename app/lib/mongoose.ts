import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { determineLocation } from './country';

// Load environment variables from .env file
dotenv.config();

let isConnected = false;

export const connectToDB = async () => {
    mongoose.set('strictQuery', true);

    if (!process.env.MONGODB_URL) {
        console.log("MONGODB_URL not found");
        return;
    }
    if (isConnected) {
        console.log("Already connected to MONGODB");
        return;
    }

    try {
        const connectionString = await determineLocation();
        await mongoose.connect(connectionString!);
        isConnected = true;
        console.log("Connected to MONGODB");
    } catch (error) {
        console.log("Error connecting to MONGODB:", error);
    }
};
