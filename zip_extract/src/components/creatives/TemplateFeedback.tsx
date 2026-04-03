/**
 * Template Feedback Component
 * Allows users to provide feedback on AI-generated templates
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';

interface TemplateFeedbackProps {
  generationId: string;
  userId: string;
  templateCode: string;
  onFeedbackSubmitted: () => void;
  onClose: () => void;
}

const TemplateFeedback: React.FC<TemplateFeedbackProps> = ({
  generationId,
  userId,
  templateCode,
  onFeedbackSubmitted,
  onClose
}) => {
  const { toast } = useToast();
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast({
        title: 'Rating Required',
        description: 'Please select thumbs up or thumbs down',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Here you would submit feedback to your backend/database
      console.log('[TemplateFeedback] Submitting:', {
        generationId,
        userId,
        rating,
        feedback,
        templateCode: templateCode.substring(0, 100) + '...'
      });

      toast({
        title: 'Thank you for your feedback!',
        description: 'Your input helps us improve AI generation'
      });

      onFeedbackSubmitted();
      onClose();
    } catch (error) {
      console.error('[TemplateFeedback] Error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Template Feedback</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-200 mb-2 block">How was the generated template?</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={rating === 'positive' ? 'default' : 'outline'}
                onClick={() => setRating('positive')}
                className={rating === 'positive' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-700'}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Good
              </Button>
              <Button
                type="button"
                variant={rating === 'negative' ? 'default' : 'outline'}
                onClick={() => setRating('negative')}
                className={rating === 'negative' ? 'bg-red-600 hover:bg-red-700' : 'border-slate-700'}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Needs Improvement
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="feedback" className="text-slate-200 mb-2 block">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what you liked or what could be better..."
              rows={4}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!rating || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateFeedback;
