import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyChatbot } from './StudyChatbot';
import { AtticusCat } from './AtticusCat';
import { MessageSquare, Bot } from 'lucide-react';

interface ChatbotButtonProps {
  currentSubject?: string;
  className?: string;
  variant?: 'floating' | 'inline';
}

export function ChatbotButton({ currentSubject, className = '', variant = 'floating' }: ChatbotButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'floating') {
    return (
      <>
        {/* Floating Button */}
        <div className={`fixed bottom-6 right-6 z-30 ${className}`}>
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative w-32 h-32 rounded-full shadow-xl transition-all duration-300 ${
              isOpen 
                ? 'bg-purple-600 hover:bg-purple-700 scale-110' 
                : 'bg-mystic-gold hover:bg-mystic-gold/90'
            }`}
            data-testid="button-floating-chatbot"
          >
            {isOpen ? (
              <span className="text-7xl text-white">×</span>
            ) : (
              <AtticusCat size="massive" className="opacity-90" />
            )}
            
            {/* Subject Badge */}
            {currentSubject && !isOpen && (
              <Badge 
                variant="outline" 
                className="absolute -top-1 -right-1 text-xs border-purple-400/50 text-purple-300 bg-purple-900/90 backdrop-blur-sm shadow-lg"
              >
                {currentSubject.split(' ')[0]}
              </Badge>
            )}
          </Button>
        </div>

        {/* Chatbot Overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <StudyChatbot
              currentSubject={currentSubject}
              isVisible={isOpen}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </>
    );
  }

  // Inline variant for dashboard/menu integration
  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className={`flex items-center space-x-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/20 ${className}`}
        data-testid="button-inline-chatbot"
      >
        <AtticusCat size="sm" className="opacity-90" />
        <span>Study Companion</span>
        {currentSubject && (
          <Badge variant="outline" className="text-xs border-purple-400/50 text-purple-300 bg-purple-900/20">
            {currentSubject}
          </Badge>
        )}
      </Button>

      {/* Modal Overlay for inline variant */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <StudyChatbot
            currentSubject={currentSubject}
            isVisible={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}