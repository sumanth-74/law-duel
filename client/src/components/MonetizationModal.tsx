import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Initialize Stripe outside component to avoid re-creating on every render
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface MonetizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  challengeId: string;
}

const CheckoutForm = ({ onSuccess, challengeId }: { onSuccess: () => void; challengeId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/solo-challenge-continue?challenge=${challengeId}`,
      },
      redirect: 'if_required'
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      // Payment succeeded
      toast({
        title: "Payment Successful",
        description: "Your lives have been restored!",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {isProcessing ? 'Processing...' : 'Restore Lives - $0.99'}
      </Button>
    </form>
  );
};

export default function MonetizationModal({ isOpen, onClose, onSuccess, challengeId }: MonetizationModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRestoreLives = async () => {
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      // Fallback for development/testing - simulate payment
      toast({
        title: "Development Mode",
        description: "In production, this would charge $0.99. Lives restored for testing.",
      });
      
      // Call backend to restore lives
      try {
        await apiRequest('POST', '/api/solo-challenge/restore-lives', { challengeId });
        onSuccess();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to restore lives",
          variant: "destructive"
        });
      }
      return;
    }

    setIsLoading(true);
    try {
      // Create payment intent for $0.99
      const response = await apiRequest('POST', '/api/create-payment-intent', { 
        amount: 0.99,
        metadata: {
          type: 'solo_challenge_lives',
          challengeId
        }
      });
      
      setClientSecret(response.clientSecret);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-cinzel text-purple-300 flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500" />
            Out of Lives!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-lg text-gray-300">
              You've run out of lives, but your progress is saved!
            </p>
            <p className="text-sm text-gray-400">
              Continue playing from where you left off with 3 fresh lives.
            </p>
          </div>

          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Keep Your Progress!
            </h3>
            <div className="text-sm text-gray-300 mb-3 space-y-1">
              <p>✓ Continue from your current difficulty level</p>
              <p>✓ Keep your score and round progress</p>
              <p>✓ Get 3 fresh lives for just $0.99</p>
            </div>
            
            {!clientSecret ? (
              <div className="space-y-3">
                <Button 
                  onClick={handleRestoreLives}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Get 3 More Lives - $0.99'}
                </Button>
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="w-full border-gray-500 text-gray-300"
                >
                  End Challenge
                </Button>
              </div>
            ) : (
              stripePromise && (
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#9333ea',
                        colorBackground: '#1e293b',
                        colorText: '#e2e8f0',
                        colorDanger: '#ef4444',
                      }
                    }
                  }}
                >
                  <CheckoutForm onSuccess={onSuccess} challengeId={challengeId} />
                </Elements>
              )
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Secure payment processed by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}