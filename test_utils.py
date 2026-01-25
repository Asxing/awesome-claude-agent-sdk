"""Unit tests for utils.py module."""

import unittest
from utils import calculate_average, get_user_name


class TestCalculateAverage(unittest.TestCase):
    """Test cases for calculate_average function."""

    def test_average_of_positive_integers(self):
        """Test average calculation with positive integers."""
        result = calculate_average([1, 2, 3, 4, 5])
        self.assertEqual(result, 3.0)

    def test_average_of_negative_integers(self):
        """Test average calculation with negative integers."""
        result = calculate_average([-1, -2, -3, -4, -5])
        self.assertEqual(result, -3.0)

    def test_average_of_mixed_integers(self):
        """Test average calculation with mixed positive and negative integers."""
        result = calculate_average([-2, -1, 0, 1, 2])
        self.assertEqual(result, 0.0)

    def test_average_of_floats(self):
        """Test average calculation with floating point numbers."""
        result = calculate_average([1.5, 2.5, 3.5])
        self.assertAlmostEqual(result, 2.5)

    def test_average_of_mixed_int_and_float(self):
        """Test average calculation with mixed integers and floats."""
        result = calculate_average([1, 2.5, 3, 4.5])
        self.assertAlmostEqual(result, 2.75)

    def test_average_of_single_number(self):
        """Test average calculation with a single number."""
        result = calculate_average([42])
        self.assertEqual(result, 42.0)

    def test_average_of_empty_list(self):
        """Test average calculation with an empty list."""
        result = calculate_average([])
        self.assertEqual(result, 0)

    def test_average_of_zeros(self):
        """Test average calculation with all zeros."""
        result = calculate_average([0, 0, 0])
        self.assertEqual(result, 0.0)

    def test_average_with_large_numbers(self):
        """Test average calculation with large numbers."""
        result = calculate_average([1000000, 2000000, 3000000])
        self.assertEqual(result, 2000000.0)


class TestGetUserName(unittest.TestCase):
    """Test cases for get_user_name function."""

    def test_valid_user_with_name(self):
        """Test with a valid user dictionary containing a name."""
        user = {"name": "john doe"}
        result = get_user_name(user)
        self.assertEqual(result, "JOHN DOE")

    def test_user_with_uppercase_name(self):
        """Test with a user name already in uppercase."""
        user = {"name": "JANE SMITH"}
        result = get_user_name(user)
        self.assertEqual(result, "JANE SMITH")

    def test_user_with_mixed_case_name(self):
        """Test with a user name in mixed case."""
        user = {"name": "Alice WoNdErLaNd"}
        result = get_user_name(user)
        self.assertEqual(result, "ALICE WONDERLAND")

    def test_user_with_numeric_name(self):
        """Test with a numeric name value."""
        user = {"name": 12345}
        result = get_user_name(user)
        self.assertEqual(result, "12345")

    def test_user_with_empty_string_name(self):
        """Test with an empty string as name."""
        user = {"name": ""}
        result = get_user_name(user)
        self.assertEqual(result, "")

    def test_user_with_none_name(self):
        """Test with None as the name value."""
        user = {"name": None}
        result = get_user_name(user)
        self.assertEqual(result, "")

    def test_none_user(self):
        """Test with None as the user parameter."""
        result = get_user_name(None)
        self.assertEqual(result, "")

    def test_user_without_name_key(self):
        """Test with a user dictionary missing the 'name' key."""
        user = {"email": "test@example.com", "age": 30}
        result = get_user_name(user)
        self.assertEqual(result, "")

    def test_empty_user_dict(self):
        """Test with an empty user dictionary."""
        user = {}
        result = get_user_name(user)
        self.assertEqual(result, "")

    def test_user_with_special_characters(self):
        """Test with a name containing special characters."""
        user = {"name": "josé garcía"}
        result = get_user_name(user)
        self.assertEqual(result, "JOSÉ GARCÍA")

    def test_user_with_whitespace_name(self):
        """Test with a name containing only whitespace."""
        user = {"name": "   "}
        result = get_user_name(user)
        self.assertEqual(result, "   ")


if __name__ == "__main__":
    unittest.main()
