from __future__ import annotations

import json
import logging
import os.path
import shutil
import socket
import threading
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

from websocket_server import WebsocketServer

from .bridge import EngineDatabaseBridge
from .engine import RegularExpressionAndKey, ClientWithIP


class RequestHandler(BaseHTTPRequestHandler):
    def log_message(self, _, *__):
        pass

    def do_POST(self):
        request = self.receive_the_response_and_validate()
        if request is None:
            return
        try:
            # callback will be added later
            result = self.server.callback(request=request)
            self.send_the_response(result)
            return
        except Exception as e:
            result = f"error, details: [{str(e).lower()}]"
        self.send_the_response(result, "error")

    def receive_the_response_and_validate(self) -> None | dict:
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        try:
            data_as_dict = json.loads(post_data)
            return data_as_dict
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_message = {"status": "error", "response": f"JSON is invalid, details:[{str(e).lower()}]"}
            self.wfile.write(json.dumps(error_message).encode('utf-8'))
            return None

    def send_the_response(self, response: dict | str, status: str = "success"):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = json.dumps({"status": status, "response": response})
        self.wfile.write(response.encode('utf-8'))


class CustomHTTPServer(ThreadingHTTPServer):
    def __init__(self, server_address, req_handler, callback):
        super().__init__(server_address, req_handler)
        self.callback = callback


class LogServerWithHTTPInterface:
    def __init__(self, interface_configuration: dict, expressions: dict):
        self.__closed = False
        self.__stop_all = False
        self.__interface_config = interface_configuration
        self.__name: str | None = None
        self.__root_dir = None
        self.__class: str | None = None
        self.__given_database_config = None

        # Default Parser Loader
        self.__run_once_config_translator = True
        # Default Parser Loader

        # Configurable Options
        self.__engine_port = None
        self.__keep_original_log = None
        self.___engine_expressions: list | dict = expressions
        self.__database_root_dir = None
        self.__verbose_bride = False
        self.__verbose_engine = False
        self.__verbose_database = False
        self.__interface_port: int | None = None
        self.__saved_channel_port: int | None = None
        self.__internal_status_port: int | None = None
        self.__auto_delete_days: int | None = None
        self.__space_percentage_to_stop: int | None = None
        # Configurable Options

        self.__cached_clients_from_engine: list[ClientWithIP] = []

        self.__bridge_instance: EngineDatabaseBridge | None = None
        self.__configuration_translator()
        self.__thread_lock = threading.RLock()

        self.__start_logserver()

        self.__interface_server = CustomHTTPServer(("127.0.0.1", self.__interface_port), RequestHandler,
                                                   self.__handel_request)

        threading.Thread(target=self.__interface_server.serve_forever,
                         name=f"interface ({self.__class}:{self.__name}) http server instance").start()

        # For Notification Delivery System
        self.__websocket_server_status = WebsocketServer(host="127.0.0.1", port=self.__internal_status_port,
                                                         loglevel=logging.CRITICAL)
        self.__websocket_server_saved = WebsocketServer(host="127.0.0.1", port=self.__saved_channel_port,
                                                        loglevel=logging.CRITICAL)
        threading.Thread(target=self.__websocket_server_status.run_forever,
                         name=f"interface ({self.__class}:{self.__name}) websocket server for internal status",
                         daemon=True).start()
        threading.Thread(target=self.__websocket_server_saved.run_forever,
                         name=f"interface ({self.__class}:{self.__name}) websocket server for saved data",
                         daemon=True).start()
        threading.Thread(target=self.__broadcast_internal_status,
                         name=f"interface ({self.__class}:{self.__name}) broadcast internal status over websocket",
                         daemon=True).start()
        threading.Thread(target=self.__broadcast_saved_data,
                         name=f"interface ({self.__class}:{self.__name}) broadcast saved data over websocket",
                         daemon=True).start()  # For Notification Delivery System

    @staticmethod
    def is_port_available(port):
        tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            tcp_socket.bind(("127.0.0.1", port))
            udp_socket.bind(("127.0.0.1", port))
            return True
        except socket.error:
            return False

        finally:
            tcp_socket.close()
            udp_socket.close()

    @staticmethod
    def check_port_range(starting: int):
        for p in range(4):
            if not LogServerWithHTTPInterface.is_port_available(p + starting):
                return False
        return True

    def __configuration_translator(self):
        if self.__run_once_config_translator:
            self.__run_once_config_translator = False
            try:
                self.__class = self.__interface_config["class"].strip()
                self.__name = self.__interface_config["engine_name"].strip()
                self.__root_dir = self.__interface_config["saved_data_root_directory"]

                if not isinstance(self.__root_dir, str):
                    raise Exception
                self.__database_root_dir = os.path.join(self.__root_dir, self.__class, self.__name)
            except Exception as e:
                raise Exception(f"invalid database path or engine name or class, {e}")

            try:
                self.__engine_port = self.__interface_config["engine_port"]
                if not isinstance(self.__engine_port, int):
                    raise Exception
                for port in range(4):
                    if not self.is_port_available(port + self.__engine_port):
                        raise Exception(f"{port + self.__engine_port} is unavailable")
                self.__interface_port = self.__engine_port + 1
                self.__internal_status_port = self.__engine_port + 2
                self.__saved_channel_port = self.__engine_port + 3

            except Exception as e:
                raise Exception(f"invalid port of engine, {e}")

            try:
                self.___engine_expressions = (self.__expression_builder(self.___engine_expressions))
            except Exception:
                raise Exception("invalid engine regular expressions")

            try:
                self.__keep_original_log = self.__interface_config["keep_original_log"]
                if not isinstance(self.__keep_original_log, bool):
                    raise Exception
            except Exception:
                self.__keep_original_log = True

            try:
                self.__auto_delete_days = int(self.__interface_config["auto_delete_days"])
                if self.__auto_delete_days < 2:
                    raise Exception("auto_delete_days must be greater than or equal to 2")
            except Exception as e:
                raise Exception(f"invalid auto_delete_days, {e}")

            try:
                self.__space_percentage_to_stop = int(self.__interface_config["space_percentage_to_stop"])
                if not (1 < self.__space_percentage_to_stop < 100):
                    raise Exception("space_percentage_to_stop must be greater than 1 or less than 100")
            except Exception as e:
                raise Exception(f"invalid space_percentage_to_stop, {e}")

            self.__database_configs = {"log_saving_directory": self.__database_root_dir}

    def __start_logserver(self):
        with self.__thread_lock:
            try:
                if self.__bridge_instance is not None and not self.__bridge_instance.is_none():
                    return False
                name = f"{self.__class}:{self.__name}"
                self.__bridge_instance = EngineDatabaseBridge(name, self.__engine_port, self.___engine_expressions,
                                                              self.__database_configs, self.__keep_original_log,
                                                              self.__auto_delete_days, self.__space_percentage_to_stop,
                                                              self.__verbose_bride)
                self.__bridge_instance.start(self.__verbose_engine, self.__verbose_database)
                for client in self.__cached_clients_from_engine:
                    self.__bridge_instance.add_client(client.client, client.ip)
                return True
            except Exception as e:
                return f"{e}"

    def __stop_logserver(self):
        with self.__thread_lock:
            try:
                if self.__bridge_instance is None or self.__bridge_instance.is_none():
                    return False
                self.__cached_clients_from_engine.clear()
                self.__cached_clients_from_engine = self.__bridge_instance.get_allowed_clients_from_engine()
                return self.__bridge_instance.stop()
            except Exception as e:
                return f"{e}"

    def __restart_bridge(self):
        stop = self.__stop_logserver()
        start = self.__start_logserver()
        if isinstance(stop, bool) and isinstance(start, bool):
            return start
        else:
            return f"{start}, {stop}"

    @staticmethod
    def __expression_builder(expressions: dict):
        temp = []
        for expression in expressions:
            temp.append(RegularExpressionAndKey(expression, expressions[expression]))
            if not isinstance(expression, str):
                raise Exception
            if not isinstance(expressions[expression], str):
                raise Exception
        return temp

    @staticmethod
    def __string_bool_to_value(value):
        try:
            if isinstance(value, bool):
                return value
            value = value.lower().strip()
            if value == "true":
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def docs():
        demo = {"add_client": {"client": "str", "ip": "str"},
                "remove_client": {"client": "str,it will delete all related data", },
                "edit_client_ip": {"client": "str, existing client name", "ip": "str, new ip"},
                "all_clients": "just need the key value, all registered client will be returned",
                "get_stats/second": "just need the key value, gives the engine load per second",
                "set_configs": {"keep_original_log": "bool"},
                "get_configs": "just need the key value, all configs of the running engine will be returned",
                "verbose_bridge": "bool, put bridge in verbose", "verbose_engine": "bool, put engine in verbose",
                "verbose_database": "bool, put database in verbose",
                "stop": "just need the key value, stop the bridge but can be restarted using start/restart",
                "restart": "just need the key value, restart a stopped engine",
                "_running_": "just need the key value, it provide all running threads/process",
                "supported_query": {"client": "str, will return all supported query for the saved logs",
                                    "date": "str, will return all supported query for the saved logs"},
                "history": "just need the key value, history will be return date wise along with GB",
                "query": {"client": "str", "date": "str", "starting": "str", "limit": "str",
                          "condition": "dict, dict key ust match with supported query of that client and date"},
                "query_manual": {"client": "str", "date": "str",
                                 "condition": "dict, dict key ust match with supported query of that client and date, "
                                              "or ignore the"
                                              "key for full db path"},
                "query_count": {"client": "str", "date": "str", "condition": "dict, dict key "
                                                                             "ust match with "
                                                                             "supported query "
                                                                             "of that client "
                                                                             "and date"},
                "start": "just need the key value, start the engine",
                "stop_all": "just need the key value, stops everything",
                "get_supported_configs": "just need the key value, configurable options of the engine", }
        return demo

    def __verbose_mode(self, verbose_bridge: bool = False, verbose_engine: bool = False,
                       verbose_database: bool = False):
        self.__verbose_database = False
        self.__verbose_engine = False
        self.__verbose_bride = False
        with self.__thread_lock:
            self.__verbose_database = verbose_database
            self.__verbose_engine = verbose_engine
            self.__verbose_bride = verbose_bridge
        return self.__restart_bridge()

    def __handel_request(self, request: dict) -> dict | str | bool:
        allowed_request = self.docs().keys()
        if len(request.keys()) == 0:
            raise Exception(f"no command found, supported requests are {allowed_request}")
        if len(request.keys()) > 1:
            raise Exception(f"multiple command found, only one at a time")
        command, = request.keys()

        if command not in self.docs():
            return self.docs()

        if command == "add_client":
            client = request[command]["client"]
            ip = request[command]["ip"]
            return self.add_client(client, ip)
        if command == "edit_client_ip":
            client = request[command]["client"]
            ip = request[command]["ip"]
            return self.edit_client_ip(client, ip)
        elif command == "remove_client":
            client_name = str(request[command])
            return self.remove_client(client_name)
        elif command == "all_clients":
            return self.all_clients()
        elif command == "get_stats/second":
            return self.__bridge_instance.get_performance_status()
        elif command == "set_configs":
            return self.__set_configuration(request["set_configs"])
        elif command == "get_configs":
            return self.get_all_configs()
        elif "verbose_" in command:
            verbose_e = False
            verbose_b = False
            verbose_d = False
            if "verbose_database" == command:
                verbose_d = self.__string_bool_to_value(request[command])
            elif "verbose_engine" == command:
                verbose_e = self.__string_bool_to_value(request[command])
            else:
                verbose_b = self.__string_bool_to_value(request[command])
            return self.__verbose_mode(verbose_b, verbose_e, verbose_d)
        elif command == "stop":
            temp = self.__stop_logserver()
            if not isinstance(temp, bool):
                raise Exception(f"error, {temp}")
            return temp
        elif command == "restart":
            temp = self.__restart_bridge()
            if not isinstance(temp, bool):
                raise Exception(f"error, {temp}")
            return temp
        elif command == "start":
            temp = self.__start_logserver()
            if not isinstance(temp, bool):
                raise Exception(f"error, {temp}")
            return temp
        elif command == "_running_":
            return EngineDatabaseBridge.all_thread_or_pprocess(False)
        elif command == "history":
            return self.__bridge_instance.get_saved_history()
        elif command == "supported_query":
            client = request[command]["client"]
            date = request[command]["date"]
            return self.__bridge_instance.get_supported_queries(client, date)
        elif command == "query":
            client = request[command]["client"]
            date = request[command]["date"]
            conditions = request[command]["conditions"]
            limit = request[command]["limit"]
            starting = request[command]["starting"]
            return self.__bridge_instance.query(client, date, conditions, limit, starting)
        elif command == "query_count":
            client = request[command]["client"]
            date = request[command]["date"]
            conditions = request[command]["conditions"]
            return self.__bridge_instance.query_count(client, date, conditions)
        elif command == "query_manual":
            client = request[command]["client"]
            date = request[command]["date"]
            try:
                conditions = request[command]["conditions"]
            except Exception:
                conditions = None
            return self.__bridge_instance.query_manual(client, date, conditions)
        elif command == "get_supported_configs":
            return LogServerWithHTTPInterface.get_supported_configuration()
        elif command == "stop_all":
            self.stop_all()

    def __broadcast_internal_status(self):
        all_data_internal = []
        any_update = False
        while True:
            if len(all_data_internal) > 30:
                all_data_internal = []

            if self.__stop_all:
                self.__websocket_server_status.shutdown()
                return
            else:
                time.sleep(0.001)
            if self.__bridge_instance and not self.__bridge_instance.is_none():
                if self.__bridge_instance.if_internal_status_changed():
                    all_data_internal.extend(self.__bridge_instance.get_internal_status())
                    any_update = True
            else:
                all_data_internal.clear()

            if len(all_data_internal) > 0:
                if len(self.__websocket_server_status.clients) == 0:
                    continue
                if not any_update:
                    continue
                for data in all_data_internal:
                    try:
                        self.__websocket_server_status.send_message_to_all(
                            json.dumps(data).encode("utf-8", errors='strict'))
                    except Exception:
                        pass
                    time.sleep(0.001)
                all_data_internal = []
                any_update = False

    def __broadcast_saved_data(self):
        all_data_saved = []
        any_update = False
        while True:
            if len(all_data_saved) > 30:
                all_data_saved = []
            if self.__stop_all:
                self.__websocket_server_saved.shutdown()
                return
            else:
                time.sleep(0.001)
            if self.__bridge_instance and not self.__bridge_instance.is_none():
                if self.__bridge_instance.if_data_saved():
                    all_data_saved.extend(self.__bridge_instance.get_saved_data())
                    any_update = True
            else:
                all_data_saved.clear()

            if len(all_data_saved) > 0:
                if len(self.__websocket_server_saved.clients) == 0:
                    continue
                if not any_update:
                    continue
                for data in all_data_saved:
                    try:
                        self.__websocket_server_saved.send_message_to_all(
                            json.dumps(data).encode("utf-8", errors="strict"))
                    except Exception:
                        pass
                    time.sleep(0.001)
                all_data_saved = []
                any_update = False

    @staticmethod
    def get_supported_configuration():
        return {"keep_original_log": "bool", "auto_delete_days": "int"}

    def __set_configuration(self, config: dict):
        with self.__thread_lock:
            if not isinstance(config, dict):
                raise Exception("configuration must be dict type")
            self.__keep_original_log = LogServerWithHTTPInterface.__string_bool_to_value(config['keep_original_log'])
            self.__auto_delete_days = config['auto_delete_days']
            return self.__restart_bridge()

    @staticmethod
    def only_lower(string):
        if not all(c.islower() or c.isdigit() or c == '_' for c in string):
            raise Exception("only lowercase letters, digits, and '_' are allowed.")

    @staticmethod
    def is_valid_ip(client, ip):
        try:
            temp = ClientWithIP(client, ip)
            return temp.is_valid_client()
        except ValueError:
            return False

    def add_client(self, client, ip):
        client = client.strip()
        ip = ip.strip()
        if not 4 <= len(client) < 30:
            raise Exception("incorrect name length, should be between 4 to 30")
        if not self.is_valid_ip(client, ip):
            raise Exception("invalid ip")
        if self.__bridge_instance is None or self.__bridge_instance.is_none():
            raise Exception("engine is not running")
        with self.__thread_lock:
            self.__cached_clients_from_engine = self.__bridge_instance.get_allowed_clients_from_engine()
        temp = ClientWithIP(client, ip)
        for _client in self.__cached_clients_from_engine:
            if _client.client == temp.client:
                raise Exception("client name already exists")
            if _client.ip == temp.ip:
                raise Exception("ip already exists")
        with self.__thread_lock:
            result = self.__bridge_instance.add_client(client, ip)
        if not result:
            raise Exception("failed to add client for unknown reason")
        with self.__thread_lock:
            self.__cached_clients_from_engine = self.__bridge_instance.get_allowed_clients_from_engine()
        return result

    def remove_client(self, client):
        client = client.strip()
        if not 4 <= len(client) < 30:
            raise Exception("incorrect name length, should be between 4 to 30")

        if self.__bridge_instance is None or self.__bridge_instance.is_none():
            raise Exception("engine is not running")
        with self.__thread_lock:
            self.__cached_clients_from_engine = self.__bridge_instance.get_allowed_clients_from_engine()
        found = False
        for _client in self.__cached_clients_from_engine:
            if _client.client == client:
                found = True
                break
        if not found:
            raise Exception("client does not exist")

        result = self.__bridge_instance.remove_client(client)
        if not result:
            raise Exception("failed to remove client for unknown reason")
        with self.__thread_lock:
            self.__cached_clients_from_engine = self.__bridge_instance.get_allowed_clients_from_engine()
        return result

    def edit_client_ip(self, client, ip):
        client = client.strip()
        ip = ip.strip()
        self.only_lower(client)
        if not 4 <= len(client) < 30:
            raise Exception("incorrect name length, should be between 4 to 30")
        if not self.is_valid_ip(client, ip):
            raise Exception("invalid ip")
        if self.__bridge_instance is None or self.__bridge_instance.is_none():
            raise Exception("engine is not running")
        with self.__thread_lock:
            self.__cached_clients_from_engine = self.__bridge_instance.get_allowed_clients_from_engine()
        client_found = False
        temp = ClientWithIP(client, ip)
        for _client in self.__cached_clients_from_engine:
            if _client.client == client:
                client_found = True
            if _client.ip == temp.ip:
                raise Exception("ip already exists")

        if not client_found:
            raise Exception("client does not exist")

        with self.__thread_lock:
            result = self.__bridge_instance.change_client_ip(client, ip)
        if not result:
            raise Exception("failed to edit client for unknown reason")
        with self.__thread_lock:
            self.__cached_clients_from_engine = self.__bridge_instance.get_allowed_clients_from_engine()
        return result

    def all_clients(self):
        def get_directory_size(directory):
            total_size = 0
            with os.scandir(directory) as entries:
                for entry in entries:
                    if entry.is_file():
                        total_size += entry.stat().st_size
                    elif entry.is_dir():
                        total_size += get_directory_size(entry.path)
            return total_size

        if self.__bridge_instance is None or self.__bridge_instance.is_none():
            raise Exception("engine is not running")
        _temp = {}
        for client in self.__cached_clients_from_engine:
            size = 0
            try:
                path = os.path.join(self.__root_dir, self.__class, self.__name, client.client)
                size = float(f"{get_directory_size(path) / (1024 ** 3):.2f}")
            except Exception:
                pass
            _temp[client.client] = [client.ip, size]
        return _temp

    def get_all_configs(self):
        temp = {"configs": {"class": self.__class, "engine_name": self.__name, "engine_port": self.__engine_port,
                            "keep_original_log": self.__keep_original_log,
                            "buffer_size": self.__bridge_instance.get_engine_buffer(),
                            "auto_delete_days": self.__auto_delete_days}, "clients": self.all_clients(),
                "others": {"interface_port": self.__interface_port,
                           "internal_status_websocket_port": self.__internal_status_port,
                           "saved_data_websocket_port": self.__saved_channel_port, }}
        return temp

    def stop_all(self):
        with self.__thread_lock:
            self.__stop_all = True
        time.sleep(1)
        self.__bridge_instance.stop()
        self.__interface_server.shutdown()
        self.__closed = True

    def is_cosed(self):
        return self.__closed

    def get_name(self):
        return self.__name

    def delete_self(self):
        self.stop_all()
        shutil.rmtree(os.path.join(self.__root_dir, self.__class, self.__name), ignore_errors=True)
