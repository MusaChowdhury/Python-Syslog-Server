import json
import os
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable

from interfaces.database import DataBaseController
from interfaces.models import Base, Engine, Client
from syslogger.bridge import EngineDatabaseBridge
from syslogger.interface import LogServerWithHTTPInterface


class RequestHandlerInterfaceFactory(BaseHTTPRequestHandler):
    INTERFACE_CALLBACK: Callable

    def log_message(self, _, *__):
        pass

    def do_POST(self):
        request = self.receive_the_response_and_validate()
        if request is None:
            return
        try:
            result = RequestHandlerInterfaceFactory.INTERFACE_CALLBACK(request=request)
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


class InterfaceFactory:
    def __init__(self, auto_delete_days: int, space_percentage_to_stop: int, server_port, root_path: str,
                 engine_classes: dict):
        self.__auto_delete = auto_delete_days
        self.__space_percentage_to_stop = space_percentage_to_stop
        self.__port = server_port
        self.__root_path = root_path
        self.__classes = engine_classes
        self.__database_path = None
        if not LogServerWithHTTPInterface.is_port_available(server_port):
            raise Exception(f"port {self.__port} is unavailable")
        try:
            if not isinstance(self.__root_path, str):
                raise Exception
            if os.path.exists(os.path.join(self.__root_path, "factory.db")):
                pass
            else:
                os.makedirs(os.path.join(self.__root_path), exist_ok=True)
                with open(os.path.join(self.__root_path, "factory.db"), 'w') as _:
                    pass
            self.__database_path = os.path.join(self.__root_path, "factory.db")
        except Exception:
            raise Exception(f"invalid path {root_path}")

        if not isinstance(self.__classes, dict):
            raise Exception("engine classes must be type of dict")

        self.__running_engines = {}

        for _class in self.__classes:
            self.only_lower(_class)
            self.__running_engines[_class] = []

        self.__db_controller = DataBaseController(self.__database_path, Base)

        RequestHandlerInterfaceFactory.INTERFACE_CALLBACK = self.__handel_request
        self.__interface_server = ThreadingHTTPServer(("127.0.0.1", self.__port),
                                                      RequestHandlerInterfaceFactory)
        self.__factory_server_thread = threading.Thread(name="factory http server",
                                                        target=self.__interface_server.serve_forever)
        self.__factory_server_thread.start()

        self.load_settings()
        self.__thread_lock = threading.RLock()

    @staticmethod
    def __string_bool_to_value(value: str):
        try:
            value = value.strip().lower()
            if value == "true":
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def only_lower(string):
        if not all(c.islower() or c.isdigit() or c == '_' for c in string):
            raise ValueError(
                "only lowercase letters, digits, and '_' are allowed.")

    def __create_engine_configs_parser(self, configs: dict):
        if isinstance(configs["keep_original_log"], bool):
            keep_log = configs["keep_original_log"]
        else:
            keep_log = self.__string_bool_to_value(configs["keep_original_log"])

        engine_class = configs["class"]
        class_expressions = self.__classes[engine_class]
        engine_name = configs["engine_name"]
        engine_port = int(configs["engine_port"])
        original_log = keep_log
        self.only_lower(engine_class)
        self.only_lower(engine_name)
        auto_delete_scoped = None
        try:
            auto_delete_scoped = configs["auto_delete_days"]
        except:
            pass
        engine_configs = {
            "configs": {
                "class": engine_class,
                "engine_name": engine_name,
                "engine_port": engine_port,
                "keep_original_log": original_log,
                "saved_data_root_directory": self.__root_path,
                "auto_delete_days": auto_delete_scoped if auto_delete_scoped else self.__auto_delete,
                "space_percentage_to_stop": self.__space_percentage_to_stop
            },
            "expressions": class_expressions,

        }
        return engine_configs

    def create_engine(self, configs: dict, return_instance=False):

        process_config = self.__create_engine_configs_parser(configs)
        _class = process_config["configs"]["class"]
        name = process_config["configs"]["engine_name"]
        if not 4 <= len(name) < 30:
            raise Exception("incorrect name length, should be between 4 to 30")
        running = self.get_engine_interfaces()
        for engine in running[_class]:
            if engine["configs"]["engine_name"] == name:
                raise Exception("same name already exists")
        temp = LogServerWithHTTPInterface(process_config["configs"], process_config["expressions"])
        self.__running_engines[_class].append(temp)
        return temp if return_instance else True

    def get_engine_interfaces(self):
        classes = {}
        for _class in self.__running_engines:
            _interfaces = []
            for engine in self.__running_engines[_class]:
                if not engine.is_cosed():
                    try:
                        _interfaces.append(engine.get_all_configs())
                    except Exception:
                        traceback.print_exc()
                        pass
            classes[_class] = _interfaces
        return classes

    @staticmethod
    def get_running_processes():
        return EngineDatabaseBridge.all_thread_or_pprocess(False)

    @staticmethod
    def docs():
        return {
            "create_engine": {
                "class": "str, engine class",
                "engine_name": "str, engine name",
                "engine_port": "int, engine port",
                "keep_original_log": "bool, wherever to keep original log or not"
            },
            "running_engines": "only key value, will return all running engines with instance",
            "running_processes": "only key value, will return all threads/processes",
            "dump_settings": "only key value, will save all engines configs to database, which will use later to "
                             "restart",
            "load_settings": "only key value, will load all saved engines to system",
            "delete_engine": {"name": "str, will delete the engine from system, but not from db, for saving the "
                                      "changes call 'dump_settings'"}

        }

    def __handel_request(self, request: dict) -> dict | str | bool:
        if len(request.keys()) == 0:
            raise Exception(f"no command found")
        if len(request.keys()) > 1:
            raise Exception(f"multiple command found, only one at a time")
        command, = request.keys()

        if command not in self.docs():
            return self.docs()

        if command == "create_engine":
            return self.create_engine(request[command])
        elif command == "running_engines":
            return self.get_engine_interfaces()
        elif command == "running_processes":
            return self.get_running_processes()
        elif command == "dump_settings":
            self.dump_settings()
        elif command == "load_settings":
            self.load_settings()
        elif command == "delete_engine":
            self.delete_engine(request[command])

    def dump_settings(self):
        with self.__thread_lock:
            running_engines = self.get_engine_interfaces()
            self.__db_controller.dump_settings(running_engines)

    def load_settings(self):
        setting = self.__db_controller.fetch_settings()
        for engine in setting:
            _engine = self.create_engine(engine["configs"], True)
            for client in engine["clients"]:
                _engine.add_client(client, engine["clients"][client][0])

    def delete_engine(self, info: dict):
        name = info["name"].strip()
        if not 4 <= len(name) < 30:
            raise Exception("incorrect name length, should be between 4 to 30")
        found = False
        __class = None
        target_engine: LogServerWithHTTPInterface | None = None
        for _class in self.__running_engines:
            for engine in self.__running_engines[_class]:
                if engine.get_name() == name:
                    found = True
                    target_engine = engine
                    __class = _class
                    break

        if found:
            self.__running_engines[__class].remove(target_engine)
            target_engine.delete_self()
            self.__db_controller.delete(name)
        else:
            raise Exception("engine not found")
