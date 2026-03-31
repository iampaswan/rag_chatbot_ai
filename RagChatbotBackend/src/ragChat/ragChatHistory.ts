import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { RagChat } from '../model/chatModel';

export async function getRagChatHistory(req: Request, res: Response) {

  try {
    const chats = await RagChat.find().sort({ createdAt: 1 });
    res.status(200).json({ message: 'RAG Chat History fetched successfully', chats });

    console.log('RAG Chat History fetched successfully', chats);

  } catch (err) {
    res.status(400).json({ message: 'error fetching RAG chat history', err });
  }
}