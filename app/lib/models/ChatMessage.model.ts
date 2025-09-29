import mongoose, { Schema, model, models } from 'mongoose';

const ChatMessageSchema = new Schema({
  agentId: { type: String, required: true },
  userId: { type: String, required: true }, // Clerk, Auth0 of je eigen user ID
  isUser: { type: Boolean, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export const ChatMessage = models.ChatMessage || model("ChatMessage", ChatMessageSchema);
