# 🧩 Metadata Provider Plugin Development Guide (Plugin Guide)

This document describes how to develop and add a new metadata search plugin to integrate external APIs (e.g., Google Books, Amazon, etc.) without modifying the core system of BookOasis.

---

## 1. Creating a New Plugin

### 1) Create a Provider File
Create a new Python file (e.g., `google.py`) in the `plugins/metadata/` directory. The filename will be used as the provider's internal module name.

### 2) Write the Provider Class
Your class must inherit from `BaseMetadataProvider` defined in [plugins/metadata/base.py](../plugins/metadata/base.py).
The class name must follow this camel-case pattern: `{CamelCaseFileName}MetadataProvider`.
* Example: `google.py` -> `GoogleMetadataProvider`

---

## 2. Defining UI & Configuration Schema (config_schema)

To expose your plugin in the Web UI (**Settings > Plugin Settings**) and accept configuration inputs, define the following class attributes:

* `id` (str): Unique identifier (usually the same as the filename).
* `name` (str): The plugin name displayed on the user interface screen.
* `is_searchable` (bool): Whether to show this plugin in the manual metadata matching search modal on the book details page.
* `config_schema` (list): Defines the input fields specs automatically rendered by the UI.

### 💡 JSON Serialization for Plugin Config
Form data inputted by users is serialized into a single JSON string and stored in the `value` column of the `settings` table with the key `PLUGIN_CONFIG_{id}`. This handles complex data properties without structural loss.

**Supported Input Types:**
* `text` / `password` / `number`: Basic input elements.
* `checkbox`: Boolean toggle switches (True/False).
* `select`: Dropdown selection menus (requires configuring the `options` array).

**config_schema Example:**
```python
config_schema = [
    {"key": "API_KEY", "label": "API Token Key", "type": "password", "required": True},
    {"key": "MAX_RETRIES", "label": "Max Retries Count", "type": "number", "default": 3},
    {"key": "SERVER_REGION", "label": "Server Area", "type": "select", "options": [
        {"value": "us", "label": "United States (US)"},
        {"value": "kr", "label": "South Korea (KR)"}
    ]}
]
```

---

## 3. Implementing Interface Methods

You must override and implement the following two core abstract methods in your plugin class.

### 1) `search(self, db_type, query)`
* **Role**: Queries external APIs and returns matching candidate lists.
* **Arguments**:
  * `db_type` (str): `'prod'` (Production) or `'dev'` (Development)
  * `query` (str): Searching text query (e.g., book title).
* **Return Value**: `list[dict]` (A list of book dictionaries matching the format below):
  ```python
  results = [
      {
          'title': 'Book Title String',
          'author': 'Author String',
          'publisher': 'Publisher Name',
          'pubDate': 'Publication Date (YYYY-MM-DD)',
          'cover': 'Raw image source cover URL',
          'description': 'Brief or detailed description text',
          'link': 'External detailed link URL connection'
      }
  ]
  ```

### 2) `apply(self, db_type, book_id, item_data)`
* **Role**: Triggered when a user clicks the "Apply" button. Downloads the cover image to the local cache and updates the database records.
* **Arguments**:
  * `db_type` (str): Database target environment indicator.
  * `book_id` (int): Target primary key record ID in the `books` table.
  * `item_data` (dict): Selected single dictionary item among `search` results.
* **Return Value**: `tuple[bool, str]` - `(success_boolean, feedback_message_string)`

---

## 4. Plugin Code Template Example

```python
# -*- coding: utf-8 -*-
import json
import database
from plugins.metadata.base import BaseMetadataProvider

class GoogleMetadataProvider(BaseMetadataProvider):
    id = "google"
    name = "Google Books"
    is_searchable = True
    config_schema = [
        {"key": "GOOGLE_API_KEY", "label": "Google API Key", "type": "text", "required": True}
    ]

    def _get_api_key(self, db_type):
        """Restores and retrieves the API key stored in the DB configuration"""
        try:
            conn = database.get_connection(db_type)
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = 'PLUGIN_CONFIG_google'")
            row = cursor.fetchone()
            conn.close()
            if row and row['value']:
                return json.loads(row['value']).get('GOOGLE_API_KEY')
        except Exception:
            pass
        return None

    def search(self, db_type, query):
        api_key = self._get_api_key(db_type)
        if not api_key or not query:
            return []
        
        # Implement external network search API call here...
        return []

    def apply(self, db_type, book_id, item_data):
        # Implement cover image download and database UPDATE queries...
        return True, "Metadata applied successfully"
```

---

## 5. Registration and Activation Process

1. Save your completed Python code script inside the `plugins/metadata/` directory.
2. Restart your BookOasis media server process.
3. Access the web interface dashboard, go to the **Settings > Plugin Settings** tab.
4. Toggle your new plugin **ON** to enable it, fill in any required variables, and click save.
5. If `is_searchable = True` was declared, it will automatically populate as a search option in the "Manual Metadata Match" modal.
