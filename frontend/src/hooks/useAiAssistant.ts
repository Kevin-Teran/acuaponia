/**
 * @file useAiAssistant.ts
 * @route frontend/src/hooks
 * @description 
 * @author kevin mariano
 * @version 1.0.1 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useState, useCallback } from 'react';
import aiAssistantService from '@/services/aiAssistantService';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export const useAiAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const initialMessage: Message = {
    id: 0,
    text: "Hola, soy ACUAGENIUS, tu asistente de IA del SENA especializado en acuaponía. ¿En qué puedo ayudarte con tu sistema hoy?",
    sender: 'ai',
    timestamp: new Date(),
  };
  
  // Inicializa con un mensaje de bienvenida
  if (messages.length === 0) {
      setMessages([initialMessage]);
  }

  const sendMessage = useCallback(async (text: string) => {
    if (isTyping || !text.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const aiResponseText = await aiAssistantService.getAIResponse(text);

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "Hubo un error al contactar a ACUAGENIUS. Por favor, intenta de nuevo más tarde.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping]);
  
  const resetChat = useCallback(() => {
      setMessages([initialMessage]);
  }, []);

  return {
    messages,
    isTyping,
    sendMessage,
    resetChat,
  };
};