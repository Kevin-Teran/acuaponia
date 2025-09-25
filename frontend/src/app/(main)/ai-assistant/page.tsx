/**
 * @file page.tsx
 * @route frontend/src/app/(main)/ai-assistant
 * @description Interfaz de chat que utiliza el cliente Axios centralizado para la autenticación.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/common/Card';
import { useAuth } from '@/context/AuthContext';
import { Bot, Sparkles, Clipboard, Trash2, Send } from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/config/api'; 

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'ai';
};

const PREGUNTAS_SUGERIDAS: string[] = [
  '¿Cuál es el estado general del sistema?',
  'Analiza los niveles de pH de las últimas 48 horas.',
  '¿Hay alguna recomendación para el oxígeno disuelto?',
];

const UserAvatar = ({ name }: { name: string }) => {
  const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };
  return (
    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
      {getInitials(name)}
    </div>
  );
};

/**
 * @page AsistenteIAPage
 * @description Renderiza una interfaz de chat pulida para conversar con el asistente de IA.
 */
const AsistenteIAPage: React.FC = () => {
  const { user } = useAuth();
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, cargando]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async (pregunta: string) => {
    if (!pregunta.trim() || cargando) return;

    const userMessage: Message = { id: Date.now(), text: pregunta, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const esPreguntaValida = pregunta.trim().length > 3 && /[a-z]/i.test(pregunta) && /[aeiou]/i.test(pregunta);
    if (!esPreguntaValida) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Lo siento, no he entendido tu pregunta. Por favor, intenta ser más específico.',
        sender: 'ai'
      }]);
      return;
    }

    setCargando(true);
    try {
      const response = await api.post('/asistente', { pregunta });

      const aiResponseText = response.data.respuesta;
      setMessages(prev => [...prev, { id: Date.now() + 1, text: aiResponseText, sender: 'ai' }]);
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al contactar al servidor.';
      setMessages(prev => [...prev, { id: Date.now() + 1, text: `Error: ${errorMsg}`, sender: 'ai' }]);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  }, [cargando, user]);
  
  const handleFormSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleCopy = (text: string, id: number) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };
  const handleClearChat = () => setMessages([]);

  return (
    <div className="flex flex-col h-full -m-6 animate-in fade-in duration-500">
      <header className="flex-shrink-0 flex justify-between items-center p-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asistente de IA</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Conversa con la IA para obtener análisis y recomendaciones.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClearChat} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-all">
            <Trash2 size={16} /> Limpiar
          </button>
        )}
      </header>
      
      <div className="flex flex-col flex-grow p-6 pt-2 overflow-hidden">
        <Card className="flex flex-col flex-grow p-0 overflow-hidden w-full">
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 h-full flex flex-col justify-center items-center p-4">
                <Bot size={48} className="mb-4 text-gray-400" />
                <h2 className="text-lg font-semibold">Bienvenido al Asistente</h2>
                <p className="text-sm max-w-sm mx-auto">Puedes empezar saludando o usando una de las sugerencias de abajo.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={clsx('group flex items-start gap-3 sm:gap-4', { 'justify-end': msg.sender === 'user' })}>
                  {msg.sender === 'ai' && (
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <Bot size={20} className="text-gray-600 dark:text-gray-300"/>
                    </div>
                  )}
                  <div className={clsx('relative max-w-xs md:max-w-md rounded-lg px-4 py-3 text-sm', {
                    'bg-emerald-600 text-white': msg.sender === 'user',
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200': msg.sender === 'ai',
                  })}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.sender === 'ai' && (
                      <button onClick={() => handleCopy(msg.text, msg.id)} className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-full text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {copiedId === msg.id ? <span className="text-emerald-500 text-xs">¡Ok!</span> : <Clipboard size={14} />}
                      </button>
                    )}
                  </div>
                  {msg.sender === 'user' && <UserAvatar name={user?.name || 'Usuario'} />}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex items-start gap-4 animate-in fade-in">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"> <Bot size={24} /> </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 flex items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-dot [animation-delay:0s]"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-dot [animation-delay:0.2s] mx-1"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-dot [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <div className="hidden sm:flex flex-wrap gap-2 mb-3">
              {PREGUNTAS_SUGERIDAS.map(sug => (
                <button key={sug} onClick={() => sendMessage(sug)} disabled={cargando} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors disabled:opacity-50">
                  <Sparkles size={12} className="inline mr-1.5" />{sug}
                </button>
              ))}
            </div>
            <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-grow w-full h-12 px-4 rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-base"
                disabled={cargando}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || cargando} 
                className="flex-shrink-0 flex items-center justify-center h-12 w-12 bg-emerald-600 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
                aria-label="Enviar mensaje"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AsistenteIAPage;