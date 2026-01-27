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
import { Bot, Sparkles, Clipboard, Trash2, Send, X, Bot as BotIconComponent } from 'lucide-react'; 
import { clsx } from 'clsx';
import api from '@/config/api'; 
import Link from 'next/link'; // Importar Link para navegación interna

const XIcon = X; 
const BotIcon = BotIconComponent;

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  command?: any; 
};

const PREGUNTAS_DEFAULT: string[] = [
  '¿Estado del sistema?',
  'Analiza el pH (48h)',
  'Crear un tanque',
];

// --- Componente para renderizar texto con enlaces Markdown [Texto](url) ---
const FormattedMessage = ({ text }: { text: string }) => {
  // Expresión regular para capturar [Texto](Url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  // Iterar sobre las coincidencias
  while ((match = linkRegex.exec(text)) !== null) {
    // Texto antes del enlace
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // El enlace en sí
    parts.push(
      <Link 
        key={match.index} 
        href={match[2]} 
        className="text-emerald-200 hover:text-white underline font-semibold transition-colors mx-1"
      >
        {match[1]}
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  }

  // Texto restante
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <p className="whitespace-pre-wrap leading-relaxed">{parts}</p>;
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
    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
      {getInitials(name)}
    </div>
  );
};

// Procesador de texto para limpiar JSON residuales si los hubiera
const processAIResponse = (rawText: string) => {
    let cleanText = rawText;
    let command = null;

    // Limpieza agresiva de bloques JSON o markdown de código
    cleanText = cleanText.replace(/:::ACTION[\s\S]*?:::/g, '').trim(); // Eliminar bloque ACTION si se filtró
    cleanText = cleanText.replace(/```[\s\S]*?```/g, '').trim();
    cleanText = cleanText.replace(/^\s*(json|type|message|id|respuesta)\s*$/gmi, '').trim();
    
    // Normalizar saltos de línea
    cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

    if (cleanText.length < 2) {
      cleanText = 'Procesando acción... (Por favor revisa el resultado).';
    }

    return { cleanText, command };
};

interface AiAssistantButtonProps {
    isOtherPanelOpen: boolean; 
    setIsOpen: (isOpen: boolean) => void;
    isOpen: boolean;
}

export const AiAssistantButton: React.FC<AiAssistantButtonProps> = ({ isOtherPanelOpen, setIsOpen, isOpen }) => {
  const { user } = useAuth();
  
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Estado para sugerencias dinámicas (Botones de confirmación)
  const [sugerencias, setSugerencias] = useState<string[]>(PREGUNTAS_DEFAULT);

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

  // Efecto para detectar si la IA pide confirmación y cambiar los botones
  useEffect(() => {
    if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.sender === 'ai') {
            const textLower = lastMsg.text.toLowerCase();
            // Detectar palabras clave de confirmación
            if (textLower.includes('¿confirmas') || textLower.includes('¿estás seguro') || textLower.includes('confirmar')) {
                setSugerencias(['✅ Sí, confirmo', '❌ Cancelar']);
            } else {
                setSugerencias(PREGUNTAS_DEFAULT);
            }
        }
    }
  }, [messages]);

  const sendMessage = useCallback(async (pregunta: string) => {
    if (!pregunta.trim() || cargando) return;

    const userMessage: Message = { id: Date.now(), text: pregunta, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // --- VALIDACIÓN CORREGIDA: Permitir "Si", "No", "Ok" ---
    if (pregunta.trim().length === 0) return; 
    // Eliminamos la validación regex estricta que bloqueaba "si"

    setCargando(true);
    try {
      const response = await api.post('/asistente', { pregunta });
      const rawAiResponseText = response.data.respuesta; 
      const { cleanText, command } = processAIResponse(rawAiResponseText);

      setMessages(prev => [...prev, { id: Date.now() + 1, text: cleanText, sender: 'ai', command }]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error de conexión.';
      setMessages(prev => [...prev, { id: Date.now() + 1, text: `⚠️ Error: ${errorMsg}`, sender: 'ai' }]);
    } finally {
      setCargando(false);
      // Mantener foco en input salvo en móviles para no abrir teclado
      if (window.innerWidth > 640) {
          inputRef.current?.focus();
      }
    }
  }, [cargando]);
  
  const handleFormSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  
  const handleCopy = (text: string, id: number) => { 
      // Limpiar markdown de links para copiar solo texto
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
  };

  const floatingButtonClasses = clsx(
    "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-xl transition-all duration-300", 
    "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800",
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
        <BotIcon size={24} />
      </button>

      {/* Panel de Chat */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[49]" onClick={togglePanel}></div>
      )}

      <div
        className={clsx(
          'fixed bottom-0 right-0 h-[100dvh] w-full sm:w-[400px] shadow-2xl z-50 transition-transform duration-300 transform', 
          'bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
          {/* Cabecera */}
          <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
             <div className='flex items-center gap-2.5'>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <BotIcon size={20} className='text-emerald-600 dark:text-emerald-400' />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">ACUAGENIUS</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Asistente Inteligente</p>
                </div>
             </div>
             <div className="flex items-center gap-1">
                {messages.length > 0 && (
                    <button onClick={handleClearChat} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Borrar chat">
                        <Trash2 size={18} />
                    </button>
                )}
                <button onClick={togglePanel} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors">
                    <XIcon size={24} />
                </button>
             </div>
          </header>
        
          {/* Cuerpo del Chat */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0B1120]">
            {messages.length === 0 && (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 opacity-60">
                <BotIcon size={64} className="mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500">Hazme una pregunta o pídeme una acción.</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className={clsx("flex gap-3", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                
                {msg.sender === 'ai' && (
                   <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                        <BotIcon size={16} className="text-white" />
                      </div>
                   </div>
                )}

                <div className={clsx(
                    "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm", 
                    msg.sender === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-600"
                )}>
                    {msg.sender === 'ai' ? (
                        <FormattedMessage text={msg.text} />
                    ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                    
                    {msg.sender === 'ai' && (
                      <button 
                        onClick={() => handleCopy(msg.text, msg.id)} 
                        className="absolute -bottom-5 right-0 text-gray-400 hover:text-emerald-500 text-xs flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        {copiedId === msg.id ? 'Copiado' : <Clipboard size={12} />}
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
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center animate-pulse">
                    <BotIcon size={16} className="text-gray-400" />
                 </div>
                 <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input y Sugerencias */}
          <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {/* Botones de Sugerencia / Confirmación */}
            <div className="flex flex-wrap gap-2 mb-3 max-h-20 overflow-y-auto">
              {sugerencias.map((sug, idx) => (
                <button 
                    key={idx} 
                    onClick={() => sendMessage(sug)} 
                    disabled={cargando} 
                    className={clsx(
                        "px-3 py-1.5 text-xs font-medium rounded-full transition-all border shadow-sm",
                        // Estilo especial para botones de confirmación (tienen emojis)
                        sug.includes('✅') 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                            : sug.includes('❌')
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    )}
                >
                  {/* Icono de chispa solo para sugerencias normales */}
                  {!sug.includes('✅') && !sug.includes('❌') && <Sparkles size={12} className="inline mr-1.5 opacity-50" />}
                  {sug}
                </button>
              ))}
            </div>

            <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe aquí..."
                className="flex-grow w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                disabled={cargando}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || cargando} 
                className="flex-shrink-0 h-[46px] w-[46px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        
      </div>
    </div>
  );
};