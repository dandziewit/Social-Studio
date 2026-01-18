import tkinter as tk
from tkinter import font, scrolledtext
import re
from sympy import symbols, solve, sympify, simplify, Eq
from sympy.parsing.sympy_parser import parse_expr
import traceback

# ============================================================================
# ROBUST AI WORD-PROBLEM REASONING ENGINE
# ============================================================================

class WordProblemEntity:
    """Represents an extracted entity from a word problem."""
    def __init__(self, value, unit=None, variable=None, description=""):
        self.value = value
        self.unit = unit
        self.variable = variable
        self.description = description
    
    def __repr__(self):
        return f"Entity({self.description}: {self.value}{self.unit or ''}, var={self.variable})"

class MathAI:
    """
    Production-grade AI reasoning engine for word problems.
    Follows a systematic pipeline: Parse → Classify → Extract → Build → Solve → Explain
    """
    
    def __init__(self):
        self.history = []
        self.confidence_threshold = 0.7
        
        # Keyword mappings for translation
        self.operation_keywords = {
            'addition': ['plus', 'add', 'sum', 'total', 'combined', 'altogether', 'more than', 'increase'],
            'subtraction': ['minus', 'subtract', 'difference', 'less than', 'decrease', 'remove', 'left', 'remaining'],
            'multiplication': ['times', 'multiply', 'product', 'of', 'per', 'at', 'each', 'twice', 'double', 'triple'],
            'division': ['divide', 'divided by', 'split', 'share', 'per', 'each', 'half', 'third']
        }
        
        self.comparison_keywords = {
            'twice': 2,
            'double': 2,
            'triple': 3,
            'half': 0.5,
            'third': 1/3,
            'quarter': 0.25
        }
    
    def process_query(self, query):
        """
        Main reasoning pipeline for word problems.
        Returns: (result, explanation, success)
        """
        try:
            if not query or not query.strip():
                return "", "Please enter a question.", False
            
            # STEP 1: Parse and clean input
            parsed = self.parse_input(query)
            
            # STEP 2: Classify problem type
            problem_type, confidence = self.classify_problem(parsed)
            
            # STEP 3: Route to appropriate solver based on type
            if problem_type == "percentage":
                result, explanation = self.solve_percentage_advanced(parsed)
            elif problem_type == "equation":
                result, explanation = self.solve_equation_advanced(parsed)
            elif problem_type == "rate":
                result, explanation = self.solve_rate_problem(parsed)
            elif problem_type == "comparison":
                result, explanation = self.solve_comparison_problem(parsed)
            elif problem_type == "multi_step":
                result, explanation = self.solve_multi_step(parsed)
            elif problem_type == "average":
                result, explanation = self.solve_average_advanced(parsed)
            else:
                result, explanation = self.solve_arithmetic_advanced(parsed)
            
            # Add confidence to explanation
            if confidence < 0.8:
                explanation += f"\n\n(Confidence: {confidence:.0%} - If incorrect, try rephrasing)"
            
            # Store in history
            self.history.append({
                'query': query,
                'result': result,
                'explanation': explanation,
                'type': problem_type,
                'confidence': confidence
            })
            
            return result, explanation, True
            
        except Exception as e:
            error_msg = f"Error: {str(e)}\n\nTry rephrasing your question with clear numbers and relationships."
            return "", error_msg, False
    
    # ========================================================================
    # STEP 1: PARSE AND CLEAN INPUT
    # ========================================================================
    
    def parse_input(self, query):
        """
        Parse and normalize input text.
        Returns dict with: original, cleaned, numbers, keywords, etc.
        """
        parsed = {
            'original': query,
            'cleaned': query.lower().strip(),
            'numbers': [],
            'entities': [],
            'keywords': [],
            'has_variable': False
        }
        
        # Extract numbers (including decimals and percentages)
        number_pattern = r'\d+\.?\d*'
        numbers = re.findall(number_pattern, query)
        parsed['numbers'] = [float(n) for n in numbers]
        
        # Check for variables
        if any(var in parsed['cleaned'] for var in ['x', 'y', 'unknown', 'what number', 'how many', 'how much']):
            parsed['has_variable'] = True
        
        # Extract keywords
        for op_type, keywords in self.operation_keywords.items():
            for keyword in keywords:
                if keyword in parsed['cleaned']:
                    parsed['keywords'].append((keyword, op_type))
        
        return parsed
    
    # ========================================================================
    # STEP 2: CLASSIFY PROBLEM TYPE
    # ========================================================================
    
    def classify_problem(self, parsed):
        """
        Classify the problem type with confidence score.
        Returns: (type, confidence)
        """
        query = parsed['cleaned']
        confidence = 1.0
        
        # Sequential/multi-step (highest priority)
        if any(word in query for word in ['then', 'after that', 'first', 'next', 'finally']):
            return "multi_step", 0.95
        
        # Percentage problems
        if any(word in query for word in ['%', 'percent', 'percentage', 'discount', 'tax', 'tip']):
            return "percentage", 0.95
        
        # Equation problems (has variable and equals)
        if parsed['has_variable'] and '=' in query:
            return "equation", 0.95
        
        # Comparison problems
        comparison_keywords = ['twice', 'double', 'triple', 'half', 'times as much', 'more than', 'less than']
        if any(word in query for word in comparison_keywords):
            return "comparison", 0.90
        
        # Rate problems (wage, speed, cost per item)
        rate_indicators = ['per', 'an hour', 'per hour', 'each', 'at']
        work_context = ['work', 'worked', 'earn', 'make', 'buy', 'cost', 'speed', 'dollar', '$']
        
        if any(ind in query for ind in rate_indicators) and any(ctx in query for ctx in work_context):
            return "rate", 0.92
        
        # Average/statistics
        if any(word in query for word in ['average', 'mean', 'median']):
            return "average", 0.95
        
        # Default to arithmetic
        if len(parsed['numbers']) >= 2:
            confidence = 0.70
        else:
            confidence = 0.50
        
        return "arithmetic", confidence
    
    # ========================================================================
    # SOLVER: RATE PROBLEMS (wages, speed, cost per item)
    # ========================================================================
    
    def solve_rate_problem(self, parsed):
        """
        Solve rate-based word problems.
        Pattern: rate × quantity = total
        """
        explanation = "🔍 RATE PROBLEM SOLVER\n" + "="*50 + "\n\n"
        
        numbers = parsed['numbers']
        query = parsed['cleaned']
        
        if len(numbers) < 2:
            return "Error", "Need at least 2 numbers for rate problems (rate and quantity)"
        
        rate = numbers[0]
        quantity = numbers[1]
        
        # Identify what we're calculating
        wage_context = any(w in query for w in ['work', 'worked', 'earn', 'make', 'pay', 'wage', 'salary'])
        shopping_context = any(w in query for w in ['buy', 'bought', 'purchase', 'item', 'cost'])
        
        result = rate * quantity
        
        explanation += "STEP 1: Identify the rate and quantity\n"
        if wage_context:
            explanation += f"  • Rate: ${rate}/hour\n"
            explanation += f"  • Hours worked: {quantity}\n"
        elif shopping_context:
            explanation += f"  • Price per item: ${rate}\n"
            explanation += f"  • Number of items: {quantity}\n"
        else:
            explanation += f"  • Rate: {rate}\n"
            explanation += f"  • Quantity: {quantity}\n"
        
        explanation += f"\nSTEP 2: Apply formula: Total = Rate × Quantity\n"
        explanation += f"  • Calculation: {rate} × {quantity} = {result}\n"
        
        if '$' in parsed['original'] or 'dollar' in query:
            explanation += f"\n✓ ANSWER: ${result:,.2f}"
            return f"${result:,.2f}", explanation
        else:
            explanation += f"\n✓ ANSWER: {result}"
            return str(result), explanation
    
    # ========================================================================
    # SOLVER: COMPARISON PROBLEMS (twice, half, more than, etc.)
    # ========================================================================
    
    def solve_comparison_problem(self, parsed):
        """Solve comparison word problems with relationships."""
        explanation = "🔍 COMPARISON PROBLEM SOLVER\n" + "="*50 + "\n\n"
        
        query = parsed['cleaned']
        numbers = parsed['numbers']
        
        # Extract comparison keywords
        for keyword, multiplier in self.comparison_keywords.items():
            if keyword in query:
                if numbers:
                    base_value = numbers[0]
                    result = base_value * multiplier
                    
                    explanation += f"STEP 1: Identify the comparison\n"
                    explanation += f"  • Base value: {base_value}\n"
                    explanation += f"  • Comparison: '{keyword}' means × {multiplier}\n\n"
                    explanation += f"STEP 2: Calculate\n"
                    explanation += f"  • {base_value} × {multiplier} = {result}\n"
                    explanation += f"\n✓ ANSWER: {result}"
                    
                    return str(result), explanation
        
        # Handle "X more than Y" or "X less than Y"
        if 'more than' in query and len(numbers) >= 2:
            result = numbers[1] + numbers[0]
            explanation += f"STEP 1: '{numbers[0]} more than {numbers[1]}'\n"
            explanation += f"STEP 2: Add: {numbers[1]} + {numbers[0]} = {result}\n"
            explanation += f"\n✓ ANSWER: {result}"
            return str(result), explanation
        
        if 'less than' in query and len(numbers) >= 2:
            result = numbers[1] - numbers[0]
            explanation += f"STEP 1: '{numbers[0]} less than {numbers[1]}'\n"
            explanation += f"STEP 2: Subtract: {numbers[1]} - {numbers[0]} = {result}\n"
            explanation += f"\n✓ ANSWER: {result}"
            return str(result), explanation
        
        return "Error", "Could not parse comparison. Try: 'twice 50' or '10 more than 30'"
    
    # ========================================================================
    # SOLVER: PERCENTAGE PROBLEMS (discounts, tax, tips, etc.)
    # ========================================================================
    
    def solve_percentage_advanced(self, parsed):
        """Advanced percentage problem solver."""
        explanation = "🔍 PERCENTAGE PROBLEM SOLVER\n" + "="*50 + "\n\n"
        
        query = parsed['cleaned']
        numbers = parsed['numbers']
        
        if len(numbers) < 2:
            return "Error", "Need at least 2 numbers for percentage problems"
        
        # Pattern 1: "X% of Y"
        if 'of' in query:
            percent = numbers[0]
            value = numbers[1]
            result = (percent / 100) * value
            
            explanation += "STEP 1: Identify percentage and value\n"
            explanation += f"  • Percentage: {percent}%\n"
            explanation += f"  • Value: {value}\n\n"
            explanation += f"STEP 2: Convert percentage to decimal\n"
            explanation += f"  • {percent}% = {percent}/100 = {percent/100}\n\n"
            explanation += f"STEP 3: Multiply\n"
            explanation += f"  • {percent/100} × {value} = {result}\n"
            explanation += f"\n✓ ANSWER: {result}"
            
            return str(result), explanation
        
        # Pattern 2: "increase/decrease by X%"
        if 'increase' in query or 'raise' in query or 'add' in query:
            value = numbers[0]
            percent = numbers[1] if len(numbers) > 1 else numbers[0]
            change = (percent / 100) * value
            result = value + change
            
            explanation += f"STEP 1: Calculate {percent}% of {value}\n"
            explanation += f"  • {percent}/100 × {value} = {change}\n\n"
            explanation += f"STEP 2: Add to original\n"
            explanation += f"  • {value} + {change} = {result}\n"
            explanation += f"\n✓ ANSWER: {result}"
            
            return str(result), explanation
        
        if 'decrease' in query or 'discount' in query or 'reduce' in query:
            value = numbers[0]
            percent = numbers[1] if len(numbers) > 1 else numbers[0]
            change = (percent / 100) * value
            result = value - change
            
            explanation += f"STEP 1: Calculate {percent}% of {value}\n"
            explanation += f"  • {percent}/100 × {value} = {change}\n\n"
            explanation += f"STEP 2: Subtract from original\n"
            explanation += f"  • {value} - {change} = {result}\n"
            explanation += f"\n✓ ANSWER: {result}"
            
            return str(result), explanation
        
        # Default: assume "X% of Y"
        result = (numbers[0] / 100) * numbers[1]
        explanation += f"Calculating {numbers[0]}% of {numbers[1]} = {result}\n"
        explanation += f"\n✓ ANSWER: {result}"
        return str(result), explanation
    
    # ========================================================================
    # SOLVER: EQUATION PROBLEMS (symbolic algebra)
    # ========================================================================
    
    def solve_equation_advanced(self, parsed):
        """Solve algebraic equations with symbolic math."""
        explanation = "🔍 EQUATION SOLVER\n" + "="*50 + "\n\n"
        
        query = parsed['cleaned']
        
        try:
            if '=' not in query:
                return "Error", "Equation must contain '=' sign"
            
            # Clean and prepare for SymPy
            equation_str = query.replace('solve', '').replace('find x', '').replace('find y', '').strip()
            left, right = equation_str.split('=')
            
            # Add implicit multiplication (2x → 2*x)
            left = re.sub(r'(\d)([xy])', r'\1*\2', left.strip())
            right = re.sub(r'(\d)([xy])', r'\1*\2', right.strip())
            
            # Parse with SymPy
            x, y = symbols('x y')
            left_expr = parse_expr(left, transformations='all')
            right_expr = parse_expr(right, transformations='all')
            
            explanation += "STEP 1: Parse equation\n"
            explanation += f"  • Left side: {left_expr}\n"
            explanation += f"  • Right side: {right_expr}\n\n"
            
            # Solve
            equation = Eq(left_expr, right_expr)
            solution = solve(equation)
            
            explanation += "STEP 2: Rearrange and solve\n"
            explanation += f"  • Equation: {equation}\n"
            explanation += f"  • Solution: {solution}\n"
            
            if solution:
                result = solution[0] if isinstance(solution, list) else solution
                explanation += f"\n✓ ANSWER: {result}"
                return str(result), explanation
            else:
                return "No solution", explanation
                
        except Exception as e:
            return "Error", f"Could not solve equation: {str(e)}\nTry: 'solve 2x + 5 = 17'"
    
    # ========================================================================
    # SOLVER: MULTI-STEP PROBLEMS
    # ========================================================================
    
    def solve_multi_step(self, parsed):
        """Solve multi-step chained problems."""
        explanation = "🔍 MULTI-STEP PROBLEM SOLVER\n" + "="*50 + "\n\n"
        
        query = parsed['cleaned']
        numbers = parsed['numbers']
        
        if not numbers:
            return "Error", "Need at least one starting number"
        
        result = numbers[0]
        explanation += f"STEP 1: Starting value = {result}\n\n"
        
        # Split by step indicators
        steps = re.split(r'then|after that|next|,', query)
        step_num = 2
        
        for step in steps[1:]:
            step = step.strip()
            nums_in_step = re.findall(r'\d+\.?\d*', step)
            
            if not nums_in_step:
                continue
            
            value = float(nums_in_step[0])
            
            if 'add' in step or 'plus' in step or '+' in step:
                if '%' in step or 'percent' in step:
                    change = result * (value / 100)
                    result += change
                    explanation += f"STEP {step_num}: Add {value}%\n"
                    explanation += f"  • {result - change:.2f} + {change:.2f} = {result:.2f}\n\n"
                else:
                    old_result = result
                    result += value
                    explanation += f"STEP {step_num}: Add {value}\n"
                    explanation += f"  • {old_result} + {value} = {result}\n\n"
            
            elif 'subtract' in step or 'minus' in step or '-' in step:
                if '%' in step or 'percent' in step:
                    change = result * (value / 100)
                    result -= change
                    explanation += f"STEP {step_num}: Subtract {value}%\n"
                    explanation += f"  • {result + change:.2f} - {change:.2f} = {result:.2f}\n\n"
                else:
                    old_result = result
                    result -= value
                    explanation += f"STEP {step_num}: Subtract {value}\n"
                    explanation += f"  • {old_result} - {value} = {result}\n\n"
            
            elif 'multiply' in step or 'times' in step or '*' in step:
                old_result = result
                result *= value
                explanation += f"STEP {step_num}: Multiply by {value}\n"
                explanation += f"  • {old_result} × {value} = {result}\n\n"
            
            elif 'divide' in step or '/' in step:
                old_result = result
                result /= value
                explanation += f"STEP {step_num}: Divide by {value}\n"
                explanation += f"  • {old_result} ÷ {value} = {result}\n\n"
            
            step_num += 1
        
        explanation += f"✓ FINAL ANSWER: {result}"
        return str(result), explanation
    
    # ========================================================================
    # SOLVER: AVERAGE/STATISTICS
    # ========================================================================
    
    def solve_average_advanced(self, parsed):
        """Calculate averages with clear reasoning."""
        explanation = "🔍 AVERAGE CALCULATOR\n" + "="*50 + "\n\n"
        
        numbers = parsed['numbers']
        
        if len(numbers) < 2:
            return "Error", "Need at least 2 numbers to calculate average"
        
        total = sum(numbers)
        count = len(numbers)
        average = total / count
        
        explanation += "STEP 1: List the numbers\n"
        explanation += f"  • Numbers: {', '.join(map(str, numbers))}\n\n"
        explanation += "STEP 2: Calculate sum\n"
        explanation += f"  • Sum: {' + '.join(map(str, numbers))} = {total}\n\n"
        explanation += "STEP 3: Divide by count\n"
        explanation += f"  • Average: {total} ÷ {count} = {average}\n"
        explanation += f"\n✓ ANSWER: {average}"
        
        return str(average), explanation
    
    # ========================================================================
    # SOLVER: ARITHMETIC (smart fallback)
    # ========================================================================
    
    def solve_arithmetic_advanced(self, parsed):
        """Smart arithmetic solver with context awareness."""
        explanation = "🔍 ARITHMETIC SOLVER\n" + "="*50 + "\n\n"
        
        query = parsed['cleaned']
        numbers = parsed['numbers']
        
        if len(numbers) < 2:
            return "Error", "Need at least 2 numbers for arithmetic"
        
        # Clean for SymPy
        cleaned = query
        for word in ['what', 'is', 'calculate', 'compute', '?', 'the']:
            cleaned = cleaned.replace(word, '')
        cleaned = cleaned.strip()
        
        # Replace words with operators
        cleaned = cleaned.replace('plus', '+').replace('minus', '-')
        cleaned = cleaned.replace('times', '*').replace('divided by', '/')
        
        try:
            expr = parse_expr(cleaned, transformations='all')
            result = float(expr.evalf())
            
            explanation += "STEP 1: Parse expression\n"
            explanation += f"  • Expression: {cleaned}\n\n"
            explanation += "STEP 2: Evaluate\n"
            explanation += f"  • Result: {result}\n"
            explanation += f"\n✓ ANSWER: {result}"
            
            return str(result), explanation
        except:
            # Fallback: just add the numbers
            result = sum(numbers)
            explanation += f"Could not parse expression, summing numbers:\n"
            explanation += f"{' + '.join(map(str, numbers))} = {result}\n"
            explanation += f"\n✓ ANSWER: {result}"
            return str(result), explanation
        

    def get_history(self):
        """Return calculation history."""
        return self.history
    
    def clear_history(self):
        """Clear all calculation history."""
        self.history = []

# ============================================================================
# CALCULATOR CLASS WITH AI MODE
# ============================================================================

class Calculator:
    """
    Enhanced Calculator with Standard and AI modes.
    - Standard Mode: Traditional calculator buttons
    - AI Mode: Natural language math queries
    """
    
    def __init__(self, root):
        self.root = root
        self.root.title("AI-Powered Calculator")
        self.root.geometry("500x700")
        self.root.resizable(False, False)
        self.root.configure(bg='#2b2b2b')
        
        self.expression = ""
        self.input_text = tk.StringVar()
        
        # AI Mode components
        self.ai_mode = False
        self.math_ai = MathAI()
        
        # Initialize frames (will be created by methods)
        self.standard_frame: tk.Frame = None  # type: ignore
        self.ai_frame: tk.Frame = None  # type: ignore
        
        # Create mode toggle
        self.create_mode_toggle()
        
        # Create display
        self.create_display()
        
        # Create buttons (Standard mode)
        self.create_buttons()
        
        # Create AI input area (initially hidden)
        self.create_ai_interface()
    
    def create_mode_toggle(self):
        """Create toggle button to switch between Standard and AI modes."""
        toggle_frame = tk.Frame(self.root, bg='#2b2b2b')
        toggle_frame.pack(fill='x', padx=10, pady=(10, 0))
        
        self.mode_label = tk.Label(
            toggle_frame,
            text="Standard Mode",
            font=('Arial', 12, 'bold'),
            bg='#2b2b2b',
            fg='#ffffff'
        )
        self.mode_label.pack(side='left')
        
        toggle_button = tk.Button(
            toggle_frame,
            text="Switch to AI Mode",
            font=('Arial', 10),
            bg='#4CAF50',
            fg='white',
            bd=0,
            padx=15,
            pady=5,
            activebackground='#45a049',
            command=self.toggle_mode
        )
        toggle_button.pack(side='right')
        self.toggle_button = toggle_button
    
    def toggle_mode(self):
        """Switch between Standard and AI modes."""
        self.ai_mode = not self.ai_mode
        
        if self.ai_mode:
            # Switch to AI Mode
            self.mode_label.config(text="AI Mode 🤖")
            self.toggle_button.config(text="Switch to Standard Mode")
            self.standard_frame.pack_forget()
            self.ai_frame.pack(expand=True, fill="both", padx=10, pady=(0, 10))
            self.input_text.set("Type your question here and press Enter...")
            self.input_field.config(justify='left')  # Left-align for questions
            self.expression = ""
        else:
            # Switch to Standard Mode
            self.mode_label.config(text="Standard Mode")
            self.toggle_button.config(text="Switch to AI Mode")
            self.ai_frame.pack_forget()
            self.standard_frame.pack(expand=True, fill="both", padx=10, pady=(0, 10))
            self.input_text.set("")
            self.input_field.config(justify='right')  # Right-align for numbers
            self.expression = ""
    
    def on_display_enter(self):
        """Handle Enter key press in display box."""
        if self.ai_mode:
            # In AI mode, process as query
            query = self.input_text.get().strip()
            if query and query != "Type your question here and press Enter...":
                self.process_ai_query_from_display(query)
        else:
            # In Standard mode, evaluate expression
            self.evaluate()
    
    def on_display_focus(self):
        """Clear placeholder text when display box is clicked in AI mode."""
        if self.ai_mode:
            current = self.input_text.get()
            if current == "Type your question here and press Enter...":
                self.input_text.set("")
    
    def create_display(self):
        """Create the calculator display"""
        display_frame = tk.Frame(self.root, bg='#2b2b2b')
        display_frame.pack(expand=True, fill="both", padx=10, pady=10)
        
        self.input_field = tk.Entry(
            display_frame,
            font=('Arial', 20, 'bold'),
            textvariable=self.input_text,
            justify='right',
            bg='#3c3c3c',
            fg='#ffffff',
            bd=0,
            insertbackground='white'
        )
        self.input_field.pack(expand=True, fill='both', ipady=15)
        # Bind Enter key for AI mode
        self.input_field.bind('<Return>', lambda e: self.on_display_enter())
        # Bind click to clear placeholder text
        self.input_field.bind('<FocusIn>', lambda e: self.on_display_focus())

    
    def create_buttons(self):
        """Create calculator buttons for Standard mode"""
        self.standard_frame = tk.Frame(self.root, bg='#2b2b2b')
        self.standard_frame.pack(expand=True, fill="both", padx=10, pady=(0, 10))
        
        # Button layout
        buttons = [
            ['C', '⌫', '%', '/'],
            ['7', '8', '9', '*'],
            ['4', '5', '6', '-'],
            ['1', '2', '3', '+'],
            ['0', '.', '=', '=']
        ]
        
        # Button colors
        operator_color = '#ff9500'
        number_color = '#505050'
        special_color = '#a5a5a5'
        
        for i, row in enumerate(buttons):
            for j, button_text in enumerate(row):
                # Determine button color
                if button_text in ['/', '*', '-', '+', '=']:
                    bg_color = operator_color
                elif button_text in ['C', '⌫', '%']:
                    bg_color = special_color
                else:
                    bg_color = number_color
                
                # Create button
                button = tk.Button(
                    self.standard_frame,
                    text=button_text,
                    font=('Arial', 20, 'bold'),
                    bg=bg_color,
                    fg='white',
                    bd=0,
                    activebackground=bg_color,
                    activeforeground='white',
                    command=lambda x=button_text: self.on_button_click(x)
                )
                
                # Special layout for '=' button (spans 2 columns)
                if button_text == '=' and j == 2:
                    button.grid(row=i, column=j, columnspan=2, sticky='nsew', padx=2, pady=2)
                elif button_text == '=' and j == 3:
                    # Skip the duplicate '=' placeholder
                    continue
                else:
                    button.grid(row=i, column=j, sticky='nsew', padx=2, pady=2)
        
        # Configure grid weights
        for i in range(5):
            self.standard_frame.grid_rowconfigure(i, weight=1)
        for j in range(4):
            self.standard_frame.grid_columnconfigure(j, weight=1)
    
    def create_ai_interface(self):
        """Create AI mode interface with query input and explanation area."""
        self.ai_frame = tk.Frame(self.root, bg='#2b2b2b')
        
        # Instructions
        instructions = tk.Label(
            self.ai_frame,
            text="Ask me anything! Examples:\n"
                 "• What is 20% of 80?\n"
                 "• Solve 2x + 5 = 17\n"
                 "• If I work 40 hours at $25/hour, how much do I make?\n"
                 "• Average of 10, 20, 30\n"
                 "• Start with 100, add 10%, then subtract 50",
            font=('Arial', 9),
            bg='#2b2b2b',
            fg='#a5a5a5',
            justify='left'
        )
        instructions.pack(pady=(10, 10))
        
        # Query input area
        query_frame = tk.Frame(self.ai_frame, bg='#2b2b2b')
        query_frame.pack(fill='x', padx=5, pady=5)
        
        tk.Label(
            query_frame,
            text="Your Question:",
            font=('Arial', 10, 'bold'),
            bg='#2b2b2b',
            fg='#ffffff'
        ).pack(anchor='w')
        
        self.query_entry = tk.Entry(
            query_frame,
            font=('Arial', 11),
            bg='#3c3c3c',
            fg='#ffffff',
            insertbackground='white',
            bd=1,
            relief='solid'
        )
        self.query_entry.pack(fill='x', pady=5)
        self.query_entry.bind('<Return>', lambda e: self.process_ai_query())
        
        # Submit button
        submit_button = tk.Button(
            query_frame,
            text="Calculate",
            font=('Arial', 11, 'bold'),
            bg='#4CAF50',
            fg='white',
            bd=0,
            padx=20,
            pady=8,
            activebackground='#45a049',
            command=self.process_ai_query
        )
        submit_button.pack(pady=5)
        
        # Explanation area with scrollbar
        explanation_label = tk.Label(
            self.ai_frame,
            text="Explanation:",
            font=('Arial', 10, 'bold'),
            bg='#2b2b2b',
            fg='#ffffff'
        )
        explanation_label.pack(anchor='w', padx=5, pady=(10, 5))
        
        self.explanation_text = scrolledtext.ScrolledText(
            self.ai_frame,
            font=('Arial', 10),
            bg='#3c3c3c',
            fg='#ffffff',
            wrap=tk.WORD,
            height=12,
            bd=1,
            relief='solid',
            insertbackground='white'
        )
        self.explanation_text.pack(fill='both', expand=True, padx=5, pady=5)
        
        # History buttons frame
        history_frame = tk.Frame(self.ai_frame, bg='#2b2b2b')
        history_frame.pack(pady=5)
        
        history_button = tk.Button(
            history_frame,
            text="View History",
            font=('Arial', 9),
            bg='#505050',
            fg='white',
            bd=0,
            padx=15,
            pady=5,
            activebackground='#606060',
            command=self.show_history
        )
        history_button.pack(side='left', padx=5)
        
        clear_button = tk.Button(
            history_frame,
            text="Clear History",
            font=('Arial', 9),
            bg='#d32f2f',
            fg='white',
            bd=0,
            padx=15,
            pady=5,
            activebackground='#b71c1c',
            command=self.clear_history
        )
        clear_button.pack(side='left', padx=5)
    
    def process_ai_query(self):
        """Process natural language query using AI from query entry box."""
        query = self.query_entry.get().strip()
        
        if not query:
            self.explanation_text.delete('1.0', tk.END)
            self.explanation_text.insert('1.0', "Please enter a question.")
            return
        
        # Process with AI
        result, explanation, success = self.math_ai.process_query(query)
        
        # Display result
        if success:
            self.input_text.set(result)
        else:
            self.input_text.set("Error")
        
        # Display explanation
        self.explanation_text.delete('1.0', tk.END)
        self.explanation_text.insert('1.0', explanation)
    
    def process_ai_query_from_display(self, query):
        """Process natural language query from top display box."""
        if not query:
            self.input_text.set("Type your question here and press Enter...")
            return
        
        # Process with AI
        result, explanation, success = self.math_ai.process_query(query)
        
        # Display result in main display
        if success:
            self.input_text.set(result)
        else:
            self.input_text.set("Error")
        
        # Display explanation
        self.explanation_text.delete('1.0', tk.END)
        self.explanation_text.insert('1.0', explanation)
        
        # Also update the query entry box for reference
        self.query_entry.delete(0, tk.END)
        self.query_entry.insert(0, query)
    
    def clear_history(self):
        """Clear all calculation history."""
        self.math_ai.clear_history()
        self.explanation_text.delete('1.0', tk.END)
        self.explanation_text.insert('1.0', "History cleared! ✓\n\nStart asking questions to build new history.")
    
    def show_history(self):
        """Display calculation history in a new window."""
        history_window = tk.Toplevel(self.root)
        history_window.title("Calculation History")
        history_window.geometry("600x400")
        history_window.configure(bg='#2b2b2b')
        
        # Title
        title = tk.Label(
            history_window,
            text="Calculation History",
            font=('Arial', 14, 'bold'),
            bg='#2b2b2b',
            fg='#ffffff'
        )
        title.pack(pady=10)
        
        # Scrolled text for history
        history_text = scrolledtext.ScrolledText(
            history_window,
            font=('Arial', 10),
            bg='#3c3c3c',
            fg='#ffffff',
            wrap=tk.WORD,
            bd=1,
            relief='solid'
        )
        history_text.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Populate history
        history = self.math_ai.get_history()
        
        if not history:
            history_text.insert('1.0', "No calculation history yet.")
        else:
            for i, entry in enumerate(history, 1):
                history_text.insert(tk.END, f"{'='*60}\n")
                history_text.insert(tk.END, f"#{i} [{entry['type'].upper()}]\n")
                history_text.insert(tk.END, f"Query: {entry['query']}\n")
                history_text.insert(tk.END, f"Result: {entry['result']}\n\n")
                history_text.insert(tk.END, f"{entry['explanation']}\n\n")
        
        history_text.config(state='disabled')
        
        # Buttons frame
        button_frame = tk.Frame(history_window, bg='#2b2b2b')
        button_frame.pack(pady=10)
        
        # Clear History button
        clear_hist_button = tk.Button(
            button_frame,
            text="Clear All History",
            font=('Arial', 10),
            bg='#d32f2f',
            fg='white',
            bd=0,
            padx=20,
            pady=8,
            activebackground='#b71c1c',
            command=lambda: [self.math_ai.clear_history(), history_window.destroy()]
        )
        clear_hist_button.pack(side='left', padx=5)
        
        # Close button
        close_button = tk.Button(
            button_frame,
            text="Close",
            font=('Arial', 10),
            bg='#505050',
            fg='white',
            bd=0,
            padx=20,
            pady=8,
            activebackground='#606060',
            command=history_window.destroy
        )
        close_button.pack(side='left', padx=5)

    
    def on_button_click(self, char):
        """Handle button clicks in Standard mode"""
        if char == 'C':
            self.clear()
        elif char == '⌫':
            self.backspace()
        elif char == '=':
            self.evaluate()
        else:
            self.expression += str(char)
            self.input_text.set(self.expression)
    
    def clear(self):
        """Clear the display"""
        self.expression = ""
        self.input_text.set("")
    
    def backspace(self):
        """Remove last character"""
        self.expression = self.expression[:-1]
        self.input_text.set(self.expression)
    
    def evaluate(self):
        """Evaluate the expression in Standard mode"""
        try:
            result = str(eval(self.expression))
            self.input_text.set(result)
            self.expression = result
        except ZeroDivisionError:
            self.input_text.set("Error: Div by 0")
            self.expression = ""
        except:
            self.input_text.set("Error")
            self.expression = ""

# ============================================================================
# MAIN APPLICATION
# ============================================================================

if __name__ == "__main__":
    root = tk.Tk()
    calculator = Calculator(root)
    root.mainloop()
