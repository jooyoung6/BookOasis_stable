# -*- coding: utf-8 -*-
import json
import database

class PluginService:
    @staticmethod
    def toggle_plugin_enabled(db_type, plugin_id, enabled_val):
        if not plugin_id:
            return False, 'plugin_id is required'

        conn = database.get_connection(db_type)
        cursor = conn.cursor()
        key = f"PLUGIN_ENABLED_{plugin_id}"
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, enabled_val))
        conn.commit()
        conn.close()

        return True, None

    @staticmethod
    def save_plugin_config(db_type, plugin_id, config_data):
        if not plugin_id:
            return False, 'plugin_id is required'

        if not isinstance(config_data, str):
            try:
                config_str = json.dumps(config_data)
            except (TypeError, ValueError):
                return False, 'Invalid config data'
        else:
            config_str = config_data

        try:
            json.loads(config_str)
        except (TypeError, ValueError):
            return False, 'Invalid JSON config'

        conn = database.get_connection(db_type)
        cursor = conn.cursor()
        key = f"PLUGIN_CONFIG_{plugin_id}"
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, config_str))
        conn.commit()
        conn.close()

        return True, None
