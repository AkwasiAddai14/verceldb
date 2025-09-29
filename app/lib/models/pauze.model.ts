import { Document, Schema, model, models } from "mongoose";

export interface IPauze extends Document {
  _id: string;
  name: string;
}

const PauzeSchema = new Schema({
  name: { type: String, required: true, unique: true },
})

const Pauze = models.Pauze || model('Pauze', PauzeSchema);

export default Pauze;