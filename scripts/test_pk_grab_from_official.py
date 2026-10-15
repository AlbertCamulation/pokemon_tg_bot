import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pk_grab_from_official import resolve_en_url


class ResolveEnUrlTest(unittest.TestCase):
    zh_url = "https://pokemongo.com/zh_Hant/news/go-battle-league-twilight-trails"

    def test_matches_english_url_by_slug(self):
        en_urls = [
            "https://pokemongo.com/en/news/some-other-post",
            "https://pokemongo.com/en/news/go-battle-league-twilight-trails",
        ]
        self.assertEqual(
            resolve_en_url(self.zh_url, en_urls),
            "https://pokemongo.com/en/news/go-battle-league-twilight-trails",
        )

    def test_falls_back_to_first_english_url_when_slug_misses(self):
        en_urls = ["https://pokemongo.com/en/news/go-battle-league-older-season"]
        self.assertEqual(resolve_en_url(self.zh_url, en_urls), en_urls[0])

    def test_empty_english_list_uses_shared_slug(self):
        self.assertEqual(
            resolve_en_url(self.zh_url, []),
            "https://pokemongo.com/en/news/go-battle-league-twilight-trails",
        )

    def test_empty_english_list_and_blank_slug_keeps_zh_url(self):
        self.assertEqual(resolve_en_url("", []), "")


if __name__ == "__main__":
    unittest.main()
