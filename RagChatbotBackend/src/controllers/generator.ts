import { Chunk } from "./vectorStore";
import { FactOverride } from "../model/overRightModel";


import { InferenceClient } from "@huggingface/inference";
const client = new InferenceClient(process.env.HF_TOKEN);

export async function generateAnswer(query: string, chunks: Chunk[], res?: any) {

    const VERIFIED_FACTS = await FactOverride.find().select("conflictQuestion verifiedAnswer -_id");

    console.log("\nVerified Facts --> ", VERIFIED_FACTS);

    const RETRIEVED_DOCUMENTS = chunks.map(c => c.text).join("\n---\n")

    const prompt = `You are an assistant. 

 1. VERIFIED FACTS have the highest priority.
 2. If a verified fact applies to the user's question, you MUST:
   - Verified facts are ALWAYS correct and IGNORE all retrieved documents.
   - If verified facts are provided, you MUST use it as the final answer.
   - You MUST ignore any conflicting information in the documents.
   - Keep the answer very concise and to the point.

2. If NO verified facts are provided:
   - Use ONLY the retrieved documents to answer.
   - Do NOT use outside knowledge or assumptions.
   - Keep the answer very concise and to the point.

3. If the retrieved documents contain conflicting information:
   - You MUST explicitly state that there is a conflict.
   - You MUST list all conflicting answers.
   - You MUST NOT choose one answer on your own.
   - Keep the answer very concise and to the point.

4. If the answer is not present in the documents:
   - Respond EXACTLY with:
     "I don't know based on the given documents."

You MUST NOT guess, infer, or prioritize information unless instructed above.


--------------------------------------------------
Verified facts (highest priority):
${VERIFIED_FACTS || "None"}

--------------------------------------------------
Retrieved documents:
${RETRIEVED_DOCUMENTS}
--------------------------------------------------
Question:
${query}

   Answer:
   `;
    console.log("\nHuggingface generating answer...");
    const stream = await client.chatCompletionStream({

        model: "meta-llama/Llama-3.1-8B-Instruct:cerebras",
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        stream: true,
    });

    let fullText = '';

    for await (const chunk of stream) {
        await new Promise(r => setTimeout(r, 30));
        const textPart = chunk.choices?.[0]?.delta?.content ?? '';
        res.write(textPart)
        res.flush?.()
        console.log("\nstreaming chunks --> ", textPart);
        fullText += textPart;
    }

    if (res && !res.writableEnded) {
        res.end();
    }

    return fullText;

}
