import datetime
import ipaddress
import multiprocessing
import os
import shutil
import sqlite3
import threading
import time
import traceback

from faster_fifo import Queue

from syslogger.engine import InternalLog


class DataBaseHook:

    def __init__(self, name: str, data_base_config: dict, verbose: bool = False):
        self.__name = name.strip()

        if not isinstance(self.__name, str):
            raise Exception("name must be str")

        self.__stop_db = multiprocessing.Value("b", False)
        self.__logs_saved_to_database_per_second = multiprocessing.Value("i", 0)
        self.__verbose: bool = verbose
        self.__logs_saved_to_database_per_second_for_return = 0

        self.__data_base_queue = Queue(100000000)
        self.__internal_status_log = Queue(10000)
        self.__data_already_committed_to_database = Queue(1000)

        self.__len_of_varchar_for_field_which_is_not_ip = None
        self.__len_of_varchar_for_unprocessed_log = None
        self.__lock_process = multiprocessing.RLock()
        self.__load_checker = True
        self.__shared_manager = multiprocessing.Manager()
        self.__shared_dictionary = self.__shared_manager.dict()

        self.__data_base_processor: multiprocessing.Process = multiprocessing.Process(
            target=self.__database_process, name=f"database ({self.__name}) insert process")
        try:
            self.__root_path = data_base_config["log_saving_directory"]
            os.makedirs(os.path.join(self.__root_path), exist_ok=True)
        except Exception:
            self.__root_path = "saved_log"
            msg = "'log_saving_directory' is invalid, using default which is 'saved_log'"
            self.__add_internal_status_to_queue(InternalLog.Type.Info, msg)
        if self.__verbose:
            print(f"Database ({self.__name}) Verbose Mode is ON")

    def __create_database(self, client_name: str, database_name: str):

        with self.__lock_process:
            try:
                if len(database_name) < 3 or len(client_name) < 3:
                    return "invalid name length"
                if not isinstance(database_name, str) or not isinstance(client_name, str):
                    raise Exception
                database_name = database_name + ".db"
                if os.path.exists(os.path.join(self.__root_path, client_name, database_name)):
                    return "already exists"
                else:
                    os.makedirs(os.path.join(self.__root_path, client_name), exist_ok=True)
                    with open(os.path.join(self.__root_path, client_name, database_name), 'w') as _:
                        pass
            except Exception:
                return "invalid name type"
        return True

    def __saved_databases(self):
        try:
            temp = {}
            for _dir in os.listdir(os.path.join(self.__root_path)):
                sub = os.listdir(os.path.join(self.__root_path, _dir))
                if len(sub) > 0:
                    temp[_dir] = [
                        [db.replace(".db", ""),
                         f"{os.path.getsize(os.path.join(self.__root_path, _dir, db)) / (1024 ** 3):.2f}",
                         "busy" if self.is_db_busy(_dir, db) else "ready"
                         ]
                        for db in os.listdir(os.path.join(self.__root_path, _dir))
                        if db.endswith(".db")
                    ]
                else:
                    temp[_dir] = "no data"
            if len(temp.keys()) == 0:
                temp = "no client"
            return temp
        except Exception:
            return False

    def __delete_client(self, client_name: str):
        with self.__lock_process:
            try:
                if not os.path.exists(os.path.join(self.__root_path, client_name)):
                    return True
                else:
                    shutil.rmtree(os.path.join(self.__root_path, client_name), ignore_errors=True)
            except Exception as e:
                raise Exception(str(e))
            return True

    def is_db_busy(self, client, database):
        try:
            keys = self.__shared_dictionary.keys()
            for key in keys:
                if (client + "__" + database[:-3]) == key:
                    return True
        except Exception:
            return True
        else:
            return False

    def __add_internal_status_to_queue(self, status_type: InternalLog.Type, msg: str, origin: str = "Database"):
        # Must Consume For Future Log Otherwise The Log Will Be Discarded
        size = self.__internal_status_log.qsize()
        try:
            if size < 20:
                self.__internal_status_log.put_nowait(InternalLog(status_type, msg, origin + f" ({self.__name})"))
        except Exception:
            pass
        # Must Consume For Future Log Otherwise The Log Will Be Discarded

    def __add_committed_data_to_log(self, data: dict):
        # Must Consume For Future Log Otherwise The Log Will Be Discarded
        size = self.__data_already_committed_to_database.qsize()
        try:
            if size < 20:
                self.__data_already_committed_to_database.put_nowait(data)
        except Exception:
            pass
        # Must Consume For Future Log Otherwise The Log Will Be Discarded

    def __calculate_logs_saved_to_database_per_seconds(self):
        while self.__load_checker:
            saved_per_second = self.__logs_saved_to_database_per_second.value
            self.__logs_saved_to_database_per_second.value = 0
            self.__logs_saved_to_database_per_second_for_return = saved_per_second
            time.sleep(1)

    @staticmethod
    def __create_table(values):
        template_start = '''CREATE TABLE IF NOT EXISTS LOG ('''
        template_end = ''');'''

        for value in values["value"]:
            if value == "time":
                sql_type = "TIMESTAMP"
            else:
                sql_type = "TEXT"
            column = f'''{value} {sql_type},'''
            template_start += column
        template_start = template_start[:-1]
        template_start += template_end
        return template_start

    @staticmethod
    def __insert_statement(values):
        template_start = '''INSERT INTO LOG ('''
        template_middle = ''') VALUES ('''
        template_end = ''')'''
        for value in values["value"]:
            column = f'''{value},'''
            template_start += column
            template_middle += "?,"
        template_start = template_start[:-1]
        template_start += template_middle[:-1]
        template_start += template_end
        return template_start

    def __database_process(self):
        connections = {}
        connections_checker = 0

        while True:
            try:
                current_time = time.time()
                try:
                    if current_time - connections_checker > 30:
                        inactive_connections = []
                        connections_checker = current_time
                        for connection in connections:
                            if current_time - connections[connection]["last_accessed"] > 10:
                                connections[connection]["connection"].commit()
                                connections[connection]["connection"].close()
                                inactive_connections.append(connection)
                        for connection in inactive_connections:
                            connections.pop(connection)
                            self.__shared_dictionary.pop(connection)

                    if not self.__stop_db.value:
                        bunch = self.__data_base_queue.get_many(max_messages_to_get=51000, timeout=0.005)
                    else:
                        for connection in connections:
                            try:
                                connections[connection]["connection"].close()
                            except Exception:
                                pass
                        return
                except Exception:
                    continue

                log_count = 0
                for processed_info in bunch:
                    if self.__verbose:
                        print(f"Verbose Database ({self.__name}): [Database Queue:{self.__data_base_queue.qsize()},"
                              f" Saved Data Queue: {self.__data_already_committed_to_database.qsize()},"
                              f" Internal Status Queue: {self.__internal_status_log.qsize()}]", processed_info)

                    target_database = processed_info["client_name"] + "__" + processed_info["date"]
                    # For Caching Db Names

                    if target_database not in connections.keys():
                        self.__create_database(processed_info["client_name"], processed_info["date"])

                        connections[target_database] = {"connection": sqlite3.connect(
                            os.path.join(self.__root_path, processed_info["client_name"],
                                         processed_info["date"] + ".db"), check_same_thread=False, ),
                            "last_accessed": current_time
                        }
                        connections[target_database]["connection"].execute(self.__create_table(processed_info))
                        connections[target_database]["connection"].execute("PRAGMA journal_mode = WAL")
                        connections[target_database]["connection"].execute("PRAGMA synchronous = FULL")
                        connections[target_database]["connection"].commit()
                        self.__shared_dictionary[target_database] = "active"
                        connections[target_database]["insert"] = DataBaseHook.__insert_statement(processed_info)
                        connections[target_database]["values"] = []

                    # For Caching Db Names
                    data = processed_info["value"]
                    connections[target_database]["values"].append(tuple(data.values()))
                    connections[target_database]["last_accessed"] = current_time
                    log_count += 1
                    if log_count < 5:
                        self.__add_committed_data_to_log(processed_info["value"])

                for connection in connections:
                    connections[connection]["connection"].executemany(
                        connections[connection]["insert"],
                        connections[connection]["values"]
                    )
                    connections[connection]["connection"].commit()

                    connections[connection]["values"] = []
                self.__logs_saved_to_database_per_second.value += len(bunch)
            except Exception as e:
                msg = f"error in database processor, extremely critical error. no log will be saved to database, {e}"
                self.__add_internal_status_to_queue(InternalLog.Type.Error, msg)
                if self.__verbose:
                    traceback.print_exc()

    def start(self):
        self.__data_base_processor.start()
        msg = "database processor is started successfully"
        self.__add_internal_status_to_queue(InternalLog.Type.Info, msg)
        threading.Thread(target=self.__calculate_logs_saved_to_database_per_seconds,
                         name=f"database ({self.__name}) load checker", daemon=True).start()

    def stop(self):
        with self.__lock_process:
            self.__stop_db.value = True
        time.sleep(0.1)
        self.__load_checker = False
        self.__data_base_queue.close()
        self.__internal_status_log.close()
        self.__data_already_committed_to_database.close()
        self.__data_base_processor.join()

        return True

    def get_main_callback(self):
        return self.__data_base_queue

    def get_internal_status(self):
        return self.__internal_status_log

    def get_already_committed_data(self):
        return self.__data_already_committed_to_database

    def get_logs_saved_per_second(self):
        return {"saved_to_database": self.__logs_saved_to_database_per_second_for_return}

    def get_saved_client_information(self):
        return self.__saved_databases()

    def delete_client(self, client: str):
        return self.__delete_client(client)

    def is_client_busy(self, client: str):
        if len(client) == 0:
            raise Exception("invalid client name")
        client_found = False
        saved = self.__saved_databases()
        if saved == "no client":
            return False
        for _client in saved:
            if _client == client:
                client_found = True
                if saved[_client] == "no data":
                    return False
                for _date in saved[_client]:
                    if _date[2] == "busy":
                        return True
        if client_found is False:
            return False

        return False

    def get_supported_query(self, client, date):
        if len(client) == 0 or len(date) == 0:
            raise Exception("invalid client name or date")
        invalid_field = ['time_zone', 'original_log', 'log_sender_ip']
        client_date_exists = False
        saved = self.__saved_databases()
        if saved == "no client":
            Exception("no client exists in the system")
        for _client in saved:
            if _client == client:
                for _date in saved[_client]:
                    if date == _date[0]:
                        client_date_exists = True
                        if _date[2] == "busy":
                            raise Exception("client is busy with provided date")
                        break

        if not client_date_exists:
            raise Exception("either client or date doesnt exist")

        connection = sqlite3.connect(os.path.join(self.__root_path, client, date + '.db'))
        try:
            rows = connection.execute("PRAGMA table_info (LOG)").fetchall()
            column_names = [row[1] for row in rows]
            temp = [field for field in column_names if field not in invalid_field]
            _temp = {}
            for field in temp:
                if field[-3:] == "_ip":
                    _temp[field] = "ip"
                elif field[-5:] == "_port":
                    _temp[field] = "port"
                elif field == "time":
                    _temp[field] = "time"
                else:
                    _temp[field] = "text"
            return _temp
        except Exception:
            print("database query error")

        finally:
            connection.close()

    def __is_condition_valid(self, client: str, date: str, conditions: dict):
        if len(client) == 0 or len(date) == 0 or len(conditions.keys()) == 0:
            raise Exception("invalid client name or date or conditions")
        supported = self.get_supported_query(client, date)
        if len(conditions.keys()) > len(supported.keys()):
            raise Exception("extra invalid field(s)")

        # Validation
        for field in conditions:
            if not isinstance(conditions[field], str):
                raise Exception("field(s) must be str")
            if field not in supported.keys():
                raise Exception("invalid field(s)")
            if '%' in conditions[field]:
                raise Exception(f"query value {field} can not have %")
            if len(conditions[field]) == 0:
                raise Exception(f"if query condition is empty then '{field}' should not be present")
            if field == "time":
                datetime.datetime.strptime(conditions[field], '%H:%M:%S')

        # Validation

    def query_history(self, client: str, date: str, conditions: dict, limit: int, starting: int):
        limit = int(limit)
        starting = int(starting)

        if limit <= 0 or starting < 0:
            raise Exception("limit cannot be negative/zero or starting point cannot be negative")

        self.__is_condition_valid(client, date, conditions)

        _temp = []
        query_statement = "SELECT * FROM LOG WHERE "

        for condition, value in conditions.items():
            statement = f"`{condition}` LIKE ? AND "
            _temp.append(f'{value}%')
            query_statement += statement

        query_statement = query_statement[:-5] + " LIMIT ? OFFSET ?"
        _temp.append(limit)
        _temp.append(starting)
        with sqlite3.connect(database=os.path.join(self.__root_path, client, date + ".db")) as connection:
            cursor = connection.cursor()
            cursor.execute(query_statement, _temp)
            columns = [column[0] for column in cursor.description]
            results = cursor.fetchall()
            _temp = {
                "starting": starting,
                "limit": limit,
                "columns": columns,
                "values": results if len(results) > 0 else "no data",
            }
            return _temp

    def query_history_count(self, client: str, date: str, conditions: dict):
        self.__is_condition_valid(client, date, conditions)
        _temp = []
        query_statement = "SELECT COUNT(*) FROM LOG WHERE "
        for condition, value in conditions.items():
            statement = f"`{condition}` LIKE ? AND "
            _temp.append(f'{value}%')
            query_statement += statement

        query_statement = query_statement[:-5]
        with sqlite3.connect(database=os.path.join(self.__root_path, client, date + ".db")) as connection:
            cursor = connection.cursor()
            cursor.execute(query_statement, _temp)
            row_count = cursor.fetchone()[0]
            _temp = {
                "total": row_count,
            }
            return _temp

    def query_manual(self, client: str, date: str, conditions: dict | None = None):

        if conditions is not None:
            self.__is_condition_valid(client, date, conditions)
            _temp = []
            query_statement = "SELECT * FROM LOG WHERE "
            for condition, value in conditions.items():
                statement = f"`{condition}` LIKE ? AND "
                _temp.append(f'{value}%')
                query_statement += statement

            query_statement = query_statement[:-5]
            path = os.path.join(self.__root_path, client, date + ".db")
            values = {
                "sql": query_statement,
                "value": _temp,
                "path": os.path.abspath(path)
            }
        else:
            if len(client) == 0 or len(date) == 0:
                raise Exception("invalid client name or date")
            client_date_exists = False
            saved = self.__saved_databases()
            if saved == "no client":
                Exception("no client exists in the system")
            for _client in saved:
                if _client == client:
                    for _date in saved[_client]:
                        if date == _date[0]:
                            client_date_exists = True
                            if _date[2] == "busy":
                                raise Exception("client is busy with provided date")
                            break

            if not client_date_exists:
                raise Exception("either client or date doesnt exist")

            path = os.path.join(self.__root_path, client, date + ".db")
            values = {
                "path": os.path.abspath(path)
            }
        return values
