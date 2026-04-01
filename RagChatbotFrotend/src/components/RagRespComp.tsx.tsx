import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { getChats } from "../apiconfig/api";

import './scrollbar.css'
import FilesUploading from "./FileUploading";


const baseUrl = import.meta.env.VITE_API_URL;
console.log("Base URL:", baseUrl);




export const RagRespComp: React.FC = () => {



  const [messages, setMessages] = useState<{ sender: "user" | "assistant"; text: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setIsStreaming] = useState(false)
  const [, setError] = useState<string | null>(null);


  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true)


  const fetchChatHistory = async () => {
    try {
      const resp = await getChats();
      const chats = resp.data.chats || [];
      console.log('history', chats)

      const formatted = chats.flatMap((x: any) => [
        { sender: 'user', text: x.question },
        { sender: 'assisstant', text: x.answer }
      ])

      setMessages(formatted)

    } catch (err) {
      console.log("error in fetching chats", err)
    }

  }
  useEffect(() => {
    fetchChatHistory()
  }, [])





  const handleAsk = async () => {
    if (!question.trim()) return;

    console.log("Question asked:", question);

    const newMessage = { sender: "user" as const, text: question };
    setMessages((prev) => [...prev, newMessage]);
    setQuestion("");
    setLoading(true);
    setIsStreaming(false);
    setError(null);

    try {
      setMessages((prev) => [...prev, { sender: "assistant", text: "" }]);

      const response = await fetch(`${baseUrl}/ragStreaming`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userQuery: question }),

      });

      console.log("Fetch initiated for streaming response.", response);
      console.log("Fetch initiated for streaming response.", response.body);

      if (!response.body) {
        throw new Error("ReadableStream not supported or empty response body.");
      }
      setLoading(false);
      setIsStreaming(true);

      const reader = await response.body.getReader();
      console.log("Reader obtained --:", reader);
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log("Received chunk:-- ", chunk);

        // setMessages((prev) => {
        //   const updated = [...prev];
        //   const lastIndex = updated.length - 1;
        //   const lastMsg = updated[lastIndex];

        //   updated[lastIndex] = {
        //     ...lastMsg,
        //     text: lastMsg.text + chunk
        //   };

        //   return updated;
        // });
        setMessages((prev) => {
          if (prev.length === 0) return prev;

          const updated = [...prev];
          const lastIndex = updated.length - 1;

          return [
            ...updated.slice(0, lastIndex),
            {
              ...updated[lastIndex],
              text: updated[lastIndex].text + chunk,
            },
          ];
        });
        setIsStreaming(false);
      }



    } catch (err: any) {
      console.error("Streaming error:", err);

      setMessages((prev) => [
        ...prev,
        { sender: "assistant", text: "Error fetching response. Please try again." },
      ]);
      setError("Streaming failed.");
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) handleAsk();
  };


  useLayoutEffect(() => {

    if (!chatEndRef.current || messages.length === 0) return

    if (isFirstLoad.current) {
      chatEndRef.current.scrollIntoView({ behavior: "auto" })
      isFirstLoad.current = false
    } else {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }

  }, [messages, loading]);






  return <>
    <div className="flex flex-col min-w-[360px] h-[100dvh] p-1 sm:p-1  bg-gradient-to-br from-indigo-100 via-amber-100 to-cyan-100">

      <div className="flex items-center flex-wrap justify-between mb-4 sm:mb-4 p-1  "   >
        <div className="text-xl sm:text-3xl font-bold">RAG Chatbot</div>
        <div><FilesUploading /></div>
      </div>


      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 ">
        {messages.map((msg, idx) => {
          if (msg.sender === "assistant" && !msg.text.trim()) return null;

          return (
            <div
              key={idx}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-gray-950 text-white rounded-bl-none"
                  }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}



        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-950 text-white p-2 rounded-2xl rounded-bl-none animate-pulse">
              Please wait...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>


      <div className="flex flex-wrap justify-between fixed-absolute bottom-0 left-0 w-full gap-2  p-2  ">

        <input
          type="text"
          placeholder="Type your question..."
          className="flex-1   p-3  bg-white shadow-md rounded-4xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
        />



        <button
          onClick={handleAsk}
          disabled={loading}
          className={` pl-4 pr-5 text-white bg-blue-500 rounded-full hover:bg-black ${loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-black"
            }`}
        >
          <strong>{loading ? "..." : "Send"} </strong>
        </button>
      </div>

    </div >


  </>
}