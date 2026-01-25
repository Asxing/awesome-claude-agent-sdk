"""
Fibonacci number calculation implementations.

This module provides multiple approaches to calculate Fibonacci numbers,
each with different performance characteristics.
"""

from typing import Dict


def fibonacci_recursive(n: int) -> int:
    """
    Calculate the nth Fibonacci number using recursion.

    This is the most intuitive implementation but has exponential time complexity O(2^n)
    due to redundant calculations. Not recommended for large values of n.

    Args:
        n: The position in the Fibonacci sequence (0-indexed).
           Must be a non-negative integer.

    Returns:
        The nth Fibonacci number.

    Raises:
        ValueError: If n is negative.

    Examples:
        >>> fibonacci_recursive(0)
        0
        >>> fibonacci_recursive(1)
        1
        >>> fibonacci_recursive(10)
        55
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer")

    if n <= 1:
        return n

    return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)


def fibonacci_memoized(n: int, memo: Dict[int, int] = None) -> int:
    """
    Calculate the nth Fibonacci number using memoization.

    This approach caches previously calculated values to avoid redundant calculations,
    achieving O(n) time complexity and O(n) space complexity.

    Args:
        n: The position in the Fibonacci sequence (0-indexed).
           Must be a non-negative integer.
        memo: Optional dictionary to store calculated values. Used for recursion.

    Returns:
        The nth Fibonacci number.

    Raises:
        ValueError: If n is negative.

    Examples:
        >>> fibonacci_memoized(0)
        0
        >>> fibonacci_memoized(1)
        1
        >>> fibonacci_memoized(50)
        12586269025
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer")

    if memo is None:
        memo = {}

    if n in memo:
        return memo[n]

    if n <= 1:
        return n

    memo[n] = fibonacci_memoized(n - 1, memo) + fibonacci_memoized(n - 2, memo)
    return memo[n]


def fibonacci_iterative(n: int) -> int:
    """
    Calculate the nth Fibonacci number using iteration.

    This approach uses a bottom-up iterative method with O(n) time complexity
    and O(1) space complexity. This is the most efficient approach for most use cases.

    Args:
        n: The position in the Fibonacci sequence (0-indexed).
           Must be a non-negative integer.

    Returns:
        The nth Fibonacci number.

    Raises:
        ValueError: If n is negative.

    Examples:
        >>> fibonacci_iterative(0)
        0
        >>> fibonacci_iterative(1)
        1
        >>> fibonacci_iterative(100)
        354224848179261915075
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer")

    if n <= 1:
        return n

    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr

    return curr


def fibonacci_generator(max_n: int):
    """
    Generate Fibonacci numbers up to the nth position.

    This generator yields Fibonacci numbers one at a time, which is memory-efficient
    when you need to iterate through multiple Fibonacci numbers.

    Args:
        max_n: The maximum position in the Fibonacci sequence to generate (inclusive).
               Must be a non-negative integer.

    Yields:
        Fibonacci numbers from position 0 to max_n.

    Raises:
        ValueError: If max_n is negative.

    Examples:
        >>> list(fibonacci_generator(5))
        [0, 1, 1, 2, 3, 5]
        >>> list(fibonacci_generator(10))
        [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
    """
    if max_n < 0:
        raise ValueError("max_n must be a non-negative integer")

    if max_n >= 0:
        yield 0

    if max_n >= 1:
        yield 1

    prev, curr = 0, 1
    for _ in range(2, max_n + 1):
        prev, curr = curr, prev + curr
        yield curr


if __name__ == "__main__":
    # Example usage
    print("Fibonacci numbers (iterative approach):")
    for i in range(15):
        print(f"F({i}) = {fibonacci_iterative(i)}")

    print("\nUsing generator:")
    print(f"First 15 Fibonacci numbers: {list(fibonacci_generator(14))}")
