"""Data source configuration and constants."""

# Import sources (Japan market)
IMPORT_SOURCES = ["beforward", "sbt", "sbt_japan"]

# Local sources (Kenya market)
LOCAL_SOURCES = ["peachcars"]  # Can be extended: "sbt_kenya"

# All sources combined
ALL_SOURCES = IMPORT_SOURCES + LOCAL_SOURCES

# SQL-safe format for raw SQL queries
IMPORT_SOURCES_SQL = ",".join(f"'{s}'" for s in IMPORT_SOURCES)
LOCAL_SOURCES_SQL = ",".join(f"'{s}'" for s in LOCAL_SOURCES)
