import { Request, Response } from 'express';
import dotenv from 'dotenv'
dotenv.config()

import { RagChat } from '../model/chatModel'
import { FactOverride } from '../model/overRightModel';
import { generateAnswer } from './generator';
import retriever from './retrieverInstance';


function detectConflict(answer: string) {
  return answer.toLowerCase().includes("conflicting");
}


import { isCorrectionMessage, extractValue, extractEntityPropertyHF } from './handlingConflicts';
import { Console } from 'console';

export async function main(req: Request, res: Response) {

  try {

    const { userQuery } = req.body;

    console.log("\nUser Query --> ", userQuery);
    //

    const count = await RagChat.countDocuments({ hasConflict: true });
    console.log("Conflict count:", count);


    if (isCorrectionMessage(userQuery)) {

      const lastConflict = await RagChat.findOne({
        hasConflict: true
      }).sort({ createdAt: -1 });
      console.log("Last conflict chat --> ", lastConflict);

      if (!lastConflict) {
        return res.json({
          answer: "I don't know what fact you are correcting. Please ask the question first."
        });
      }

      lastConflict.hasConflict = false;

      const conflictQues = lastConflict.question;
      console.log("Conflict question --> ", conflictQues);

      const value = extractValue(userQuery);

      await FactOverride.create({
        conflictQuestion: conflictQues,
        verifiedAnswer: value
      });
      await lastConflict.save();

      return res.json({
        answer: `Saved. I will remember that ${value} is right.`
      });
    }
    //


    console.log("\nRetrieving relevant chunks --> ");
    const relevant = await retriever.retrieveRelevant(userQuery, 3);
    console.log("\nRetrieved relevant chunks --> ", relevant);

    console.log("\nTop Chunks --> ");
    relevant.forEach((c: any, idx: any) => {
      console.log(`${idx + 1}. ${c.id}: ${c.text.substring(0, 100)}...`);
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    console.log("\nGenerating answer -->");
    const ans = await generateAnswer(userQuery, relevant, res);
    console.log("\nFinal Answer --> ", ans);


    const hasConflict = detectConflict(ans);

    const chat = new RagChat({
      question: userQuery,
      answer: ans,
      hasConflict,
    });


    await chat.save();
    console.log("\nChat saved to DB.");




  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send("Error handling RAG stream.");
    }
  }
}
