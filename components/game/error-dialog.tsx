import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useGameUIStore } from "@/stores/game-ui-store";

interface ErrorDialogProps {
  onClose: () => void;
}

export default function ErrorDialog({ onClose }: ErrorDialogProps) {
  const { error } = useGameUIStore();

  const isOpen = !!error;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-500">An error occurred</DialogTitle>
          <DialogDescription className="mt-4">
            <div className="text-red-400 mb-4">Try again soon!</div>
            <Accordion type="single" collapsible>
              <AccordionItem value="error-details" className="border-none">
                <AccordionTrigger className="text-red-400 hover:text-red-300">
                  Error details
                </AccordionTrigger>
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
