import pytest
from platforms.tripadvisor.logic import build_page_url, parse_pages

def test_build_page_url():
    base = "https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-Hotel_Name.html"
    
    # Page 1 (offset 0)
    assert build_page_url(base, 0) == base
    
    # Page 2 (offset 10)
    expected = "https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-or10-Hotel_Name.html"
    assert build_page_url(base, 10) == expected
    
    # Already has offset
    existing = "https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-or20-Hotel_Name.html"
    assert build_page_url(existing, 30) == "https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-or30-Hotel_Name.html"

def test_parse_pages():
    # All pages
    assert parse_pages("*") == (0, None)
    
    # First N pages
    assert parse_pages("5") == (0, 5)
    
    # Range
    assert parse_pages("3-7") == (20, 7) # (3-1)*10 = 20
    
    # Single page range
    assert parse_pages("4-4") == (30, 4)
