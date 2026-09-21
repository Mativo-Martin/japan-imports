"""Data source configuration and constants."""

IMPORT_SOURCES = ["beforward", "sbt"]

LOCAL_SOURCES = ["peachcars"]  
ALL_SOURCES = IMPORT_SOURCES + LOCAL_SOURCES

IMPORT_SOURCES_SQL = ",".join(f"'{s}'" for s in IMPORT_SOURCES)
LOCAL_SOURCES_SQL = ",".join(f"'{s}'" for s in LOCAL_SOURCES)
