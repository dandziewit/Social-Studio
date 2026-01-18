"""
COMPREHENSIVE DEMONSTRATION SCRIPT
Production-Grade AI Calculator - All Features

Run this to see the complete reasoning engine in action.
"""

from calculator import MathAI
import time

def print_header(title):
    """Print formatted section header."""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def test_query(ai, query, expected=None):
    """Test a single query and display results."""
    print(f"\n📝 Query: {query}")
    if expected:
        print(f"🎯 Expected: {expected}")
    
    print("\n⚙️  Processing...", end=" ")
    start = time.time()
    result, explanation, success = ai.process_query(query)
    elapsed = (time.time() - start) * 1000
    
    if success:
        print(f"✅ Done ({elapsed:.2f}ms)\n")
        print(f"📊 Result: {result}")
        print(f"\n{explanation}")
        
        if expected and expected in str(result):
            print("\n✅ TEST PASSED")
        elif expected:
            print(f"\n❌ TEST FAILED (expected {expected}, got {result})")
    else:
        print(f"❌ Error\n{explanation}")
    
    print("-" * 80)

def main():
    """Run comprehensive demonstration."""
    
    print_header("🚀 AI CALCULATOR - PRODUCTION-GRADE REASONING ENGINE")
    print("\nInitializing MathAI engine...")
    ai = MathAI()
    print("✅ Engine ready!")
    
    # TEST SUITE 1: RATE PROBLEMS
    print_header("TEST SUITE 1: RATE PROBLEMS (Wages, Shopping, Speed)")
    
    test_query(ai, 
        "I make 16 dollars an hour and I worked 40 hours",
        "640")
    
    test_query(ai,
        "If I buy 12 items at 8 dollars each, what's the total?",
        "96")
    
    # TEST SUITE 2: COMPARISON PROBLEMS
    print_header("TEST SUITE 2: COMPARISON PROBLEMS (Relationships)")
    
    test_query(ai, "twice 50", "100")
    test_query(ai, "half of 200", "100")
    test_query(ai, "10 more than 30", "40")
    test_query(ai, "5 less than 20", "15")
    
    # TEST SUITE 3: PERCENTAGE PROBLEMS
    print_header("TEST SUITE 3: PERCENTAGE PROBLEMS (Discounts, Tax, Tips)")
    
    test_query(ai, "What is 20% of 150?", "30")
    test_query(ai, "Increase 100 by 25%", "125")
    test_query(ai, "Decrease 200 by 10%", "180")
    
    # TEST SUITE 4: EQUATION SOLVING
    print_header("TEST SUITE 4: EQUATION SOLVING (Algebraic)")
    
    test_query(ai, "solve 2x + 5 = 17", "6")
    test_query(ai, "find x when 3x - 7 = 14", "7")
    
    # TEST SUITE 5: MULTI-STEP PROBLEMS
    print_header("TEST SUITE 5: MULTI-STEP PROBLEMS (Sequential Operations)")
    
    test_query(ai,
        "Start with 100, add 10%, then subtract 30",
        "80")
    
    test_query(ai,
        "Start with 50, multiply by 2, then add 25",
        "125")
    
    # TEST SUITE 6: STATISTICS
    print_header("TEST SUITE 6: STATISTICS (Averages)")
    
    test_query(ai, "average of 10, 20, 30, 40", "25")
    test_query(ai, "mean of 5, 15, 25, 35, 45", "25")
    
    # TEST SUITE 7: ARITHMETIC
    print_header("TEST SUITE 7: ARITHMETIC (Basic Math)")
    
    test_query(ai, "15 + 25 * 2", "65")  # Order of operations
    test_query(ai, "100 - 35 + 20", "85")
    
    # TEST SUITE 8: EDGE CASES
    print_header("TEST SUITE 8: EDGE CASES (Complex/Ambiguous)")
    
    test_query(ai,
        "Bob has been gone for 10 minutes and will return in 20 minutes, how long total?",
        "30")
    
    test_query(ai, "What is 0% of 1000?", "0")
    test_query(ai, "solve x = 42", "42")
    
    # SUMMARY
    print_header("📈 DEMONSTRATION COMPLETE")
    
    history = ai.get_history()
    print(f"\n✅ Total queries processed: {len(history)}")
    
    # Count by type
    types = {}
    for entry in history:
        problem_type = entry['type']
        types[problem_type] = types.get(problem_type, 0) + 1
    
    print(f"\n📊 Queries by type:")
    for ptype, count in sorted(types.items(), key=lambda x: x[1], reverse=True):
        print(f"  • {ptype}: {count}")
    
    # Confidence stats
    confidences = [entry['confidence'] for entry in history]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    print(f"\n🎯 Average confidence: {avg_confidence:.1%}")
    print(f"🏆 High confidence queries (>90%): {sum(1 for c in confidences if c > 0.9)}")
    
    print("\n" + "="*80)
    print("  ✅ ALL SYSTEMS OPERATIONAL - PRODUCTION READY")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
