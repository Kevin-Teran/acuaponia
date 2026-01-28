/**
 * @file AiAssistantButton.tsx
 * @description Implementa el botón flotante y el panel lateral de chat con toda la lógica del asistente de IA.
 * Se fija en la esquina inferior derecha (bottom-6, right-6).
 * @author Kevin Mariano
 * @version 1.0.6 
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bot, Clipboard, Trash2, Send, X, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/config/api';
import Link from 'next/link';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  showActions?: boolean; // Indica si debe mostrar botones de acción
};

const PREGUNTAS_DEFAULT: string[] = [
  '¿Estado del sistema?',
  'Crear un tanque',
  'Generar reporte',
];

const FormattedMessage = ({ text }: { text: string }) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <Link 
        key={match.index} 
        href={match[2]} 
        className="text-emerald-400 hover:text-emerald-300 underline font-semibold transition-colors mx-1"
      >
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <p className="whitespace-pre-wrap leading-relaxed text-sm">{parts}</p>;
};

const UserAvatar = ({ name }: { name: string }) => {
  const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
      {getInitials(name)}
    </div>
  );
};

interface AiAssistantButtonProps {
  isOtherPanelOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
}

export const AiAssistantButton: React.FC<AiAssistantButtonProps> = ({ 
  isOtherPanelOpen, 
  setIsOpen, 
  isOpen 
}) => {
  const { user } = useAuth();
  
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sugerencias, setSugerencias] = useState<string[]>(PREGUNTAS_DEFAULT);
  
  // Estado para detectar si la IA espera confirmación
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const togglePanel = useCallback(() => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, cargando]);
  
  useEffect(() => {
    if (messages.length === 0 && !cargando && user) {
      setMessages([{
        id: 1,
        text: `Hola ${user.name.split(' ')[0]}, soy ACUAGENIUS. ¿Qué hacemos hoy?`,
        sender: 'ai'
      }]);
    }
  }, [messages.length, cargando, user]);

  // Detectar si la IA pide confirmación
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === 'ai') {
        const textLower = lastMsg.text.toLowerCase();
        
        // Detectar si pide confirmación
        const isAskingConfirmation = 
          textLower.includes('¿confirmas') || 
          textLower.includes('¿estás seguro') ||
          textLower.includes('confirmar') ||
          textLower.includes('¿procedo') ||
          textLower.includes('¿quieres que');
        
        // Detectar si ofrece personalización
        const offersCustomization = 
          textLower.includes('personalizar') ||
          textLower.includes('modificar datos');

        if (isAskingConfirmation) {
          setAwaitingConfirmation(true);
          if (offersCustomization) {
            setSugerencias(['✅ Confirmar', '✏️ Personalizar', '❌ Cancelar']);
          } else {
            setSugerencias(['✅ Confirmar', '❌ Cancelar']);
          }
        } else if (textLower.includes('envía los datos') || textLower.includes('formato:')) {
          // Está pidiendo datos del formulario
          setAwaitingConfirmation(false);
          setSugerencias([]);
        } else {
          setAwaitingConfirmation(false);
          setSugerencias(PREGUNTAS_DEFAULT);
        }
      }
    }
  }, [messages]);

  const sendMessage = useCallback(async (pregunta: string) => {
    if (!pregunta.trim() || cargando) return;

    const userMessage: Message = { 
      id: Date.now(), 
      text: pregunta, 
      sender: 'user' 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    setCargando(true);
    try {
      const response = await api.post('/asistente', { pregunta });
      const aiResponseText = response.data.respuesta;

      // Detectar si la respuesta contiene botones de acción
      const showActions = 
        aiResponseText.toLowerCase().includes('¿confirmas') ||
        aiResponseText.toLowerCase().includes('personalizar');

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: aiResponseText, 
        sender: 'ai',
        showActions 
      }]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error de conexión.';
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `⚠️ ${errorMsg}`, 
        sender: 'ai' 
      }]);
    } finally {
      setCargando(false);
      if (window.innerWidth > 640) {
        inputRef.current?.focus();
      }
    }
  }, [cargando]);
  
  const handleFormSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    sendMessage(input); 
  };
  
  const handleCopy = (text: string, id: number) => { 
    const cleanText = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanText);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = cleanText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(id); 
    setTimeout(() => setCopiedId(null), 2000); 
  };
  
  const handleClearChat = () => {
    setMessages([]);
    setSugerencias(PREGUNTAS_DEFAULT);
    setAwaitingConfirmation(false);
  };

  const handleQuickAction = (action: string) => {
    if (action === '✅ Confirmar' || action.includes('✅')) {
      sendMessage('Sí, confirmo');
    } else if (action === '❌ Cancelar' || action.includes('❌')) {
      sendMessage('No, cancelar');
    } else if (action === '✏️ Personalizar' || action.includes('✏️')) {
      sendMessage('Quiero personalizar los datos');
    } else {
      sendMessage(action);
    }
  };

  const floatingButtonClasses = clsx(
    "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-xl transition-all duration-300", 
    "bg-emerald-600 hover:bg-emerald-700 text-white",
    "flex items-center justify-center transform hover:scale-105"
  );
  
  return (
    <div className='relative'>
      {/* Botón Flotante */}
      <button
        onClick={togglePanel}
        aria-label="Abrir Asistente de IA"
        className={clsx(floatingButtonClasses, { 'hidden': isOtherPanelOpen && !isOpen })} 
      >
        <Bot size={24} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[49]" onClick={togglePanel}></div>
      )}

      {/* Panel de Chat */}
      <div
        className={clsx(
          'fixed bottom-0 right-0 h-[100dvh] w-full sm:w-[420px] shadow-2xl z-50 transition-transform duration-300 transform', 
          'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Cabecera */}
        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className='flex items-center gap-2.5'>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Bot size={20} className='text-white' />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">ACUAGENIUS</h2>
              <p className="text-xs text-emerald-100">Asistente Inteligente</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button 
                onClick={handleClearChat} 
                className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors" 
                title="Borrar chat"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={togglePanel} 
              className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </header>
      
        {/* Cuerpo del Chat */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
          {messages.length === 0 && (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 opacity-60">
              <Bot size={64} className="mb-4 text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Hazme una pregunta o pídeme una acción.
              </p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={clsx("flex gap-2.5", msg.sender === 'user' ? "justify-end" : "justify-start")}>
              
              {msg.sender === 'ai' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <Bot size={16} className="text-white" />
                  </div>
                </div>
              )}

              <div className={clsx(
                "relative max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm", 
                msg.sender === 'user' 
                  ? "bg-emerald-600 text-white rounded-tr-none" 
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700"
              )}>
                {msg.sender === 'ai' ? (
                  <FormattedMessage text={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                )}
                
                {msg.sender === 'ai' && (
                  <button 
                    onClick={() => handleCopy(msg.text, msg.id)} 
                    className="absolute -bottom-5 right-0 text-gray-400 hover:text-emerald-500 text-xs flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
                    title="Copiar"
                  >
                    {copiedId === msg.id ? '✓ Copiado' : <Clipboard size={12} />}
                  </button>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <UserAvatar name={user?.name || 'U'} />
                </div>
              )}
            </div>
          ))}
          
          {cargando && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center animate-pulse">
                <Bot size={16} className="text-gray-400" />
              </div>
              <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 rounded-full px-3 py-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Área de Input y Acciones */}
        <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          
          {/* Botones de Acción Dinámicos */}
          {sugerencias.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {sugerencias.map((sug, idx) => {
                const isConfirm = sug.includes('✅');
                const isCancel = sug.includes('❌');
                const isCustomize = sug.includes('✏️');

                return (
                  <button 
                    key={idx} 
                    onClick={() => handleQuickAction(sug)} 
                    disabled={cargando} 
                    className={clsx(
                      "px-3.5 py-2 text-xs font-medium rounded-lg transition-all border shadow-sm flex items-center gap-1.5",
                      isConfirm && "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
                      isCancel && "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
                      isCustomize && "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
                      !isConfirm && !isCancel && !isCustomize && "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                    )}
                  >
                    {isConfirm && <CheckCircle size={14} />}
                    {isCancel && <XCircle size={14} />}
                    {isCustomize && <Edit3 size={14} />}
                    {sug.replace(/[✅❌✏️]/g, '').trim()}
                  </button>
                );
              })}
            </div>
          )}

          {/* Input de Texto */}
          <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe aquí..."
              className="flex-grow w-full py-2.5 px-3.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              disabled={cargando}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || cargando} 
              className="flex-shrink-0 h-[42px] w-[42px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};