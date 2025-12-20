import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function ChatbotButton() {
  return (
    <Button className="fixed bottom-6 right-6 rounded-full h-14 w-14 p-0">
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
