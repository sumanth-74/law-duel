import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, BookOpen, MessageCircle, Sparkles } from 'lucide-react';

interface AtticusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AtticusModal({ isOpen, onClose }: AtticusModalProps) {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'atticus';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage = question.trim();
    setQuestion('');
    setIsLoading(true);

    // Add user message
    setConversation(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      const response = await fetch('/api/atticus/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: userMessage })
      });

      const data = await response.json();
      
      // Add Atticus response
      setConversation(prev => [...prev, {
        type: 'atticus',
        content: data.response || "I'm here to help you master the law! Ask me about any legal concept, rule, or case.",
        timestamp: new Date()
      }]);
    } catch (error) {
      setConversation(prev => [...prev, {
        type: 'atticus',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Explain FRE 803(2)",
    "What's the rule against perpetuities?",
    "Difference between battery and assault?",
    "When does res ipsa loquitur apply?",
    "Elements of adverse possession"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gradient-to-br from-slate-900 to-purple-900 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-cinzel text-purple-200">
            <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            Ask Atticus
            <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50">
              AI Legal Mentor
            </Badge>
          </DialogTitle>
          <p className="text-purple-300/80">
            Your AI-powered legal mentor. Ask anything about rules, cases, or concepts.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-black/20 rounded-lg mb-4 min-h-[300px]">
            {conversation.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-cinzel text-lg text-purple-200 mb-2">Welcome to Atticus!</h3>
                <p className="text-purple-300/80 mb-4">
                  I'm your AI legal mentor. Ask me about any rule, case, or concept.
                </p>
                <div className="text-sm text-purple-400/60">
                  Try asking: "Explain the mailbox rule" or "What are the elements of negligence?"
                </div>
              </div>
            ) : (
              conversation.map((message, index) => (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-200 border border-purple-500/30'
                  }`}>
                    {message.type === 'atticus' && (
                      <div className="flex items-center gap-2 mb-2 text-purple-300">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-semibold text-sm">Atticus</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="text-xs opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-200 border border-purple-500/30 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-purple-300">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span className="font-semibold text-sm">Atticus</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          {conversation.length === 0 && (
            <div className="mb-4">
              <p className="text-sm text-purple-300 mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuestion(prompt)}
                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10 text-xs"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Atticus about any legal concept..."
              className="flex-1 bg-slate-800 border-purple-500/30 text-slate-200 placeholder:text-slate-400"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}