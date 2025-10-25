import { ConversationHistory } from "@/components/ConversationHistory";
import { useNavigate } from "react-router-dom";

export default function History() {
  const navigate = useNavigate();

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/?conversation=${conversationId}`);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] p-6">
      <ConversationHistory
        onSelectConversation={handleSelectConversation}
        currentConversationId={null}
      />
    </div>
  );
}