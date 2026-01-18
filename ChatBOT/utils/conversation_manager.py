"""
Conversation Manager Module
Handles conversation history, memory management, and context tracking.
"""

class ConversationManager:
    """
    Manages conversation history with smart memory and duplicate detection.
    """
    
    # Maximum number of message pairs to keep in memory
    MAX_HISTORY_LENGTH = 20  # 10 user + 10 assistant = 20 total
    
    def __init__(self):
        """
        Initialize a new conversation session.
        """
        self.history = []
        self.turn_count = 0
        self.last_user_message = None
        self.last_assistant_message = None
    
    def add_message(self, role, content):
        """
        Add a message to conversation history with duplicate detection.
        
        Args:
            role (str): 'user' or 'assistant'
            content (str): The message content
        """
        # Skip if content is empty
        if not content or len(content.strip()) == 0:
            return
        
        # Duplicate detection: prevent adding the same message twice in a row
        if role == "user" and content == self.last_user_message:
            print("⚠️  Duplicate user message detected, skipping...")
            return
        
        if role == "assistant" and content == self.last_assistant_message:
            print("⚠️  Duplicate assistant message detected, skipping...")
            return
        
        # Add message to history
        self.history.append({
            "role": role,
            "content": content.strip()
        })
        
        # Update last message trackers
        if role == "user":
            self.last_user_message = content
            self.turn_count += 1
        else:
            self.last_assistant_message = content
        
        # Trim history if it gets too long
        self._trim_history()
    
    def _trim_history(self):
        """
        Keep only the most recent messages to prevent context overflow.
        Maintains conversation pairs (user + assistant).
        """
        if len(self.history) > self.MAX_HISTORY_LENGTH:
            # Remove oldest messages but keep pairs intact
            # Remove 2 messages at a time (1 user + 1 assistant)
            self.history = self.history[2:]
    
    def get_history(self):
        """
        Get the full conversation history.
        
        Returns:
            list: List of message dictionaries
        """
        return self.history
    
    def get_recent_history(self, num_exchanges=3):
        """
        Get only the most recent exchanges.
        
        Args:
            num_exchanges (int): Number of user-assistant pairs to return
        
        Returns:
            list: Recent message history
        """
        num_messages = num_exchanges * 2
        return self.history[-num_messages:] if len(self.history) > num_messages else self.history
    
    def reset(self):
        """
        Clear all conversation history and start fresh.
        """
        self.history = []
        self.turn_count = 0
        self.last_user_message = None
        self.last_assistant_message = None
        print("\n🔄 Conversation history cleared!\n")
    
    def get_conversation_summary(self):
        """
        Get statistics about the current conversation.
        
        Returns:
            dict: Conversation statistics
        """
        return {
            "total_messages": len(self.history),
            "turn_count": self.turn_count,
            "user_messages": len([m for m in self.history if m["role"] == "user"]),
            "assistant_messages": len([m for m in self.history if m["role"] == "assistant"])
        }
    
    def has_history(self):
        """
        Check if there is any conversation history.
        
        Returns:
            bool: True if history exists, False otherwise
        """
        return len(self.history) > 0
