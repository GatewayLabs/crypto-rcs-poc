import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useGameUIStore } from '@/stores/game-ui-store';
import { Button } from '../ui/button';
import { useGame } from '@/hooks/use-game';

interface ErrorDialogProps {
  onClose: () => void;
}

export default function ErrorDialog({ onClose }: ErrorDialogProps) {
  const { error } = useGameUIStore();
  const { cancelGame } = useGame();

  const isOpen = !!error;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sorry for the inconvenience :/</DialogTitle>
          <DialogDescription className="mt-4">
            <div className="my-4">
              An error happened while playing the game. Please try again. If the
              problem persists, please contact support.
            </div>
            <Button variant="outline" onClick={() => cancelGame()}>
              Recover bet
            </Button>
            <Accordion type="single" collapsible>
              <AccordionItem value="error-details" className="border-none">
                <AccordionTrigger>Error details</AccordionTrigger>
                <AccordionContent>
                  <div className="bg-red-950/50 p-4 rounded-lg border border-red-900 max-h-[200px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-red-300 text-sm font-mono break-all">
                      {error}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
