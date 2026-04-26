from core.utils import normalize_url


def test_normalization():
    test_cases = [
        {
            "input": "https://www.booking.com/hotel/lk/lucky-tuna.html?aid=304142&label=gen173nr-10CAEoggI46AdIM1gEaMkBiAEBmAEzuAEXyAEM2AED6AEB-AEBiAIBqAIBuALTr9XOBsACAdICJDk3OTFkNzgyLWEyYjAtNDczOC04ZDIwLTVlOTZmMjliMmUwY9gCAeACAQ&sid=fcefd419dc8090292764df0c6faa8446&dist=0&group_adults=2&group_children=0&hapos=34&hpos=9&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&srepoch=1775589352&srpvid=2327876d1b6c072a&type=total&ucfs=1&",
            "expected": "https://www.booking.com/hotel/lk/lucky-tuna.html",
        },
        {
            "input": "https://www.agoda.com/hotel-luckytuna/hotel/hikkaduwa-lk.html?cid=1844104&ds=W5%2By%2F%2F%2F",
            "expected": "https://www.agoda.com/hotel-luckytuna/hotel/hikkaduwa-lk.html",
        },
        {
            "input": "https://www.tripadvisor.com/Hotel_Review-g297899-d123456-Reviews-Lucky_Tuna-Hikkaduwa_Galle_District_Southern_Province.html#REVIEWS",
            "expected": "https://www.tripadvisor.com/Hotel_Review-g297899-d123456-Reviews-Lucky_Tuna-Hikkaduwa_Galle_District_Southern_Province.html",
        },
        {
            "input": "https://www.google.com/maps/place/Lucky+Tuna/@6.13456,80.12345,17z/data=!3m1!4b1!4m9!3m8!1s0x3ae177...!8m2!3d6.1345!4d80.1234!16s%2Fg%2F1tf_y6_4?entry=ttu",
            "expected": "https://www.google.com/maps/place/Lucky+Tuna/@6.13456,80.12345,17z/data=!3m1!4b1!4m9!3m8!1s0x3ae177...!8m2!3d6.1345!4d80.1234!16s%2Fg%2F1tf_y6_4",
        },
    ]

    print("=== Testing URL Normalization ===")
    for case in test_cases:
        result = normalize_url(case["input"])
        print(f"Input: {case['input'][:50]}...")
        print(f"Result: {result}")
        assert result == case["expected"]
        print("Status: PASS\n")


if __name__ == "__main__":
    test_normalization()
