// pages/api/chat.ts
//import type { NextApiRequest, NextApiResponse } from 'next'
import { OpenAI } from 'openai';
import { agents } from '@/app/lib/agents';
import { connectToDB } from "../lib/mongoose";
import { ChatMessage } from '@/app/lib/models/ChatMessage.model';

//type AgentId = keyof typeof agents;
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    const agentId = searchParams.get("agentId");
    const userId = searchParams.get("userId");
  
    await connectToDB();
  
    const messages = await ChatMessage.find({ agentId, userId }).sort({ createdAt: 1 });
  
    return new Response(JSON.stringify(messages), { status: 200 });
  };
  

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return Response.json(405).json()
  }
  await connectToDB();
  const { agentId, userId, message, isUser, history } = await req.json();
  await ChatMessage.create({ agentId, userId, message, isUser });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!Object.keys(agents).includes(agentId)) {
    return new Response('Invalid agentId', { status: 400 });
  }

  const agent = agents[agentId as keyof typeof agents] || agents.supportBot;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: agent.systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  });

  return Response.json({ response: completion.choices[0].message });
};
