"""
AI Client Module - Empathetic Therapy Companion
Uses GPT-2 Medium for warm, supportive, empathetic responses.
Optimized for emotional awareness and therapeutic conversation.
"""

from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch
import re

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

# GPT-2 Medium: Excellent for empathetic, natural conversation
# Works well on CPU, produces coherent emotional responses
MODEL_NAME = "gpt2-medium"  # 355MB, great for supportive dialogue

# Generation parameters - Emotionally intelligent, thoughtful responses
MAX_NEW_TOKENS = 60       # Allow complete thoughts with advice (3-4 sentences)
MIN_LENGTH = 20           # Ensure meaningful response
TEMPERATURE = 0.65        # Balanced - thoughtful but not random
TOP_P = 0.88              # Standard sampling for natural language
TOP_K = 30                # Moderate diversity for varied insights
REPETITION_PENALTY = 2.0  # Prevent repetition but allow natural flow
NO_REPEAT_NGRAM = 4       # Standard phrase blocking

# ============================================================================
# MODEL INITIALIZATION
# ============================================================================

# Track recent responses to avoid repetition
recent_responses = []

print("\n💙 Loading Therapy Companion...")
print("   Model: GPT-2 Medium (optimized for empathetic responses)")
try:
    tokenizer = GPT2Tokenizer.from_pretrained(MODEL_NAME)
    model = GPT2LMHeadModel.from_pretrained(MODEL_NAME)
    tokenizer.pad_token = tokenizer.eos_token
    print("✅ Model loaded successfully!\n")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("Please check your internet connection for first-time download.\n")
    tokenizer = None
    model = None

# System identity
THERAPIST_ROLE = """You are a warm, empathetic therapy companion who listens without judgment and provides emotional support."""

# ============================================================================
# PROMPT ENGINEERING - ANTI-MIRRORING
# ============================================================================

def _build_anti_mirror_prompt(user_message, history):
    """
    Build emotionally intelligent prompt with conversation context.
    """
    
    # Include recent conversation context if available
    context = ""
    if history and len(history) >= 2:
        # Get last exchange (last bot response and what user is responding to)
        last_bot_msg = history[-1].get('content', '') if history[-1].get('role') == 'assistant' else ''
        if last_bot_msg:
            context = f"Previously you said: \"{last_bot_msg}\"\n\n"
    
    # Encourage thoughtful, advice-oriented responses
    prompt = f"""You are an emotionally intelligent therapist having a natural conversation.

{context}User now says: \"{user_message}\"

Provide a thoughtful response with:
1. Emotional validation (1-2 sentences)
2. Practical advice or insight (1-2 sentences)  
3. Optional relevant question

Response:"""
    
    return prompt

def _clean_response(text, user_message):
    """
    Clean response and enforce STRICT brevity rules.
    """
    if not text:
        return ""
    
    text = text.strip()
    
    # Remove any label prefixes
    text = re.sub(r'^(I hear you|Therapist|Person)[.:,]?\s*', '', text, flags=re.IGNORECASE)
    
    # If response mirrors user input, cut it
    user_words = user_message.lower().split()[:5]
    text_words = text.lower().split()[:5]
    overlap = sum(1 for w in user_words if w in text_words)
    if overlap >= 3:
        sentences = text.split('.')
        if len(sentences) > 1:
            text = '. '.join(sentences[1:]).strip()
    
    # Remove leaked role labels
    text = re.sub(r'\b(Person|Therapist|Companion|Patient|User|Bot|AI):\s*', '', text)
    
    # Remove common hallucination patterns
    text = re.sub(r'\(.*?\)', '', text)  # Remove parenthetical comments
    text = re.sub(r'\[.*?\]', '', text)  # Remove bracketed text
    text = re.sub(r':.*?[)\]]', '', text)   # Remove emoticons
    text = re.sub(r'https?://\S+', '', text)  # Remove any URLs
    text = re.sub(r'www\.\S+', '', text)  # Remove websites
    
    # BANNED WORDS - medical/clinical/creative hallucinations
    banned_words = [
        'massage', 'product', 'buy', 'purchase', 'website', 'link', 'app', 'device',
        'doctor', 'medication', 'drug', 'pill', 'prescription', 'diagnose', 'diagnosis',
        'psilocybin', 'therapy', 'treatment', 'clinical', 'medical', 'physician',
        'don', 'john', 'mary', 'sarah', 'mike'  # Common name hallucinations
    ]
    for word in banned_words:
        if word in text.lower() and word not in user_message.lower():
            # Bot invented something - reject completely
            return ""  # Trigger fallback
    
    # ENFORCE BREVITY: Maximum 2 sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    if len(sentences) > 2:
        text = ' '.join(sentences[:2])
    
    # Cut at first question mark to prevent multiple rambling questions
    if text.count('?') > 1:
        first_q = text.find('?')
        text = text[:first_q + 1]
    
    # Clean up incomplete final sentence
    if text and text[-1] not in '.!?':
        last_punct = max(text.rfind('.'), text.rfind('!'), text.rfind('?'))
        if last_punct > 0:
            text = text[:last_punct + 1]
    
    return text.strip()

# ============================================================================
# MAIN AI FUNCTION - ANTI-MIRRORING OPTIMIZED
# ============================================================================

def ask_ai(user_message, history):
    """
    Generate empathetic, supportive responses.
    Uses keyword-based fallbacks for initial topics, then flows conversationally.
    """
    
    # Validate input
    if not user_message or not user_message.strip():
        return "I'm here to listen. How are you feeling today?"
    
    # Check model
    if model is None or tokenizer is None:
        return "❌ Model not loaded. Please restart."
    
    # PRIORITY: Use keyword-based fallback ONLY if no recent history
    # This allows conversation to flow after initial question
    if len(history) <= 2:  # Only use fallback for first message
        fallback = _get_contextual_fallback(user_message)
        if fallback:
            return fallback
    # For follow-up messages, check if it's clearly a new topic
    elif len(history) > 2:
        # If user message contains strong new topic keywords, use fallback
        new_topic_keywords = ['also', 'another thing', 'different topic', 'change topic', 'something else']
        if any(keyword in user_message.lower() for keyword in new_topic_keywords):
            fallback = _get_contextual_fallback(user_message)
            if fallback:
                return fallback
    
    try:
        # Build anti-mirroring prompt
        prompt = _build_anti_mirror_prompt(user_message, history)
        
        # Encode prompt with attention mask for accurate input reading
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            return_attention_mask=True,
            padding=True,
            truncation=True, 
            max_length=512
        )
        
        # Generate with anti-repetition settings
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,  # Pass attention mask
                max_new_tokens=MAX_NEW_TOKENS,
                min_length=MIN_LENGTH,
                temperature=TEMPERATURE,
                top_p=TOP_P,
                top_k=TOP_K,
                repetition_penalty=REPETITION_PENALTY,  # Prevent copying
                no_repeat_ngram_size=NO_REPEAT_NGRAM,  # No phrase repetition
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                early_stopping=False,  # Let it complete thoughts
            )
        
        # Decode only the NEW tokens (not the prompt)
        generated = outputs[0][inputs.input_ids.shape[1]:]
        response = tokenizer.decode(generated, skip_special_tokens=True)
        
        # Clean response (remove any mirroring)
        response = _clean_response(response, user_message)
        
        # Cut at first line break to prevent rambling
        if '\n' in response:
            response = response.split('\n')[0]
        
        # STRICT hallucination detection - medical, clinical, creative content
        hallucination_triggers = [
            'massage', 'product', 'buy', 'website', 'app', 'device', 'vitamin', 'medication',
            'doctor', 'dr.', 'physician', 'drug', 'pill', 'prescription', 'psilocybin',
            'diagnose', 'diagnosis', 'treatment', 'clinical', 'medical',
            'emergency', 'hospital', 'clinic',
            # Common name hallucinations
            'don', 'john', 'mary', 'sarah', 'mike', 'tom', 'jane', 'bob'
        ]
        user_lower = user_message.lower()
        response_lower = response.lower()
        for trigger in hallucination_triggers:
            if trigger in response_lower and trigger not in user_lower:
                # Bot invented something - use fallback
                return _get_fallback_response(user_message)
        
        # Reject if response introduces proper nouns user didn't mention
        response_words = response.split()
        for word in response_words:
            if word and len(word) > 1 and word[0].isupper() and word.lower() not in user_lower and word not in ['I', 'What', 'How', 'That', 'Maybe', 'Try', 'It']:
                # Bot invented a name or place
                return _get_fallback_response(user_message)
        
        # If response contains excessive punctuation or caps, use fallback
        if response.count('!') > 1 or response.count('?') > 1:
            return _get_fallback_response(user_message)
        
        caps_count = sum(1 for c in response if c.isupper())
        if len(response) > 0 and caps_count > len(response) * 0.3:
            return _get_fallback_response(user_message)
        
        # Validate response quality and coherence
        if not response or len(response) < 15:
            return _get_fallback_response(user_message)
        
        # Ensure response has substance (not just a question)
        if len(response) < 30:
            # Very short response - should have more content
            return _get_fallback_response(user_message)
        
        # Ensure it doesn't start with the user's question
        if response.lower().startswith(user_message.lower()[:20]):
            return _get_fallback_response(user_message)
        
        # If response doesn't relate to user's topic, reject it
        # Check if key words from user message appear in response or if response is generic enough
        user_words = set(user_message.lower().split())
        response_words = set(response.lower().split())
        # Remove common words
        common = {'i', 'me', 'my', 'the', 'a', 'an', 'to', 'for', 'of', 'and', 'or', 'but', 'is', 'are', 'was', 'were'}
        user_keywords = user_words - common
        
        # Response should either mention user's topic OR be a generic supportive question
        has_overlap = len(user_keywords & response_words) > 0
        is_generic = any(phrase in response.lower() for phrase in ['what', 'how', 'tell me', 'been going', 'on your mind'])
        
        if not has_overlap and not is_generic and len(user_keywords) > 0:
            return _get_fallback_response(user_message)
        
        return response
        
    except Exception as e:
        print(f"\n⚠️  Generation error: {e}")
        return _get_fallback_response(user_message)

# ============================================================================
# RESPONSE VARIETY HELPERS
# ============================================================================

def _pick_varied_response(templates):
    """
    Pick a response that wasn't recently used.
    """
    global recent_responses
    
    # Filter out recently used responses
    available = [t for t in templates if t not in recent_responses[-3:]]
    
    # If all were recently used, use any
    if not available:
        available = templates
    
    # Pick first available (or rotate through them)
    response = available[0]
    
    # Track this response
    recent_responses.append(response)
    if len(recent_responses) > 10:
        recent_responses.pop(0)
    
    return response

# ============================================================================
# FALLBACK RESPONSES - KEYWORD-BASED SYSTEM
# ============================================================================

def _get_contextual_fallback(message):
    """
    Keyword-based responses for common real-life topics.
    Returns None if no match (then use generation).
    Multiple templates for variety.
    """
    msg_lower = message.lower()
    
    # Money/financial stress - with practical guidance
    if any(word in msg_lower for word in ['money', 'financial', 'bills', 'debt', 'expense', 'afford', 'pay', 'broke']):
        templates = [
            "Financial stress is really tough and can affect everything else in life. One helpful step is writing down all your expenses and income to see exactly where you stand—it can feel scary but gives you clarity and control. What's been the biggest source of financial pressure for you?",
            "Money worries can feel overwhelming. Breaking things down into smaller steps—like focusing on one bill at a time or finding one small way to cut costs—can make it more manageable. Have you looked at your budget recently?",
            "That's a heavy burden. Financial stress impacts mental health significantly. Sometimes talking to a financial advisor or even using free budgeting tools can help you see options you might have missed. What feels most urgent right now?"
        ]
        return _pick_varied_response(templates)
    
    # Relationship improvement/goals - specific actionable advice
    if any(word in msg_lower for word in ['improve', 'better', 'fix', 'strengthen', 'how do i']) and any(word in msg_lower for word in ['relationship', 'marriage', 'partner']):
        templates = [
            "It's great that you want to strengthen your relationship. Real improvement often starts with listening more actively and expressing genuine appreciation for the small things. Regular check-ins where both people feel heard can make a huge difference. What would your ideal relationship with them look like? What's one thing that feels missing right now?",
            "Working on relationships takes intention and effort, which shows you care. Focus on quality time together, honest communication about needs, and being curious about your partner's perspective rather than defensive. Have you talked with them about wanting to improve things? What do you think they would say they need from the relationship?",
            "That's a positive and mature step. Many strong relationships benefit from setting aside dedicated time each week to connect without distractions. What aspect of the relationship feels like it needs the most attention? How does the current state of your relationship affect your happiness or stress?"
        ]
        return _pick_varied_response(templates)
    
    # Personal growth/happiness/self-improvement
    if any(word in msg_lower for word in ['improve myself', 'better person', 'grow', 'change myself', 'self-improvement', 'be happier', 'want to be happy', 'happier']):
        if 'happier' in msg_lower or 'happy' in msg_lower:
            templates = [
                "Wanting happiness is a meaningful starting point. A lot of people find that improving small daily habits—sleep, routine, exercise, or even reducing negative influences—makes a big difference. What part of your life feels like it needs the most attention right now? When was the last time you felt truly content?",
                "That's a great goal. Happiness often comes from building positive habits and reducing things that drain you. What areas of your life feel most satisfying right now, and what feels lacking? What does happiness look like for you?"
            ]
            return _pick_varied_response(templates)
        templates = [
            "Wanting to grow shows real self-awareness. Change starts with small, consistent steps rather than big overnight shifts. What aspect of yourself would you most like to develop? What's the first small step you could take toward that?",
            "That's really positive. Self-improvement is about progress, not perfection. What made you want to work on yourself right now? What motivates you most to make this change?"
        ]
        return _pick_varied_response(templates)
    
    # Coworkers/colleagues - with emotional intelligence and practical advice
    if any(word in msg_lower for word in ['coworker', 'co-worker', 'colleague', 'people at work', 'deal with them', 'how do i deal']):
        if any(word in msg_lower for word in ['mean', 'rude', 'toxic', 'bad', 'horrible', 'asshole']):
            templates = [
                "That sounds exhausting. When coworkers create a negative environment, it really affects your mood and energy. One approach is setting small boundaries and limiting how much their behavior impacts you emotionally. Has anything specific been happening that's been hardest to handle?",
                "Dealing with difficult people at work is draining. It helps to focus on what you can control—your reactions, your boundaries, and how much space you give their negativity in your mind. Have you tried any strategies so far?",
                "That's a tough situation. Toxic coworkers can make every day feel heavy. Sometimes it helps to document specific incidents and consider whether talking to a supervisor could improve things. What's been the most challenging part for you?"
            ]
            return _pick_varied_response(templates)
        templates = [
            "Work relationships can be complex. Even small conflicts can affect how you feel about your job. What's been happening that's bothering you?",
            "I hear you. Colleague dynamics can be tricky to navigate. Are there specific interactions that have been difficult?"
        ]
        return _pick_varied_response(templates)
    
    # Cleaning/physical work
    if any(word in msg_lower for word in ['clean', 'cleaning', 'wash', 'washing']):
        if 'car' in msg_lower:
            templates = [
                "Cleaning cars can be exhausting work. What's been the hardest part of the job for you?",
                "That sounds like tiring work. How are you handling it?",
                "Physical work like that can be draining. What makes it most difficult?"
            ]
            return _pick_varied_response(templates)
        templates = [
            "That kind of work can be tiring. How are you managing?",
            "That sounds exhausting. How long have you been doing this kind of work?"
        ]
        return _pick_varied_response(templates)
    
    # Loss/grief (check carefully)
    if any(word in msg_lower for word in ['lost', 'died', 'passed away', 'death']):
        return "I'm so sorry for your loss. That must be incredibly difficult. How are you holding up?"
    
    # Negative feelings about people
    if any(word in msg_lower for word in ['asshole', 'jerk', 'hate them', 'can\'t stand']):
        return "That sounds really frustrating. What's been bothering you most about the situation?"
    
    # Specific work complaints
    if 'job' in msg_lower and any(word in msg_lower for word in ['hate', 'don\'t like', 'terrible', 'awful']):
        templates = [
            "I hear you — job dissatisfaction is really draining. What specifically about your job makes you unhappy? If you could change one thing tomorrow, what would it be?",
            "That sounds really frustrating. What part bothers you the most? How does this job affect your mental health and life outside of work?",
            "Work dissatisfaction can affect everything. Have you thought about what you'd prefer to do? What would your ideal workday look like?"
        ]
        return _pick_varied_response(templates)
    
    # Relationships (romantic)
    if any(word in msg_lower for word in ['boyfriend', 'girlfriend', 'partner', 'husband', 'wife', 'dating']):
        if any(word in msg_lower for word in ['fight', 'argument', 'broke up', 'cheated']):
            templates = [
                "Relationship problems are so painful. What happened?",
                "That sounds really hard. Do you want to talk about it?",
                "I'm sorry you're going through this. How are you feeling?"
            ]
            return _pick_varied_response(templates)
        templates = [
            "Relationships can be complicated. What's on your mind?",
            "I'm here to listen. What's happening in your relationship?",
            "That's important. What would you like to talk about?"
        ]
        return _pick_varied_response(templates)
    
    # Goals/future
    if any(word in msg_lower for word in ['goal', 'future', 'want to', 'hope to', 'dream']):
        templates = [
            "It's great that you're thinking about your goals. What are you hoping to achieve?",
            "That's a positive mindset. What's your first step toward that goal?",
            "I love that you're thinking ahead. What would success look like for you?"
        ]
        return _pick_varied_response(templates)
    
    # Family issues
    if any(word in msg_lower for word in ['mom', 'dad', 'mother', 'father', 'parent', 'family', 'sibling', 'brother', 'sister']):
        if any(word in msg_lower for word in ['fight', 'argument', 'angry', 'hate']):
            templates = [
                "Family conflicts can be really hard. What's been going on?",
                "That sounds difficult. What happened?",
                "Family issues are tough. Do you want to talk about it?"
            ]
            return _pick_varied_response(templates)
        templates = [
            "Family relationships can be complex. What's happening?",
            "I'm listening. What's going on with your family?",
            "Family can be complicated. What's on your mind?"
        ]
        return _pick_varied_response(templates)
    
    # No specific match - return None to use generation
    return None

def _get_fallback_response(question):
    """
    Empathetic fallback responses WITH helpful suggestions.
    """
    q_lower = question.lower()
    
    # Substance use & addiction concerns
    if any(word in q_lower for word in ['drink too much', 'drinking', 'alcohol', 'drugs', 'substance', 'addiction', 'addicted']):
        if 'quit' in q_lower or 'stop' in q_lower:
            if 'smoking' in q_lower or 'vaping' in q_lower or 'cigarette' in q_lower:
                return "Quitting smoking or vaping is one of the best things you can do for your health. Many people succeed by setting a quit date, identifying triggers, and using nicotine replacement if needed. Have you tried quitting before?"
            return "Deciding to quit or cut back shows strength. Start by tracking when and why you use, identify triggers, and build healthier coping strategies. Support groups and counselors who specialize in addiction can make a huge difference. What's your biggest concern about quitting?"
        if 'relapse' in q_lower:
            return "Relapse is often part of recovery, not a failure. What matters is getting back on track and learning what triggered it so you can plan differently next time. Have you been able to reach out to your support system?"
        if 'loved one' in q_lower or 'someone' in q_lower or 'friend' in q_lower or 'family' in q_lower:
            return "Supporting someone with addiction is emotionally exhausting. You can't force them to change, but you can set boundaries, avoid enabling, and encourage them to seek help. How has their use been affecting you?"
        return "Recognizing that your substance use concerns you is an important first step. Tracking how much and how often you use, and noticing how it impacts your life, can help you decide what changes feel right. Can you describe what usually leads to your use? What would motivate you to make a change?"
    
    # Crisis detection
    if any(word in q_lower for word in ['suicid', 'kill myself', 'end it', 'die', 'want to die', 'live anymore', 'end my life']):
        return "I'm really concerned about you. Please call 988 right now. They're available 24/7. You don't have to face this alone."
    
    # Anxiety & panic
    if any(word in q_lower for word in ['anxious', 'anxiety', 'worried', 'worry', 'nervous', 'panic']):
        if 'panic' in q_lower or 'attack' in q_lower:
            return "Panic attacks are frightening and exhausting. Grounding techniques like the 5-4-3-2-1 method (name 5 things you see, 4 you touch, etc.) can help in the moment. Can you tell me more about when these attacks tend to happen? Are there specific triggers you've noticed?"
        return "Anxiety can feel overwhelming and affect everything you do. Deep breathing, regular exercise, and limiting caffeine can help manage it day-to-day. What's happening in your life right now that might be contributing to this anxiety? How does it affect your daily routine?"
    
    # Depression & hopelessness
    if any(word in q_lower for word in ['depressed', 'depression', 'hopeless', 'giving up', 'can\'t cope']):
        if 'giving up' in q_lower or 'hopeless' in q_lower:
            return "Feeling hopeless is incredibly difficult and I'm glad you're talking about it. These feelings can be temporary even when they feel permanent. Please consider reaching out to a counselor or calling 988. What's been making life feel so overwhelming right now? Is there anyone in your life you feel comfortable talking to?"
        return "Depression can make everything feel heavier and harder. Small steps like getting outside, talking to someone you trust, or maintaining a routine can help, even when motivation is low. When did you first notice yourself feeling this way? What was happening in your life around that time?"
    
    # Sadness & loneliness
    if any(word in q_lower for word in ['sad', 'lonely', 'empty', 'isolated']):
        if 'lonely' in q_lower or 'isolated' in q_lower:
            return "Loneliness can be really painful, especially when it feels like no one understands. Reaching out to old friends, joining groups around your interests, or even volunteering can help you connect. Can you tell me more about what your social life looks like right now? What kind of connection do you find yourself craving most?"
        return "Sadness is a valid emotion and it's okay to sit with it sometimes. Journaling, talking to someone, or doing something small that usually brings you comfort can help. Can you tell me more about what made you feel this way today? Have you felt like this before, and how did you cope then?"    # Stress, burnout & feeling overwhelmed
    if any(word in q_lower for word in ['stressed', 'stress', 'overwhelmed', 'too much', 'pressure', 'burnout', 'burned out']):
        if 'burnout' in q_lower or 'burned out' in q_lower:
            return "Burnout is your body and mind telling you they need rest. It often requires real changes like setting boundaries, reducing commitments, or taking time off. What areas of your life feel most draining right now? What would rest and recovery actually look like for you?"
        if 'overwhelmed' in q_lower:
            return "Feeling overwhelmed often means too much is happening at once. Breaking tasks into smaller pieces and tackling one thing at a time can help you regain a sense of control. What feels most urgent to you right now? What would it feel like if just one of those things was resolved?"
        return "Stress can build up when we don't have time to process or recover. Regular breaks, physical activity, and saying no to extra commitments can help you manage it. What's been the biggest source of stress lately? How does this stress show up in your body or behavior?"
    
    # Shame & guilt
    if any(word in q_lower for word in ['guilty', 'ashamed', 'shame', 'feel bad about']):
        if any(word in q_lower for word in ['substance', 'drinking', 'using', 'relapse']):
            return "Shame and guilt often accompany substance use, but those feelings can actually make recovery harder. Be compassionate with yourself—addiction is complex. What matters is what you do next. What kind of support do you have?"
        return "Guilt can be overwhelming and keep you stuck in the past. If you've hurt someone, making amends when possible can help. Otherwise, focus on learning from it and moving forward with different choices. What's weighing on you?"
    
    # Anger
    if any(word in q_lower for word in ['angry', 'mad', 'frustrated', 'annoyed', 'upset']):
        return "That sounds frustrating. Maybe take a moment to breathe. What happened?"
    
    # Career switches & fulfillment
    if any(word in q_lower for word in ['career', 'switch careers', 'fulfillment', 'promotion', 'interview']):
        if 'switch' in q_lower or 'change' in q_lower:
            return "Career changes are scary but can be rewarding. Research the field, talk to people already in it, and consider if you can transition gradually. What's drawing you to make a change?"
        if 'promotion' in q_lower:
            return "Wanting advancement is natural. Document your achievements, take on visible projects, and have a conversation with your manager about your goals. What do you think is holding you back from that next step?"
        if 'interview' in q_lower:
            return "Interview nerves are normal. Prepare by researching the company, practicing common questions, and remembering they already think you're qualified or they wouldn't interview you. What part makes you most nervous?"
        return "Career dissatisfaction can drain you. Reflect on what's missing—growth, purpose, compensation, environment—and whether it can improve where you are or if it's time to explore elsewhere. What would make work feel more fulfilling?"
    
    # Need advice/help/who to talk to
    if any(word in q_lower for word in ['advice', 'help', 'what do i do', 'how do i', 'what should i do', 'who should i talk', 'need help', 'guidance']):
        if 'talk' in q_lower or 'who' in q_lower:
            return "Talking to someone you trust—a friend, family member, or counselor—can provide perspective you can't see alone. What feels right to you?"
        return "I'm here to listen and help you think through this. What's been going on?"
    
    # Relationships
    if any(word in q_lower for word in ['relationship', 'partner', 'boyfriend', 'girlfriend', 'husband', 'wife']):
        return "That sounds really hard. Maybe try talking through it calmly. What's going on?"
    
    # Detailed employment issues
    if any(word in q_lower for word in ['unappreciated', 'undervalued', 'underpaid', 'not recognized']):
        return "Feeling unappreciated at work is demoralizing and affects your motivation. Documenting your contributions and having a direct conversation about recognition or compensation can help. If nothing changes, it might signal it's time to explore other options. What would make you feel valued?"
    
    if any(word in q_lower for word in ['boss', 'manager', 'supervisor']) and any(word in q_lower for word in ['difficult', 'bad', 'toxic', 'problem']):
        return "A difficult boss can make every workday stressful. Focus on clear communication, document important conversations, and set boundaries where possible. If the situation is toxic, consider whether HR or a job change might be necessary. What's been most challenging about working with them?"
    
    if any(word in q_lower for word in ['fired', 'losing my job', 'laid off', 'job security']):
        return "Job insecurity creates constant anxiety. Updating your resume, expanding your network, and saving what you can are practical steps. Remember that your worth isn't defined by your employment status. What's making you worry about your job?"
    
    if any(word in q_lower for word in ['work-life balance', 'overworked', 'too many hours', 'no time']):
        return "Poor work-life balance leads to burnout quickly. Setting boundaries around work hours, learning to say no, and prioritizing personal time are essential. Sometimes it requires a hard conversation about workload. What's taking up most of your time?"
    
    if any(word in q_lower for word in ['bullied', 'harassment', 'discriminat', 'hostile']):
        return "Bullying, harassment, or discrimination at work is unacceptable and illegal in many cases. Document specific incidents with dates and details, and report to HR or a trusted authority. You deserve a safe work environment. What's been happening?"
    
    if any(word in q_lower for word in ['deadline', 'behind', 'can\'t keep up']):
        return "Struggling with deadlines often means too much is on your plate or time management needs adjustment. Breaking projects into smaller tasks, asking for help, or negotiating timelines can relieve pressure. What feels most overwhelming right now?"
    
    # General work/school problems
    if any(word in q_lower for word in ['work', 'job', 'school', 'study', 'exam', 'mean at work', 'don\'t like my job', 'hate my job', 'coworker']):
        if any(word in q_lower for word in ['clean', 'wash', 'car']):
            return "That kind of work can be exhausting. What's been the hardest part?"
        return "That sounds stressful. What's been bothering you about it?"
    
    # Sleep issues
    if any(word in q_lower for word in ['sleep', 'insomnia', 'can\'t sleep']):
        return "Poor sleep affects everything—mood, energy, focus. A consistent bedtime routine, limiting screens before bed, and keeping your room cool and dark can help. How long have you been struggling with sleep?"
    
    # Fatigue & exhaustion
    if any(word in q_lower for word in ['tired', 'exhausted', 'drained', 'no energy']):
        return "Chronic exhaustion can come from poor sleep, stress, or burnout. Make sure you're getting enough rest, eating regularly, and not overcommitting yourself. What do you think might be draining your energy?"
    
    # Exercise & health
    if any(word in q_lower for word in ['exercise', 'work out', 'healthy', 'eat better', 'self-care']):
        return "Taking care of your physical health impacts your mental health significantly. Start small—even a 10-minute walk or one healthier meal choice per day builds momentum. What feels most manageable for you to start with?"
    
    # Learning & skills
    if any(word in q_lower for word in ['learn', 'skill', 'study', 'exam', 'school']):
        if 'exam' in q_lower or 'test' in q_lower:
            return "Test anxiety is common and can interfere with performance. Practice questions, good sleep, and remembering you've prepared can help calm nerves. What subject or test is coming up?"
        return "Learning new skills takes consistency and patience with yourself. Break it into small daily practice sessions rather than trying to master it all at once. What skill are you interested in developing?"
    
    # Everyday frustrations
    if any(word in q_lower for word in ['annoyed', 'frustrated', 'bad day', 'vent']):
        return "Sometimes you just need to vent and that's completely valid. Bad days and frustrations are part of life. What happened that's been bothering you?"
    
    # Confusion/not understanding bot or bot mishearing
    if any(word in q_lower for word in ['don\'t understand', 'not making sense', 'what are you saying', 'who is', 'who are you', 'did not', 'didn\'t say', 'never said']):
        return "I apologize if I misunderstood. Can you tell me more about what's been going on?"
    
    # Decision-making & confusion
    if any(word in q_lower for word in ['don\'t know what to do', 'can\'t decide', 'decision', 'confused', 'conflicted', 'choice']):
        return "Making decisions can feel paralyzing, especially when outcomes matter. Sometimes writing pros and cons, imagining yourself in each scenario, or asking what your future self would appreciate can bring clarity. What options are you considering? What matters most to you in making this choice? What are you most afraid of?"
    
    # Feeling stuck or lost
    if any(word in q_lower for word in ['stuck', 'lost', 'don\'t know', 'pointless', 'meaning']):
        if 'meaning' in q_lower or 'pointless' in q_lower or 'purpose' in q_lower:
            return "Questioning meaning is deeply human. Many people find purpose through connecting with others, contributing to causes they care about, or pursuing growth. What brings you moments of fulfillment, even small ones?"
        return "Feeling stuck or lost is uncomfortable but often signals it's time for a change. Exploring what's missing—connection, challenge, creativity, growth—can help you find direction. What area of your life feels most stagnant?"
    
    # Motivation & procrastination
    if any(word in q_lower for word in ['procrastinat', 'unmotivated', 'motivation', 'can\'t get anything done', 'lazy']):
        return "Lack of motivation often comes from feeling overwhelmed, unclear goals, or burnout. Start with the tiniest possible step—just 5 minutes of the task. Momentum builds from action, not the other way around. What's one thing you've been putting off? What makes it hard to start? What would it feel like to have that task done?"
    
    # Habits & discipline
    if any(word in q_lower for word in ['habit', 'discipline', 'productive', 'focus']):
        return "Building habits takes consistency, not perfection. Start small, attach new habits to existing routines, and focus on showing up daily rather than doing it perfectly. What habit would make the biggest difference for you?"
    
    # Self-esteem & confidence
    if any(word in q_lower for word in ['confidence', 'self-esteem', 'believe in myself', 'good enough']):
        return "Building confidence comes from taking action despite fear and proving to yourself that you can handle challenges. Celebrate small wins and stop comparing yourself to others' highlight reels. What would help you feel more capable?"
    
    # Social anxiety & awkwardness
    if any(word in q_lower for word in ['social anxiety', 'awkward', 'shy', 'meet people', 'make friends']):
        return "Social situations can feel intimidating, especially when you're worried about being judged. Remember that most people are focused on themselves, not analyzing you. Small interactions like asking questions can make conversations easier. What social situations feel hardest for you?"
    
    # Identity & authenticity
    if any(word in q_lower for word in ['who i am', 'identity', 'authentic', 'myself']):
        return "Questioning your identity can be unsettling but it's also an opportunity for growth. Exploring your values, what energizes you, and what feels genuine can help you reconnect with yourself. What feels most out of alignment with who you want to be?"
    
    # Life changes & transitions
    if any(word in q_lower for word in ['moving', 'new city', 'new job', 'broke up', 'loss', 'change']):
        return "Major life changes are disorienting even when they're positive. Give yourself time to adjust and be patient with the discomfort. Establishing small routines can help create stability. What's been the hardest part of this transition?"
    
    # Cravings management
    if any(word in q_lower for word in ['craving', 'urge', 'tempted', 'want to use']):
        return "Cravings are intense but temporary—they usually peak and pass within 15-30 minutes. Distraction, calling someone, going for a walk, or using the 'surf the urge' technique can help you ride them out. What usually triggers your cravings?"
    
    # General
    return "I'm here to listen. What's on your mind?"

# ============================================================================
# HEALTH CHECK
# ============================================================================

def is_model_ready():
    """Check if model is loaded."""
    return model is not None and tokenizer is not None
