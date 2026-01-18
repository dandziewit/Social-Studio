"""
Input Formatter Module
Cleans and normalizes user input for better AI understanding.
Designed for therapy/emotional support conversations.
"""

import re

# Common contractions and abbreviations for natural conversation
ABBREVIATION_EXPANSIONS = {
    'whats': 'what is',
    'hows': 'how does',
    'im ': 'I am ',
    'ive ': 'I have ',
    'dont': "don't",
    'cant': "can't",
    'wont': "won't",
    'isnt': "isn't",
    'wasnt': "wasn't",
    'didnt': "didn't",
    'shouldnt': "shouldn't",
    'wouldnt': "wouldn't",
    'couldnt': "couldn't",
    'thats': "that's",
    'theres': "there's",
    'theyre': "they're",
    'youre': "you're",
    'weve': "we've",
    'theyll': "they'll"
}

def format_user_input(text):
    """
    Clean and normalize user input for better processing.
    
    Args:
        text (str): Raw user input
    
    Returns:
        str: Cleaned and normalized text
    """
    if not text:
        return ""
    
    # Basic cleaning
    text = text.strip()
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Expand common abbreviations and contractions
    text_lower = text.lower()
    for abbrev, full in ABBREVIATION_EXPANSIONS.items():
        text_lower = text_lower.replace(abbrev, full)
    
    text = text_lower
    
    # Remove excessive punctuation (but keep single instances for emotional expression)
    text = re.sub(r'([!?.]){3,}', r'\1\1', text)  # Max 2 punctuation marks
    
    # Ensure first letter is capitalized
    if text:
        text = text[0].upper() + text[1:]
    
    return text

def is_valid_input(text):
    """
    Check if user input is valid and not empty.
    
    Args:
        text (str): User input to validate
    
    Returns:
        bool: True if input is valid, False otherwise
    """
    if not text or len(text.strip()) == 0:
        return False
    
    # Check if input is just punctuation or special characters
    if re.match(r'^[^a-zA-Z0-9]+$', text.strip()):
        return False
    
    return True

def contains_emotional_content(text):
    """
    Check if text contains emotional or mental health related content.
    
    Args:
        text (str): Text to check
    
    Returns:
        bool: True if emotional keywords found, False otherwise
    """
    emotional_keywords = [
        'feel', 'feeling', 'emotion', 'sad', 'happy', 'angry', 'anxious',
        'depressed', 'stressed', 'overwhelmed', 'lonely', 'scared', 'worried',
        'upset', 'frustrated', 'hopeless', 'tired', 'exhausted', 'burnout',
        'relationship', 'partner', 'family', 'friend', 'work', 'job', 'career',
        'help', 'advice', 'struggle', 'difficult', 'hard', 'problem', 'issue',
        'cope', 'manage', 'improve', 'better', 'change', 'goal', 'motivation'
    ]
    
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in emotional_keywords)
