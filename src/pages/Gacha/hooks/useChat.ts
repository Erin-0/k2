import { useState, useRef, useEffect, useCallback } from 'react';
import Groq from 'groq-sdk';
import type { Agent, ChatMessage } from '../types';

const GROQ_API_KEY = "YOUR_API_KEY";

export const useChat = (agent: Agent | null) => {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const initializeChat = useCallback(() => {
        if (agent && chatMessages.length === 0) {
            setChatMessages([{
                role: 'agent',
                content: `الاتصال مؤمن. أنا ${agent.name}. كيف يمكنني خدمتك في الميدان اليوم؟`,
                timestamp: new Date()
            }]);
        }
    }, [agent, chatMessages.length]);

    const sendMessage = useCallback(async () => {
        if (!chatInput.trim() || !agent) return;

        const userMsg: ChatMessage = { 
            role: 'user', 
            content: chatInput, 
            timestamp: new Date() 
        };
        
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsTyping(true);

        try {
            const client = new Groq({ 
                apiKey: GROQ_API_KEY, 
                dangerouslyAllowBrowser: true 
            });

            const completion = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `You are ${agent.name}, also known as ${agent.title}. 
                        Your personality: ${agent.personality}.
                        Your background: ${agent.desc}.
                        Respond to the user as this character. Keep responses concise and immersive.
                        Always respond in Arabic.`
                    },
                    { role: "user", content: userMsg.content }
                ],
                temperature: 0.9,
                max_tokens: 1024,
                stream: true
            });

            let fullResponse = "";
            const botMsg: ChatMessage = { role: 'agent', content: '', timestamp: new Date() };
            setChatMessages(prev => [...prev, botMsg]);

            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content || "";
                fullResponse += content;
                setChatMessages(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].content = fullResponse;
                    return newHistory;
                });
            }
        } catch (e) {
            console.error("AI Error:", e);
            setChatMessages(prev => [...prev, {
                role: 'agent',
                content: "*خطأ في الاتصال العصبي... إعادة التوجيه*",
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [chatInput, agent]);

    return {
        chatMessages,
        chatInput,
        setChatInput,
        isTyping,
        sendMessage,
        initializeChat,
        chatEndRef
    };
};