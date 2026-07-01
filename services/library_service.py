# -*- coding: utf-8 -*-
import database

class LibraryService:
    @staticmethod
    def get_media_tags(db_type, library_id=None):
        conn = database.get_connection(db_type)
        cursor = conn.cursor()

        if library_id and library_id not in ('all', 'favorite', 'history', 'home'):
            cursor.execute(
                "SELECT DISTINCT tags FROM books WHERE library_id = ? AND tags IS NOT NULL AND tags != ''",
                (library_id,)
            )
        else:
            cursor.execute("SELECT DISTINCT tags FROM books WHERE tags IS NOT NULL AND tags != ''")

        rows = cursor.fetchall()
        conn.close()

        unique_tags = set()
        for r in rows:
            if r[0]:
                for tag in str(r[0]).split(','):
                    clean_tag = tag.strip()
                    if clean_tag:
                        unique_tags.add(clean_tag)

        return sorted(unique_tags)

    @staticmethod
    def get_media_genres(db_type, library_id=None):
        conn = database.get_connection(db_type)
        cursor = conn.cursor()

        if library_id and library_id not in ('all', 'favorite', 'history', 'home'):
            cursor.execute(
                "SELECT DISTINCT genre FROM books WHERE library_id = ? AND genre IS NOT NULL AND genre != ''",
                (library_id,)
            )
        else:
            cursor.execute("SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL AND genre != ''")

        rows = cursor.fetchall()
        conn.close()

        unique_genres = set()
        for r in rows:
            if r[0]:
                for genre in str(r[0]).split(','):
                    clean_genre = genre.strip()
                    if clean_genre:
                        unique_genres.add(clean_genre)

        return sorted(unique_genres)
