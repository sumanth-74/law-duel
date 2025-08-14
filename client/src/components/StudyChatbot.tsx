import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AtticusCat } from './AtticusCat';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, Trash2, BookOpen, Lightbulb, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StudyChatbotProps {
  currentSubject?: string;
  isVisible: boolean;
  onClose?: () => void;
}

export function StudyChatbot({ currentSubject, isVisible, onClose }: StudyChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [studyTips, setStudyTips] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chatbot becomes visible
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  // Load suggestions and study tips when component mounts or subject changes
  useEffect(() => {
    loadSuggestions();
    if (currentSubject) {
      loadStudyTips();
    }
  }, [currentSubject]);

  const loadSuggestions = async () => {
    try {
      const response = await fetch(`/api/chatbot/suggestions${currentSubject ? `?subject=${encodeURIComponent(currentSubject)}` : ''}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadStudyTips = async () => {
    if (!currentSubject) return;
    
    try {
      const response = await fetch(`/api/chatbot/study-tips/${encodeURIComponent(currentSubject)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setStudyTips(data.tips || []);
    } catch (error) {
      console.error('Error loading study tips:', error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          context: { subject: currentSubject }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const clearHistory = async () => {
    try {
      const response = await fetch('/api/chatbot/history', { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setMessages([]);
        setShowSuggestions(true);
        toast({
          title: "History Cleared",
          description: "Your conversation history has been cleared.",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Error clearing history:', error);
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto bg-panel border-purple-500/20 shadow-xl" data-testid="study-chatbot">
      <CardHeader className="border-b border-purple-500/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 bg-mystic-gold rounded-lg flex items-center justify-center shadow-lg">
              <AtticusCat size="xl" className="opacity-90" />
            </div>
            <div>
              <CardTitle className="text-xl font-cinzel">Study Companion</CardTitle>
              <p className="text-sm text-muted">Ask Atticus anything about law</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentSubject && (
              <Badge variant="outline" className="border-purple-400/50 text-purple-300 bg-purple-900/20">
                {currentSubject}
              </Badge>
            )}
            {messages.length > 0 && (
              <Button
                onClick={clearHistory}
                variant="ghost"
                size="sm"
                className="text-muted hover:text-white hover:bg-red-500/20"
                data-testid="button-clear-history"
              >
                <Trash2 size={16} />
              </Button>
            )}
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-muted hover:text-white"
                data-testid="button-close-chatbot"
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96 p-4" data-testid="chat-messages">
          {messages.length === 0 && showSuggestions ? (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-mystic-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="text-mystic-gold" size={24} />
                </div>
                <h3 className="font-semibold mb-2">Hello! I'm Atticus, your AI study companion.</h3>
                <p className="text-muted text-sm">Ask me anything about legal concepts, get study tips, or practice explaining complex topics.</p>
              </div>

              {/* Suggested Questions */}
              {suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <Lightbulb size={16} className="mr-2 text-yellow-400" />
                    Suggested Questions
                  </h4>
                  <div className="space-y-2">
                    {suggestions.slice(0, 4).map((suggestion, index) => (
                      <Button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        variant="outline"
                        className="w-full text-left justify-start h-auto py-2 px-3 text-sm border-white/10 hover:border-purple-400/50 hover:bg-purple-900/20"
                        data-testid={`suggestion-${index}`}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Tips */}
              {currentSubject && studyTips.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <BookOpen size={16} className="mr-2 text-blue-400" />
                    {currentSubject} Study Tips
                  </h4>
                  <div className="space-y-2">
                    {studyTips.slice(0, 3).map((tip, index) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg text-sm"
                      >
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-mystic-gold/10 border border-mystic-gold/30'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center mb-2">
                        <AtticusCat size="sm" className="mr-2 opacity-90" />
                        <span className="text-xs font-medium text-mystic-gold">Atticus</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-mystic-gold/10 border border-mystic-gold/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AtticusCat size="sm" className="opacity-90" />
                      <Loader2 size={16} className="animate-spin text-mystic-gold" />
                      <span className="text-sm text-mystic-gold">Atticus is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="border-t border-purple-500/20 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about legal concepts, study tips, or anything law-related..."
              disabled={isLoading}
              className="flex-1 bg-black/20 border-white/10 focus:border-purple-400"
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-3 bg-purple-600 hover:bg-purple-700"
              data-testid="button-send-message"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}