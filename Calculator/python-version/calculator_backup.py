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
        if any(word in query for word in ['twice', 'double', 'triple', 'half', 'times as much', 'more than', 'less than']):
            if len(parsed['numbers']) >= 1 and parsed['has_variable']:
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
    
    def detect_math_type(self, query):
        """Detect the type of mathematical problem from natural language."""
        query_lower = query.lower()
        
        # Check if there are numbers in the query
        has_numbers = bool(re.search(r'\d+', query_lower))
        
        # Sequential operations (check first)
        if any(keyword in query_lower for keyword in ['then', 'and then', 'after that', 'start with']):
            return "sequential"
        
        # Percentage patterns
        if any(keyword in query_lower for keyword in ['percent', '%', 'percentage']):
            return "percentage"
        
        # Equation patterns
        if any(keyword in query_lower for keyword in ['solve', 'equation', 'find x', 'find y']):
            if 'x' in query_lower or 'y' in query_lower:
                return "equation"
        
        # Average patterns
        if any(keyword in query_lower for keyword in ['average', 'mean', 'avg']):
            return "average"
        
        # WORD PROBLEM DETECTION - Very aggressive now
        # Strong indicators that force word problem mode
        strong_indicators = ['work', 'hour', 'hours', 'buy', 'bought', 'sell', 'sold', 
                           'earn', 'earned', 'make', 'made', 'cost', 'costs',
                           'pay', 'paid', 'spend', 'spent', 'price', 'item', 'items',
                           'dollar', 'dollars', '$']
        
        # Multiplication/division keywords
        operation_words = ['at', 'per', 'each', 'for', 'every']
        
        # Question patterns
        question_words = ['how much', 'how many', 'what', 'if i', 'if you', 'calculate']
        
        has_strong = any(indicator in query_lower for indicator in strong_indicators)
        has_operation = any(word in query_lower for word in operation_words)
        has_question = any(word in query_lower for word in question_words)
        
        # If has numbers + (strong indicator OR operation word), it's a word problem
        if has_numbers and (has_strong or has_operation):
            return "word_problem"
        
        # If has numbers + question words + any real words (not just operators), probably word problem
        if has_numbers and has_question:
            # Count actual words (not just symbols)
            words = re.findall(r'[a-zA-Z]+', query_lower)
            if len(words) > 3:  # More than just "what is the"
                return "word_problem"
        
        # Only pure math expressions go to arithmetic
        return "arithmetic"
    
    def solve_percentage(self, query):
        """
        Handle percentage calculations.
        Examples: "What is 20% of 80?", "Calculate 15% of 200"
        """
        query_lower = query.lower()
        explanation = "Step-by-step:\n"
        
        # Pattern: "X% of Y" or "X percent of Y"
        pattern1 = r'(\d+\.?\d*)\s*(?:%|percent)\s*of\s*(\d+\.?\d*)'
        match = re.search(pattern1, query_lower)
        
        if match:
            percent = float(match.group(1))
            number = float(match.group(2))
            result = (percent / 100) * number
            
            explanation += f"1. Convert {percent}% to decimal: {percent}/100 = {percent/100}\n"
            explanation += f"2. Multiply by {number}: {percent/100} × {number} = {result}\n"
            explanation += f"\nAnswer: {result}"
            
            return str(result), explanation
        
        # Pattern: "What percent is X of Y?"
        pattern2 = r'what\s+(?:percent|%)\s+is\s+(\d+\.?\d*)\s+of\s+(\d+\.?\d*)'
        match = re.search(pattern2, query_lower)
        
        if match:
            part = float(match.group(1))
            whole = float(match.group(2))
            result = (part / whole) * 100
            
            explanation += f"1. Divide {part} by {whole}: {part}/{whole} = {part/whole}\n"
            explanation += f"2. Multiply by 100 to get percentage: {part/whole} × 100 = {result}%\n"
            explanation += f"\nAnswer: {result}%"
            
            return f"{result}%", explanation
        
        # Pattern: "Increase/decrease X by Y%"
        pattern3 = r'(increase|decrease)\s+(\d+\.?\d*)\s+by\s+(\d+\.?\d*)\s*(?:%|percent)'
        match = re.search(pattern3, query_lower)
        
        if match:
            operation = match.group(1)
            number = float(match.group(2))
            percent = float(match.group(3))
            
            change = (percent / 100) * number
            
            if operation == 'increase':
                result = number + change
                explanation += f"1. Calculate {percent}% of {number}: {change}\n"
                explanation += f"2. Add to original: {number} + {change} = {result}\n"
            else:
                result = number - change
                explanation += f"1. Calculate {percent}% of {number}: {change}\n"
                explanation += f"2. Subtract from original: {number} - {change} = {result}\n"
            
            explanation += f"\nAnswer: {result}"
            return str(result), explanation
        
        return "Error", "Could not parse percentage query. Try: 'What is 20% of 80?'"
    
    def solve_equation(self, query):
        """
        Solve algebraic equations.
        Examples: "Solve 2x + 5 = 17", "Find x when 3x - 7 = 14"
        """
        explanation = "Step-by-step:\n"
        
        try:
            # Clean the query
            query = query.lower().replace('solve', '').replace('find x', '').replace('find y', '').replace('when', '').strip()
            
            # Split by equals sign
            if '=' in query:
                left, right = query.split('=')
                
                # Define symbol
                x = symbols('x')
                y = symbols('y')
                
                # Replace implicit multiplication (2x -> 2*x)
                left = re.sub(r'(\d)([xy])', r'\1*\2', left.strip())
                right = re.sub(r'(\d)([xy])', r'\1*\2', right.strip())
                
                # Parse both sides
                left_expr = parse_expr(left, transformations='all')
                right_expr = parse_expr(right, transformations='all')
                
                # Create equation
                equation = left_expr - right_expr
                
                explanation += f"1. Original equation: {left_expr} = {right_expr}\n"
                explanation += f"2. Rearrange to: {equation} = 0\n"
                
                # Solve
                solution = solve(equation)
                
                if solution:
                    explanation += f"3. Solve for variable: {solution}\n"
                    result = solution[0] if len(solution) == 1 else solution
                    explanation += f"\nAnswer: {result}"
                    return str(result), explanation
                else:
                    return "No solution", explanation + "\nNo solution found."
            else:
                return "Error", "Equation must contain '=' sign."
                
        except Exception as e:
            return "Error", f"Could not solve equation. Try: 'Solve 2x + 5 = 17'\nError: {str(e)}"
    
    def solve_word_problem(self, query):
        """
        Solve word problems involving multiplication and basic arithmetic.
        Examples: "If I work 40 hours at $25/hour, how much do I make?"
        """
        explanation = "Step-by-step:\n"
        
        try:
            # Extract numbers from query (including decimals)
            numbers = re.findall(r'\d+\.?\d*', query)
            
            if not numbers:
                return "Error", "I couldn't find any numbers in your question.\n\nTry:\n- I work 40 hours at 25 dollars per hour\n- If I buy 15 items at 8 dollars each\n- 5 pizzas at 12 dollars each"
            
            if len(numbers) >= 2:
                num1 = float(numbers[0])
                num2 = float(numbers[1])
                
                query_lower = query.lower()
                
                # SMART OPERATION DETECTION BASED ON CONTEXT
                
                # PAY/WAGE PROBLEMS (check FIRST - highest priority!)
                # "I make X dollars an hour, worked Y hours"
                # "X per hour, worked Y hours"
                wage_patterns = ['dollar', 'dollars', '$']
                hour_patterns = ['hour', 'hours', 'hr', 'hrs']
                work_patterns = ['work', 'worked', 'working', 'make', 'made', 'earn', 'earned']
                
                has_wage = any(word in query_lower for word in wage_patterns)
                has_hours = any(word in query_lower for word in hour_patterns)
                has_work = any(word in query_lower for word in work_patterns)
                
                # If talking about wages + hours + work, it's ALWAYS multiplication
                if has_wage and has_hours and has_work:
                    result = num1 * num2
                    explanation += f"1. Identified wage calculation (pay rate × hours worked)\n"
                    explanation += f"2. Multiply: ${num1}/hour × {num2} hours = ${result}\n"
                    explanation += f"\nAnswer: ${result:,.2f}"
                    return f"${result:,.2f}", explanation
                
                # TIME-BASED ADDITION (check second!)
                # "gone for 10 minutes, return in 20 minutes, total time?"
                time_words = ['minute', 'minutes', 'hour', 'hours', 'day', 'days', 'second', 'seconds', 'year', 'years']
                addition_time_context = ['gone', 'return', 'wait', 'how long', 'how much time']
                
                has_time = any(word in query_lower for word in time_words)
                has_time_addition = any(word in query_lower for word in addition_time_context)
                
                # Only add time if explicitly asking for total AND not a wage calculation
                if has_time and has_time_addition and 'total' in query_lower and not has_work:
                    result = num1 + num2
                    explanation += f"1. Identified time addition problem\n"
                    explanation += f"2. Add time periods: {num1} + {num2} = {result}\n"
                    time_unit = next((word for word in time_words if word in query_lower), 'units')
                    explanation += f"\nAnswer: {result} {time_unit}"
                    return f"{result} {time_unit}", explanation
                
                # ADDITION: Strong keywords
                strong_addition = ['total', 'sum', 'altogether', 'combined', 'plus', 'add', 'and then']
                if any(word in query_lower for word in strong_addition):
                    # But NOT if it's clearly multiplication context
                    if not any(word in query_lower for word in ['at', 'per', 'each', 'an hour', 'per hour']):
                        result = num1 + num2
                        explanation += f"1. Identified addition problem\n"
                        explanation += f"2. Add: {num1} + {num2} = {result}\n"
                        explanation += f"\nAnswer: {result}"
                        return str(result), explanation
                
                # MULTIPLICATION: Rate/Price context (for shopping, not wages)
                # "at", "per", "each" when talking about money/items
                mult_keywords = ['at', 'per', 'each']
                mult_context = ['dollar', 'dollars', '$', 'price', 'cost', 'item', 'items']
                
                has_mult_word = any(word in query_lower for word in mult_keywords)
                has_mult_context = any(word in query_lower for word in mult_context)
                
                if has_mult_word and has_mult_context:
                    result = num1 * num2
                    explanation += f"1. Identified multiplication problem (rate × quantity)\n"
                    explanation += f"2. Multiply: {num1} × {num2} = {result}\n"
                    
                    # Format based on currency symbol
                    if '$' in query or 'dollar' in query_lower:
                        explanation += f"\nAnswer: ${result:,.2f}"
                        return f"${result:,.2f}", explanation
                    else:
                        explanation += f"\nAnswer: {result}"
                        return str(result), explanation
                
                # DIVISION: divide, split, share
                if any(word in query_lower for word in ['divide', 'split', 'share', 'distributed', 'each person gets']):
                    result = num1 / num2
                    explanation += f"1. Identified division problem\n"
                    explanation += f"2. Divide: {num1} ÷ {num2} = {result}\n"
                    explanation += f"\nAnswer: {result}"
                    return str(result), explanation
                
                # SUBTRACTION: difference, less, minus, remove
                if any(word in query_lower for word in ['difference', 'less', 'minus', 'subtract', 'remove', 'left']):
                    result = num1 - num2
                    explanation += f"1. Identified subtraction problem\n"
                    explanation += f"2. Subtract: {num1} - {num2} = {result}\n"
                    explanation += f"\nAnswer: {result}"
                    return str(result), explanation
                
                # DEFAULT: If unclear, try addition (safer default for most real-world problems)
                result = num1 + num2
                explanation += f"1. Assuming addition (couldn't detect specific operation)\n"
                explanation += f"2. Add: {num1} + {num2} = {result}\n"
                explanation += f"\nAnswer: {result}\n\n"
                explanation += f"Tip: Be specific! Use words like:\n"
                explanation += f"- 'at $X each' or 'per hour' for multiplication\n"
                explanation += f"- 'total' or 'altogether' for addition\n"
                explanation += f"- 'divide' or 'split' for division"
                
                return str(result), explanation
            
            elif len(numbers) == 1:
                return "Error", f"I found only one number ({numbers[0]}) in your question. Word problems usually need at least 2 numbers.\n\nExample: 'If I work 40 hours at $25/hour, how much do I make?'"
            
            return "Error", "Could not parse word problem. Please provide more details."
            
        except Exception as e:
            return "Error", f"Error solving word problem: {str(e)}\n\nTry examples like:\n- If I work 40 hours at $25/hour, how much do I make?\n- I buy 15 items at $8 each, what's the total?"
            
            return "Error", "Could not parse word problem. Please provide more details."
            
        except Exception as e:
            return "Error", f"Error solving word problem: {str(e)}"
    
    def solve_average(self, query):
        """
        Calculate averages/means.
        Examples: "Average of 10, 20, 30", "What is the mean of 5, 15, 25?"
        """
        explanation = "Step-by-step:\n"
        
        try:
            # Extract numbers
            numbers = re.findall(r'\d+\.?\d*', query)
            numbers = [float(n) for n in numbers]
            
            if len(numbers) < 2:
                return "Error", "Need at least 2 numbers to calculate average."
            
            total = sum(numbers)
            count = len(numbers)
            average = total / count
            
            explanation += f"1. Numbers: {', '.join(map(str, numbers))}\n"
            explanation += f"2. Sum: {' + '.join(map(str, numbers))} = {total}\n"
            explanation += f"3. Count: {count}\n"
            explanation += f"4. Average: {total} ÷ {count} = {average}\n"
            explanation += f"\nAnswer: {average}"
            
            return str(average), explanation
            
        except Exception as e:
            return "Error", f"Error calculating average: {str(e)}"
    
    def solve_sequential(self, query):
        """
        Solve sequential operations.
        Examples: "Start with 100, add 10%, then subtract 50"
        """
        explanation = "Step-by-step:\n"
        
        try:
            # Extract starting number
            numbers = re.findall(r'\d+\.?\d*', query)
            if not numbers:
                return "Error", "Could not find starting number."
            
            result = float(numbers[0])
            explanation += f"1. Starting value: {result}\n"
            
            query_lower = query.lower()
            step_num = 2
            
            # Split by operation keywords
            operations = re.split(r'then|after that|and then|,', query_lower)
            
            for op in operations[1:]:  # Skip first part (starting number)
                op = op.strip()
                
                if 'add' in op or 'plus' in op or '+' in op:
                    # Extract number/percentage
                    if '%' in op or 'percent' in op:
                        percent_match = re.search(r'(\d+\.?\d*)\s*(?:%|percent)', op)
                        if percent_match:
                            percent = float(percent_match.group(1))
                            change = result * (percent / 100)
                            result += change
                            explanation += f"{step_num}. Add {percent}%: {result - change} + {change} = {result}\n"
                    else:
                        num_match = re.search(r'(\d+\.?\d*)', op)
                        if num_match:
                            num = float(num_match.group(1))
                            old_result = result
                            result += num
                            explanation += f"{step_num}. Add {num}: {old_result} + {num} = {result}\n"
                
                elif 'subtract' in op or 'minus' in op or '-' in op:
                    if '%' in op or 'percent' in op:
                        percent_match = re.search(r'(\d+\.?\d*)\s*(?:%|percent)', op)
                        if percent_match:
                            percent = float(percent_match.group(1))
                            change = result * (percent / 100)
                            result -= change
                            explanation += f"{step_num}. Subtract {percent}%: {result + change} - {change} = {result}\n"
                    else:
                        num_match = re.search(r'(\d+\.?\d*)', op)
                        if num_match:
                            num = float(num_match.group(1))
                            old_result = result
                            result -= num
                            explanation += f"{step_num}. Subtract {num}: {old_result} - {num} = {result}\n"
                
                elif 'multiply' in op or 'times' in op or '*' in op:
                    num_match = re.search(r'(\d+\.?\d*)', op)
                    if num_match:
                        num = float(num_match.group(1))
                        old_result = result
                        result *= num
                        explanation += f"{step_num}. Multiply by {num}: {old_result} × {num} = {result}\n"
                
                elif 'divide' in op or '/' in op:
                    num_match = re.search(r'(\d+\.?\d*)', op)
                    if num_match:
                        num = float(num_match.group(1))
                        old_result = result
                        result /= num
                        explanation += f"{step_num}. Divide by {num}: {old_result} ÷ {num} = {result}\n"
                
                step_num += 1
            
            explanation += f"\nFinal Answer: {result}"
            return str(result), explanation
            
        except Exception as e:
            return "Error", f"Error processing sequential operations: {str(e)}"
    
    def solve_arithmetic(self, query):
        """
        Solve basic arithmetic expressions.
        Examples: "What is 25 + 37?", "Calculate 144 / 12"
        """
        explanation = "Step-by-step:\n"
        
        try:
            # Clean query - remove words
            cleaned = query.lower()
            for word in ['what', 'is', 'calculate', 'compute', '?', 'the', 'result', 'of']:
                cleaned = cleaned.replace(word, '')
            cleaned = cleaned.strip()
            
            # If empty after cleaning, show error
            if not cleaned:
                return "Error", "Please enter a mathematical expression.\n\nExamples:\n- What is 25 + 37?\n- Calculate 144 / 12\n- 50 * 2 + 100\n\nFor word problems, try:\n- If I work 40 hours at $25/hour, how much?\n- I buy 15 items at $8 each"
            
            # Replace common words with operators
            cleaned = cleaned.replace('plus', '+')
            cleaned = cleaned.replace('minus', '-')
            cleaned = cleaned.replace('times', '*')
            cleaned = cleaned.replace('divided by', '/')
            
            # Check if it looks more like a sentence than an expression
            # If it has many words left, it might be a word problem that wasn't caught
            word_count = len(cleaned.split())
            if word_count > 4 and not any(op in cleaned for op in ['+', '-', '*', '/', '(', ')']):
                return "Error", f"This looks like a word problem, but I'm having trouble understanding it.\n\nTry rephrasing like:\n- If I work 40 hours at $25/hour\n- I buy 15 items at $12 each\n- What's 20% of 100?\n\nOr use math symbols:\n- 50 * 2 + 100\n- (10 + 20) * 3"
            
            # Try to parse and evaluate
            expr = parse_expr(cleaned, transformations='all')
            result = float(expr.evalf())
            
            explanation += f"1. Expression: {cleaned}\n"
            explanation += f"2. Evaluate: {result}\n"
            explanation += f"\nAnswer: {result}"
            
            return str(result), explanation
            
        except Exception as e:
            # Provide helpful error message
            return "Error", f"I couldn't understand this as a math expression.\n\nFor calculations, try:\n- What is 25 + 37?\n- Calculate 144 / 12\n- 15 * 8 + 20\n\nFor word problems, be specific:\n- I work 40 hours at $25/hour\n- If I buy 15 items at $8 each\n\nError: {str(e)}"
    
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
