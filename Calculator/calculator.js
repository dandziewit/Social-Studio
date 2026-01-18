// ============================================================================
// GLOBAL STATE
// ============================================================================

let currentExpression = '';
let history = [];

// ============================================================================
// MODE SWITCHING
// ============================================================================

function switchMode(mode) {
    const standardBtn = document.getElementById('standardBtn');
    const aiBtn = document.getElementById('aiBtn');
    const standardMode = document.getElementById('standardMode');
    const aiMode = document.getElementById('aiMode');

    if (mode === 'standard') {
        standardBtn.classList.add('active');
        aiBtn.classList.remove('active');
        standardMode.classList.add('active');
        aiMode.classList.remove('active');
    } else {
        aiBtn.classList.add('active');
        standardBtn.classList.remove('active');
        aiMode.classList.add('active');
        standardMode.classList.remove('active');
    }
}

// ============================================================================
// STANDARD CALCULATOR FUNCTIONS
// ============================================================================

function appendChar(char) {
    const display = document.getElementById('standardDisplay');
    if (currentExpression === '0' || currentExpression === 'Error' || currentExpression === 'Error: Div by 0') {
        currentExpression = '';
    }
    currentExpression += char;
    display.value = currentExpression;
}

function clearDisplay() {
    currentExpression = '';
    document.getElementById('standardDisplay').value = '0';
}

function backspace() {
    currentExpression = currentExpression.slice(0, -1);
    document.getElementById('standardDisplay').value = currentExpression || '0';
}

function calculate() {
    const display = document.getElementById('standardDisplay');
    try {
        const result = eval(currentExpression);
        if (!isFinite(result)) {
            throw new Error('Division by zero');
        }
        display.value = result;
        currentExpression = result.toString();
        
        // Add to history
        addToHistory({
            query: currentExpression,
            result: result.toString(),
            explanation: 'Standard calculation',
            type: 'arithmetic'
        });
    } catch (error) {
        if (error.message.includes('Division by zero')) {
            display.value = 'Error: Div by 0';
        } else {
            display.value = 'Error';
        }
        currentExpression = '';
    }
}

// ============================================================================
// AI WORD PROBLEM SOLVER - Main Entry Point
// ============================================================================

function solveWordProblem() {
    const input = document.getElementById('problemInput').value.trim();
    const resultDiv = document.getElementById('aiResult');
    const resultValue = document.getElementById('resultValue');
    const explanationText = document.getElementById('explanationText');

    if (!input) {
        resultValue.textContent = 'Error';
        explanationText.textContent = 'Please enter a question.';
        resultDiv.classList.remove('hidden');
        return;
    }

    try {
        const result = processQuery(input);
        
        resultValue.textContent = result.result;
        explanationText.textContent = result.explanation;
        resultDiv.classList.remove('hidden');

        // Add to history
        addToHistory({
            query: input,
            result: result.result,
            explanation: result.explanation,
            type: result.type,
            confidence: result.confidence
        });

        // Scroll to result
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        resultValue.textContent = 'Error';
        explanationText.textContent = `Error: ${error.message}\n\nTry rephrasing your question with clear numbers and relationships.`;
        resultDiv.classList.remove('hidden');
    }
}

// Allow Enter key to submit in AI mode
document.addEventListener('DOMContentLoaded', function() {
    const problemInput = document.getElementById('problemInput');
    if (problemInput) {
        problemInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                solveWordProblem();
            }
        });
    }
});

// ============================================================================
// AI REASONING ENGINE - Main Pipeline
// ============================================================================

function processQuery(query) {
    // STEP 1: Parse input
    const parsed = parseInput(query);
    
    // STEP 2: Classify problem type
    const { type, confidence } = classifyProblem(parsed);
    
    // STEP 3: Route to appropriate solver
    let result, explanation;
    
    switch(type) {
        case 'percentage':
            ({ result, explanation } = solvePercentage(parsed));
            break;
        case 'rate':
            ({ result, explanation } = solveRate(parsed));
            break;
        case 'comparison':
            ({ result, explanation } = solveComparison(parsed));
            break;
        case 'multi_step':
            ({ result, explanation } = solveMultiStep(parsed));
            break;
        case 'average':
            ({ result, explanation } = solveAverage(parsed));
            break;
        case 'equation':
            ({ result, explanation } = solveEquation(parsed));
            break;
        default:
            ({ result, explanation } = solveArithmetic(parsed));
    }
    
    // Add confidence note if low
    if (confidence < 0.8) {
        explanation += `\n\n(Confidence: ${(confidence * 100).toFixed(0)}% - If incorrect, try rephrasing)`;
    }
    
    return { result, explanation, type, confidence };
}

// ============================================================================
// STEP 1: PARSE INPUT
// ============================================================================

function parseInput(query) {
    const parsed = {
        original: query,
        cleaned: query.toLowerCase().trim(),
        numbers: [],
        hasVariable: false
    };
    
    // Extract numbers (including decimals)
    const numberPattern = /\d+\.?\d*/g;
    const numbers = query.match(numberPattern);
    if (numbers) {
        parsed.numbers = numbers.map(n => parseFloat(n));
    }
    
    // Check for variables
    const variableIndicators = ['x', 'y', 'unknown', 'what number', 'how many', 'how much'];
    parsed.hasVariable = variableIndicators.some(v => parsed.cleaned.includes(v));
    
    return parsed;
}

// ============================================================================
// STEP 2: CLASSIFY PROBLEM TYPE
// ============================================================================

function classifyProblem(parsed) {
    const query = parsed.cleaned;
    let confidence = 1.0;
    
    // Multi-step
    if (['then', 'after that', 'first', 'next', 'finally'].some(w => query.includes(w))) {
        return { type: 'multi_step', confidence: 0.95 };
    }
    
    // Percentage
    if (['%', 'percent', 'percentage', 'discount', 'tax', 'tip'].some(w => query.includes(w))) {
        return { type: 'percentage', confidence: 0.95 };
    }
    
    // Equation
    if (parsed.hasVariable && query.includes('=')) {
        return { type: 'equation', confidence: 0.95 };
    }
    
    // Comparison
    const comparisonWords = ['twice', 'double', 'triple', 'half', 'times as much', 'more than', 'less than'];
    if (comparisonWords.some(w => query.includes(w))) {
        return { type: 'comparison', confidence: 0.90 };
    }
    
    // Rate
    const rateIndicators = ['per', 'an hour', 'per hour', 'each', 'at'];
    const workContext = ['work', 'worked', 'earn', 'make', 'buy', 'cost', 'speed', 'dollar', '$'];
    if (rateIndicators.some(w => query.includes(w)) && workContext.some(w => query.includes(w))) {
        return { type: 'rate', confidence: 0.92 };
    }
    
    // Average
    if (['average', 'mean', 'median'].some(w => query.includes(w))) {
        return { type: 'average', confidence: 0.95 };
    }
    
    // Default to arithmetic
    if (parsed.numbers.length >= 2) {
        confidence = 0.70;
    } else {
        confidence = 0.50;
    }
    
    return { type: 'arithmetic', confidence };
}

// ============================================================================
// SOLVER: PERCENTAGE PROBLEMS
// ============================================================================

function solvePercentage(parsed) {
    let explanation = "🔍 PERCENTAGE PROBLEM SOLVER\n" + "=".repeat(50) + "\n\n";
    const query = parsed.cleaned;
    const numbers = parsed.numbers;
    
    if (numbers.length < 2) {
        return { result: "Error", explanation: "Need at least 2 numbers for percentage problems" };
    }
    
    // Pattern 1: "X% of Y"
    if (query.includes('of')) {
        const percent = numbers[0];
        const value = numbers[1];
        const result = (percent / 100) * value;
        
        explanation += "STEP 1: Identify percentage and value\n";
        explanation += `  • Percentage: ${percent}%\n`;
        explanation += `  • Value: ${value}\n\n`;
        explanation += "STEP 2: Convert percentage to decimal\n";
        explanation += `  • ${percent}% = ${percent}/100 = ${percent/100}\n\n`;
        explanation += "STEP 3: Multiply\n";
        explanation += `  • ${percent/100} × ${value} = ${result}\n\n`;
        explanation += `✓ ANSWER: ${result}`;
        
        return { result: result.toFixed(2), explanation };
    }
    
    // Pattern 2: Discount/Tax scenarios
    if (query.includes('discount') || query.includes('off')) {
        const price = numbers.find(n => n > 10) || numbers[1];
        const discount = numbers.find(n => n < 100) || numbers[0];
        const discountAmount = (discount / 100) * price;
        const finalPrice = price - discountAmount;
        
        explanation += "STEP 1: Calculate discount amount\n";
        explanation += `  • Original price: $${price}\n`;
        explanation += `  • Discount: ${discount}%\n`;
        explanation += `  • Discount amount: ${discount}% of $${price} = $${discountAmount.toFixed(2)}\n\n`;
        explanation += "STEP 2: Subtract from original\n";
        explanation += `  • Final price: $${price} - $${discountAmount.toFixed(2)} = $${finalPrice.toFixed(2)}\n\n`;
        explanation += `✓ ANSWER: $${finalPrice.toFixed(2)}`;
        
        return { result: `$${finalPrice.toFixed(2)}`, explanation };
    }
    
    if (query.includes('tax') || query.includes('tip')) {
        const price = numbers.find(n => n > 10) || numbers[1];
        const rate = numbers.find(n => n < 100) || numbers[0];
        const addition = (rate / 100) * price;
        const total = price + addition;
        
        const label = query.includes('tax') ? 'tax' : 'tip';
        
        explanation += `STEP 1: Calculate ${label} amount\n`;
        explanation += `  • Base amount: $${price}\n`;
        explanation += `  • ${label.charAt(0).toUpperCase() + label.slice(1)} rate: ${rate}%\n`;
        explanation += `  • ${label.charAt(0).toUpperCase() + label.slice(1)} amount: ${rate}% of $${price} = $${addition.toFixed(2)}\n\n`;
        explanation += "STEP 2: Add to original\n";
        explanation += `  • Total: $${price} + $${addition.toFixed(2)} = $${total.toFixed(2)}\n\n`;
        explanation += `✓ ANSWER: $${total.toFixed(2)}`;
        
        return { result: `$${total.toFixed(2)}`, explanation };
    }
    
    // Default percentage calculation
    const percent = numbers[0];
    const value = numbers[1];
    const result = (percent / 100) * value;
    
    explanation += `Calculating ${percent}% of ${value}\n`;
    explanation += `Result: ${result.toFixed(2)}\n\n`;
    explanation += `✓ ANSWER: ${result.toFixed(2)}`;
    
    return { result: result.toFixed(2), explanation };
}

// ============================================================================
// SOLVER: RATE PROBLEMS (wages, costs, speed)
// ============================================================================

function solveRate(parsed) {
    let explanation = "🔍 RATE PROBLEM SOLVER\n" + "=".repeat(50) + "\n\n";
    const numbers = parsed.numbers;
    const query = parsed.cleaned;
    
    if (numbers.length < 2) {
        return { result: "Error", explanation: "Need at least 2 numbers for rate problems (rate and quantity)" };
    }
    
    const rate = numbers[0];
    const quantity = numbers[1];
    const result = rate * quantity;
    
    const isWage = ['work', 'worked', 'earn', 'make', 'pay', 'wage', 'salary'].some(w => query.includes(w));
    const isShopping = ['buy', 'bought', 'purchase', 'item', 'cost'].some(w => query.includes(w));
    
    explanation += "STEP 1: Identify the rate and quantity\n";
    if (isWage) {
        explanation += `  • Rate: $${rate}/hour\n`;
        explanation += `  • Hours worked: ${quantity}\n`;
    } else if (isShopping) {
        explanation += `  • Price per item: $${rate}\n`;
        explanation += `  • Number of items: ${quantity}\n`;
    } else {
        explanation += `  • Rate: ${rate}\n`;
        explanation += `  • Quantity: ${quantity}\n`;
    }
    
    explanation += "\nSTEP 2: Apply formula: Total = Rate × Quantity\n";
    explanation += `  • Calculation: ${rate} × ${quantity} = ${result}\n\n`;
    
    if (query.includes('$') || query.includes('dollar')) {
        explanation += `✓ ANSWER: $${result.toFixed(2)}`;
        return { result: `$${result.toFixed(2)}`, explanation };
    } else {
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
}

// ============================================================================
// SOLVER: COMPARISON PROBLEMS (twice, half, more than)
// ============================================================================

function solveComparison(parsed) {
    let explanation = "🔍 COMPARISON PROBLEM SOLVER\n" + "=".repeat(50) + "\n\n";
    const query = parsed.cleaned;
    const numbers = parsed.numbers;
    
    const comparisonKeywords = {
        'twice': 2,
        'double': 2,
        'triple': 3,
        'half': 0.5,
        'third': 1/3,
        'quarter': 0.25
    };
    
    // Check for keyword comparisons
    for (const [keyword, multiplier] of Object.entries(comparisonKeywords)) {
        if (query.includes(keyword) && numbers.length > 0) {
            const baseValue = numbers[0];
            const result = baseValue * multiplier;
            
            explanation += "STEP 1: Identify the comparison\n";
            explanation += `  • Base value: ${baseValue}\n`;
            explanation += `  • Comparison: '${keyword}' means × ${multiplier}\n\n`;
            explanation += "STEP 2: Calculate\n";
            explanation += `  • ${baseValue} × ${multiplier} = ${result}\n\n`;
            explanation += `✓ ANSWER: ${result}`;
            
            return { result: result.toString(), explanation };
        }
    }
    
    // Handle "X more than Y"
    if (query.includes('more than') && numbers.length >= 2) {
        const result = numbers[1] + numbers[0];
        explanation += `STEP 1: '${numbers[0]} more than ${numbers[1]}'\n`;
        explanation += `STEP 2: Add: ${numbers[1]} + ${numbers[0]} = ${result}\n\n`;
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
    
    // Handle "X less than Y"
    if (query.includes('less than') && numbers.length >= 2) {
        const result = numbers[1] - numbers[0];
        explanation += `STEP 1: '${numbers[0]} less than ${numbers[1]}'\n`;
        explanation += `STEP 2: Subtract: ${numbers[1]} - ${numbers[0]} = ${result}\n\n`;
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
    
    return { result: "Error", explanation: "Could not parse comparison. Try: 'twice 50' or '10 more than 30'" };
}

// ============================================================================
// SOLVER: MULTI-STEP PROBLEMS
// ============================================================================

function solveMultiStep(parsed) {
    let explanation = "🔍 MULTI-STEP PROBLEM SOLVER\n" + "=".repeat(50) + "\n\n";
    const query = parsed.cleaned;
    const numbers = parsed.numbers;
    
    if (numbers.length < 2) {
        return { result: "Error", explanation: "Need multiple numbers for multi-step problems" };
    }
    
    explanation += "Breaking down into steps:\n\n";
    
    // Simple multi-step: sum and then operation
    if (query.includes('then')) {
        const parts = query.split('then');
        
        // Step 1: Usually addition or initial calculation
        let intermediate;
        if (parts[0].includes('plus') || parts[0].includes('add')) {
            intermediate = numbers[0] + numbers[1];
            explanation += `STEP 1: ${numbers[0]} + ${numbers[1]} = ${intermediate}\n\n`;
        } else {
            intermediate = numbers[0];
            explanation += `STEP 1: Starting value = ${intermediate}\n\n`;
        }
        
        // Step 2: Apply next operation
        let result;
        if (parts[1].includes('multiply') || parts[1].includes('times')) {
            const multiplier = numbers[2] || 2;
            result = intermediate * multiplier;
            explanation += `STEP 2: ${intermediate} × ${multiplier} = ${result}\n\n`;
        } else if (parts[1].includes('divide')) {
            const divisor = numbers[2] || 2;
            result = intermediate / divisor;
            explanation += `STEP 2: ${intermediate} ÷ ${divisor} = ${result}\n\n`;
        } else {
            result = intermediate;
        }
        
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
    
    // Default multi-step: perform operations in sequence
    let result = numbers[0];
    explanation += `Starting value: ${result}\n`;
    
    for (let i = 1; i < numbers.length; i++) {
        if (query.includes('add') || query.includes('plus')) {
            result += numbers[i];
            explanation += `Add ${numbers[i]}: ${result}\n`;
        } else if (query.includes('subtract') || query.includes('minus')) {
            result -= numbers[i];
            explanation += `Subtract ${numbers[i]}: ${result}\n`;
        } else if (query.includes('multiply') || query.includes('times')) {
            result *= numbers[i];
            explanation += `Multiply by ${numbers[i]}: ${result}\n`;
        }
    }
    
    explanation += `\n✓ ANSWER: ${result}`;
    return { result: result.toString(), explanation };
}

// ============================================================================
// SOLVER: AVERAGE PROBLEMS
// ============================================================================

function solveAverage(parsed) {
    let explanation = "🔍 AVERAGE PROBLEM SOLVER\n" + "=".repeat(50) + "\n\n";
    const numbers = parsed.numbers;
    
    if (numbers.length === 0) {
        return { result: "Error", explanation: "Need numbers to calculate average" };
    }
    
    const sum = numbers.reduce((a, b) => a + b, 0);
    const average = sum / numbers.length;
    
    explanation += "STEP 1: List all numbers\n";
    explanation += `  • Numbers: ${numbers.join(', ')}\n`;
    explanation += `  • Count: ${numbers.length}\n\n`;
    
    explanation += "STEP 2: Calculate sum\n";
    explanation += `  • Sum: ${numbers.join(' + ')} = ${sum}\n\n`;
    
    explanation += "STEP 3: Divide by count\n";
    explanation += `  • Average: ${sum} ÷ ${numbers.length} = ${average}\n\n`;
    explanation += `✓ ANSWER: ${average.toFixed(2)}`;
    
    return { result: average.toFixed(2), explanation };
}

// ============================================================================
// SOLVER: EQUATION PROBLEMS
// ============================================================================

function solveEquation(parsed) {
    let explanation = "🔍 EQUATION SOLVER\n" + "=".repeat(50) + "\n\n";
    const query = parsed.cleaned;
    const numbers = parsed.numbers;
    
    // Simple linear equations: ax + b = c
    if (query.includes('=') && numbers.length >= 2) {
        // Example: "2x + 5 = 15" or "x + 3 = 10"
        let result;
        
        if (numbers.length === 2) {
            // Simple: x + a = b or x = b
            result = numbers[1] - (numbers[0] || 0);
            explanation += `Solving: x + ${numbers[0]} = ${numbers[1]}\n`;
            explanation += `x = ${numbers[1]} - ${numbers[0]}\n`;
            explanation += `x = ${result}\n\n`;
        } else if (numbers.length === 3) {
            // ax + b = c
            const a = numbers[0];
            const b = numbers[1];
            const c = numbers[2];
            result = (c - b) / a;
            explanation += `Solving: ${a}x + ${b} = ${c}\n`;
            explanation += `${a}x = ${c} - ${b}\n`;
            explanation += `${a}x = ${c - b}\n`;
            explanation += `x = ${(c - b)} ÷ ${a}\n`;
            explanation += `x = ${result}\n\n`;
        }
        
        explanation += `✓ ANSWER: x = ${result}`;
        return { result: `x = ${result}`, explanation };
    }
    
    return { result: "Error", explanation: "Could not parse equation. Try: 'x + 5 = 12' or '2x + 3 = 11'" };
}

// ============================================================================
// SOLVER: ARITHMETIC (default fallback)
// ============================================================================

function solveArithmetic(parsed) {
    let explanation = "🔍 ARITHMETIC SOLVER\n" + "=".repeat(50) + "\n\n";
    const query = parsed.cleaned;
    const numbers = parsed.numbers;
    
    if (numbers.length === 0) {
        return { result: "Error", explanation: "No numbers found in the query" };
    }
    
    if (numbers.length === 1) {
        return { result: numbers[0].toString(), explanation: `The number is: ${numbers[0]}` };
    }
    
    let result;
    
    // Addition
    if (query.includes('plus') || query.includes('add') || query.includes('sum') || query.includes('total')) {
        result = numbers.reduce((a, b) => a + b, 0);
        explanation += `Adding: ${numbers.join(' + ')} = ${result}\n\n`;
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
    
    // Subtraction
    if (query.includes('minus') || query.includes('subtract') || query.includes('difference')) {
        result = numbers[0] - numbers[1];
        explanation += `Subtracting: ${numbers[0]} - ${numbers[1]} = ${result}\n\n`;
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
    
    // Multiplication
    if (query.includes('times') || query.includes('multiply') || query.includes('product')) {
        result = numbers.reduce((a, b) => a * b, 1);
        explanation += `Multiplying: ${numbers.join(' × ')} = ${result}\n\n`;
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
    
    // Division
    if (query.includes('divide') || query.includes('divided by')) {
        if (numbers[1] === 0) {
            return { result: "Error", explanation: "Cannot divide by zero" };
        }
        result = numbers[0] / numbers[1];
        explanation += `Dividing: ${numbers[0]} ÷ ${numbers[1]} = ${result}\n\n`;
        explanation += `✓ ANSWER: ${result}`;
        return { result: result.toString(), explanation };
    }
    
    // Default: sum all numbers
    result = numbers.reduce((a, b) => a + b, 0);
    explanation += `Total of all numbers: ${numbers.join(' + ')} = ${result}\n\n`;
    explanation += `✓ ANSWER: ${result}`;
    return { result: result.toString(), explanation };
}

// ============================================================================
// HISTORY MANAGEMENT
// ============================================================================

function addToHistory(entry) {
    history.push({
        ...entry,
        timestamp: new Date().toLocaleString()
    });
    
    // Keep only last 50 entries
    if (history.length > 50) {
        history.shift();
    }
    
    // Save to localStorage
    localStorage.setItem('calculatorHistory', JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem('calculatorHistory');
    if (saved) {
        history = JSON.parse(saved);
    }
}

function showHistory() {
    loadHistory();
    const modal = document.getElementById('historyModal');
    const content = document.getElementById('historyContent');
    
    if (history.length === 0) {
        content.innerHTML = '<p style="color: #888;">No calculation history yet.</p>';
    } else {
        let html = '';
        history.reverse().forEach((entry, index) => {
            html += `
                <div class="history-entry">
                    <h4>#${history.length - index} [${entry.type.toUpperCase()}] - ${entry.timestamp}</h4>
                    <p><strong>Query:</strong> ${entry.query}</p>
                    <p><strong>Result:</strong> ${entry.result}</p>
                    <pre>${entry.explanation}</pre>
                </div>
            `;
        });
        content.innerHTML = html;
        history.reverse(); // Restore original order
    }
    
    modal.style.display = 'block';
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        history = [];
        localStorage.removeItem('calculatorHistory');
        closeModal('historyModal');
    }
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

function showAbout() {
    document.getElementById('aboutModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const historyModal = document.getElementById('historyModal');
    const aboutModal = document.getElementById('aboutModal');
    
    if (event.target === historyModal) {
        historyModal.style.display = 'none';
    }
    if (event.target === aboutModal) {
        aboutModal.style.display = 'none';
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadHistory();
    clearDisplay();
});
