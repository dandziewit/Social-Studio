"""
Test script for AI Calculator functionality
Run this to verify AI mode works without GUI
"""

import sys
sys.path.insert(0, '.')

# Import just the AI component
from calculator import MathAI

def test_ai():
    """Test various AI capabilities"""
    ai = MathAI()
    
    test_cases = [
        "What is 20% of 80?",
        "Solve 2x + 5 = 17",
        "If I work 40 hours at $25/hour, how much do I make?",
        "Average of 10, 20, 30, 40",
        "Start with 100, add 10%, then subtract 50",
        "What is 25 + 37?",
        "Increase 200 by 15%",
    ]
    
    print("=" * 70)
    print("AI CALCULATOR TEST SUITE")
    print("=" * 70)
    
    for i, query in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"Test #{i}")
        print(f"{'='*70}")
        print(f"Query: {query}")
        print()
        
        result, explanation, success = ai.process_query(query)
        
        if success:
            print(f"✓ SUCCESS")
            print(f"Result: {result}")
            print(f"\n{explanation}")
        else:
            print(f"✗ FAILED")
            print(f"Error: {explanation}")
    
    print(f"\n{'='*70}")
    print(f"CALCULATION HISTORY ({len(ai.get_history())} entries)")
    print(f"{'='*70}")
    
    for i, entry in enumerate(ai.get_history(), 1):
        print(f"\n#{i} [{entry['type'].upper()}] - Result: {entry['result']}")

if __name__ == "__main__":
    test_ai()
    print("\n✓ All tests completed!")
    print("\nTo run the full GUI application, execute: python calculator.py")
