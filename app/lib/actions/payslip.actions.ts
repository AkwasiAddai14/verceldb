'use server';

import mongoose, { Types } from 'mongoose';
import { connectToDB } from '../mongoose';
import Payslip, { IPayslip } from '@/app/lib/models/payslip.model';
import Job from '../models/job.model';

/**
 * Haal een loonstrook op met een gegeven ID.
 * @param id - Het ID van de loonstrook (string of ObjectId)
 * @returns Het loonstrookdocument of null
 */
export async function haalloonstrook(id: string | mongoose.Types.ObjectId): Promise<IPayslip | null> {
    try {
    await connectToDB();

      const objectId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
  
      const payslip = await Payslip.findById(objectId)
        .populate('employee.id')
        .populate('employer.id')
        .populate('jobs.id');
  
      return payslip;
    } catch (error) {
      console.error('Fout bij ophalen van loonstrook:', error);
      return null;
    }
  }