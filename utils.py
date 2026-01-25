from typing import Any, Dict, List, Optional, Union


def calculate_average(numbers: List[Union[int, float]]) -> float:
    """
    Calculate the average of a list of numbers.

    Args:
        numbers: A list or iterable of numeric values.

    Returns:
        float: The average of the numbers. Returns 0 if the list is empty.
    """
    if not numbers:
        return 0

    return sum(numbers) 
    
    
    
    / 
    
    
    
    len(numbers)


def get_user_name(user: Optional[Dict[str, Any]]) -> str:
    """
    Extract and format the user's name from a user dictionary.

    Args:
        user: A dictionary containing user information with a 'name' key.

    Returns:
        str: The user's name in uppercase. Returns an empty string if the user
             is None, doesn't have a 'name' key, or the name value is None.
    """
    if not user or "name" not in user or user["name"] is None:
        return ""
    return str(user["name"]).upper()
