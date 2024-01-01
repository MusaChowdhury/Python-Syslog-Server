import copy
import ipaddress
import multiprocessing
import re
import socket
import threading
import time
import traceback
from datetime import datetime
from enum import Enum
from typing import Union

from faster_fifo import Queue
from tzlocal import get_localzone


class DateTimeFormat:
    def __init__(self):
        self.timezone = None
        self.date_time_object = None

    def pase_from_date_time_from_builtin(self, time_zone: str):
        self.date_time_object = datetime.now()
        self.timezone = time_zone

    def get_date_as_str(self):
        return str(self.date_time_object.strftime("%Y-%m-%d"))[:10]

    def get_date_with_month_name(self):
        return str(self.date_time_object.strftime("%d %B %Y"))

    def __str__(self):
        return f'{self.date_time_object.strftime("%Y-%m-%d")},{self.timezone}'

    def __repr__(self):
        return f'{self.date_time_object.strftime("%Y-%m-%d")},{self.timezone}'


class RegularExpressionAndKey:
    def __init__(self, filed_name: str, regular_expression: str):
        self.field_name = filed_name.lower().strip()
        self.compiled_expression = re.compile(regular_expression)

    def __repr__(self):
        return f"(field name: {self.field_name}, compiled regular expression: {self.compiled_expression}"


class ClientWithIP:
    def __init__(self, client: str | None, ip: str):
        self.client = client.strip() if client is not None else None
        self.ip = ip.strip()
        self.formed_database_name_from_client = f"{self.client}"

    def is_valid_client(self):
        valid_ip = True
        try:
            ipaddress.ip_address(self.ip)
        except ValueError:
            valid_ip = False
            pass
        if (self.client is not None and len(self.client) > 0) and valid_ip:
            return True
        else:
            return False

    def __str__(self):
        return f"name: {self.client}, ip: {self.ip}"

    def __repr__(self):
        return f"name: {self.client}, ip: {self.ip}"


class LogInstanceWithRelatedInformation:
    def __init__(self, client: Union[ClientWithIP, None], date_time: DateTimeFormat | None,
                 raw_data, values: dict | None):
        self.client = client
        self.unprocessed = raw_data
        self.values = values
        self.date_time = date_time

    def __str__(self):
        return (f" ( time: {self.date_time}), (client: {self.client}), (values: {self.values}),"
                f" raw log: {self.unprocessed}")


class InternalLog:
    class Type(Enum):
        Error = "Error"
        Warning = "Warning"
        Info = "Info"

    def __init__(self, log_type: Type, msg: str, origin: str):
        self.origin = origin
        self.msg = msg
        self.type = log_type

    def __str__(self):
        return f"(origin: {self.origin}, type: {self.type.value} [{self.msg}])"

    def __repr__(self):
        return f"(origin: {self.origin}, type: {self.type.value} [{self.msg}])"

    def as_dict(self):
        return {"origin": self.origin, "type": self.type.value, "message": self.msg}


class Engine:

    def __init__(self, name: str, binding_port: int, regular_expressions: list[RegularExpressionAndKey],
                 keep_raw_log: bool, database_queue: Queue = None, verbose: bool = False):

        if not isinstance(keep_raw_log, bool):
            raise Exception("'keep_original_log' must be bool")
        self.__name = name.strip()
        if not isinstance(self.__name, str):
            raise Exception("name must be str")
        self.__load_checker = True
        self.__verbose = verbose
        if self.__verbose:
            print(f"Engine ({self.__name}) Verbose Mode is ON")

        self.__known_incoming_per_second: multiprocessing.Value = multiprocessing.Value("i", 0)
        self.__unknown_incoming_per_second: multiprocessing.Value = multiprocessing.Value("i", 0)
        self.__all_incoming_per_second: multiprocessing.Value = multiprocessing.Value("i", 0)
        self.__incoming_per_second = {}

        self.__internal_status_log = multiprocessing.Queue()

        self.__system_timezone = str(get_localzone())
        self.__server_socket_connection: socket.socket | None = None
        self.__binding_port = binding_port
        self.__buffer_size = self.get_max_udp_buffer_size()
        self.__output_formats = []
        self.__keep_raw_log = keep_raw_log

        self.__database_queue: Queue = database_queue

        self.__stop_engine = multiprocessing.Value("b", False)

        self.__new_client_added_or_removed = multiprocessing.Value("i", 0)
        self.__pause_engine = multiprocessing.Value("b", False)
        self.__process_queue = Queue(30000000)
        self.__callback_queue = Queue(30000000)
        self.__internal_queue_for_clients = multiprocessing.Queue()

        self.__callback_process_1 = multiprocessing.Process(
            target=self.__callback_processor, name=f"engine ({self.__name}) callback_for_db process/callback 1")
        self.__callback_process_2 = multiprocessing.Process(
            target=self.__callback_processor, name=f"engine ({self.__name}) callback_for_db process/callback 2")
        self.__callback_process_3 = multiprocessing.Process(
            target=self.__callback_processor, name=f"engine ({self.__name}) callback_for_db process/callback 3")
        self.__callback_process_4 = multiprocessing.Process(
            target=self.__callback_processor, name=f"engine ({self.__name}) callback_for_db process/callback 4")
        self.__data_parser_manager_process_1 = multiprocessing.Process(
            target=self.__data_manger_processor, name=f"engine ({self.__name}) data manager process 1")
        self.__data_parser_manager_process_2 = multiprocessing.Process(
            target=self.__data_manger_processor, name=f"engine data ({self.__name}) manager process 2")
        self.__listener_process = multiprocessing.Process(
            target=self.__listener_processor, name=f"engine ({self.__name}) listener process")
        self.__process_lock = multiprocessing.RLock()

        # check reserved_keywords
        invalid_column = ["log_sender_ip", "time", "time_zone", "original_log", "date"]
        for configuration in regular_expressions:
            configuration.field_name = configuration.field_name.strip().lower()
            if configuration.field_name in invalid_column:
                continue
            else:
                self.__output_formats.append(configuration)
        # check reserved_keywords

    @staticmethod
    def get_max_udp_buffer_size():
        return socket.socket(socket.AF_INET, socket.SOCK_DGRAM).getsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF)

    def get_regular_expressions(self):
        return copy.deepcopy(self.__output_formats)

    def get_time_zone(self):
        return self.__system_timezone

    def get_buffer_size(self):
        return self.__buffer_size

    def __add_internal_status_to_queue(self, status_type: InternalLog.Type, msg: str, origin: str = f"Engine"):
        # Must Consume For Future Log Otherwise The Log Will Be Discarded
        size = self.__internal_status_log.qsize()
        try:
            if size < 20:
                self.__internal_status_log.put_nowait(InternalLog(status_type, msg, origin + f" ({self.__name})"))
        except Exception:
            pass
        # Must Consume For Future Log Otherwise The Log Will Be Discarded

    def get_all_clients(self) -> list[ClientWithIP]:
        clients_as_list = []
        self.__process_lock.acquire()
        while self.__internal_queue_for_clients.qsize() != 0:
            clients_as_list.append(self.__internal_queue_for_clients.get())
        for client in clients_as_list:
            self.__internal_queue_for_clients.put(client)
        self.__process_lock.release()
        return clients_as_list

    def add_client(self, client: ClientWithIP):
        allowed_clients = self.get_all_clients()
        client_already_exist = False
        if client.is_valid_client():
            for _client in allowed_clients:
                if _client.client == client.client or _client.ip == client.ip:
                    client_already_exist = True
            if client_already_exist:
                return False
            allowed_clients.append(client)
            self.__process_lock.acquire()
            while self.__internal_queue_for_clients.qsize() != 0:
                _ = self.__internal_queue_for_clients.get()
            for _client in allowed_clients:
                self.__internal_queue_for_clients.put(_client)
            self.__new_client_added_or_removed.value += 40
            self.__process_lock.release()
            return True
        else:
            return False

    def remove_client(self, name: str):
        client_found = False
        name = name.strip()
        allowed_clients = self.get_all_clients()
        filtered_clients = []
        for client in allowed_clients:
            if client.client == name:
                client_found = True
            else:
                filtered_clients.append(client)
        self.__process_lock.acquire()
        while self.__internal_queue_for_clients.qsize() != 0:
            _ = self.__internal_queue_for_clients.get()
        for client in filtered_clients:
            self.__internal_queue_for_clients.put(client)
        if client_found:
            self.__new_client_added_or_removed.value += 40
        self.__process_lock.release()
        return client_found

    @staticmethod
    def __regular_expression_executor(package):
        target = package['target']
        expression = package['expression']
        _key = package['key']

        _temporary_value = ""
        try:
            _temporary_value = re.search(expression, target)
            _temporary_value = _temporary_value.group(1)
        except Exception:
            _temporary_value = "_"
        return {_key: _temporary_value}

    def __data_parser(self, semi_processed_log: LogInstanceWithRelatedInformation, related_client: ClientWithIP):
        raw_data = semi_processed_log.unprocessed
        if not raw_data:
            return
        processed_data_as_dictionary = {}

        for key in self.__output_formats:
            processed_data_as_dictionary.update(Engine.__regular_expression_executor(
                {'target': raw_data, 'expression': key.compiled_expression, 'key': key.field_name}))

        return LogInstanceWithRelatedInformation(related_client, semi_processed_log.date_time,
                                                 semi_processed_log.unprocessed,
                                                 processed_data_as_dictionary, )

    def __cache_allowed_client(self, old_cached):
        cached = []
        added_or_removed = self.__new_client_added_or_removed.value
        if added_or_removed > 0:
            self.__new_client_added_or_removed.value = added_or_removed - 1
            _clients = self.get_all_clients()
            if len(_clients) > 0:
                for client in _clients:
                    cached.append(client)
            return cached
        if added_or_removed < 0:
            self.__new_client_added_or_removed.value = 0
        return old_cached

    def __listener_processor(self):
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as _connection:
            _connection.bind(('0.0.0.0', self.__binding_port))
            cached = []
            previous_time = 0
            while True:
                if self.__pause_engine.value:
                    time.sleep(0.2)
                    continue
                try:
                    current_time = time.time()
                    raw_data, info = _connection.recvfrom(self.__buffer_size)

                    if self.__stop_engine.value:
                        return
                    cached.append(LogInstanceWithRelatedInformation(ClientWithIP(None, info[0]), None,
                                                                    raw_data, None, ))
                    if current_time - previous_time > 0.0001:
                        previous_time = current_time
                        try:
                            self.__process_queue.put_many(cached)
                            self.__all_incoming_per_second.value += len(cached)
                        except Exception:
                            pass
                        finally:
                            cached = []
                except Exception:
                    if self.__verbose:
                        traceback.print_exc()
                if self.__verbose:
                    print(f"Engine({self.__name}) : Process Pending: {self.__process_queue.qsize()},"
                          f" Callback Pending: {self.__callback_queue.qsize()},"
                          f" Internal Status: {self.__internal_status_log.qsize()},")

    def __data_manger_processor(self):
        allowed_clients = []
        while True:
            if self.__stop_engine.value:
                return
            allowed_clients = self.__cache_allowed_client(allowed_clients)
            try:
                try:
                    bunch = self.__process_queue.get_many(max_messages_to_get=27000)
                except Exception:
                    continue
                status = 0
                for log in bunch:
                    log.unprocessed = log.unprocessed.decode("utf-8")
                    date_with_time_format = DateTimeFormat()
                    date_with_time_format.pase_from_date_time_from_builtin(self.__system_timezone)
                    log.date_time = date_with_time_format
                    client_found = False
                    for client in allowed_clients:
                        if client.ip == log.client.ip:
                            try:
                                self.__callback_queue.put({"client": client, "log": log})
                            except Exception:
                                pass
                            else:
                                client_found = True
                                break
                    if not client_found:
                        self.__unknown_incoming_per_second.value += 1
                        status += 1
                        if status < 5:
                            self.__add_internal_status_to_queue(
                                InternalLog.Type.Warning,
                                f"unknown log client tried to send data, details [{log.client} (rejected)]"
                            )
            except Exception as e:
                self.__add_internal_status_to_queue(
                    InternalLog.Type.Error,
                    f"critical engine error, details: {e}")

    def __callback_processor(self):
        cached = []
        while True:
            if self.__stop_engine.value:
                return
            try:
                try:
                    bunch = self.__callback_queue.get_many(max_messages_to_get=9000)
                except Exception:
                    continue
                for log in bunch:
                    if self.__verbose:
                        print(f"Verbose Engine ({self.__name}):  [Processed Data: {log}]")
                    if self.__database_queue is not None:
                        try:
                            processed = self.__data_parser(log["log"], log["client"])
                            converter_as_database = Engine.__data_base_type_converter(processed, self.__keep_raw_log)
                            cached.append(converter_as_database)
                        except Exception as e:
                            traceback.print_exc()
                            self.__add_internal_status_to_queue(
                                InternalLog.Type.Error,
                                f"probably due to huge load on server, "
                                f"details: {e} (rejected) ({log.unprocessed})")
                self.__database_queue.put_many(cached)
                self.__known_incoming_per_second.value += len(bunch)
                cached = []
            except Exception:
                if self.__verbose:
                    traceback.print_exc()

    @staticmethod
    def __ip4_port_separator(ip_port: str, sep=":"):
        try:
            ip, port = ip_port.split(sep)
            ipaddress.IPv4Address(ip)
        except ipaddress.AddressValueError:
            return None
        return ip, port

    @staticmethod
    def __data_base_type_converter(processed_log: LogInstanceWithRelatedInformation, keep_raw: bool):
        sender = processed_log.client.formed_database_name_from_client
        date = processed_log.date_time.get_date_with_month_name()
        data_for_database = {
            "log_sender_ip": processed_log.client.ip,
            "time": processed_log.date_time.date_time_object.time().strftime('%H:%M:%S'),
            "time_zone": processed_log.date_time.timezone,
        }
        for key in processed_log.values:
            key_value = processed_log.values[key]
            if len(key) > 3 and key[-3:] == "_ip":
                try:
                    bundled_ip_port = Engine.__ip4_port_separator(key_value)
                    if bundled_ip_port is None:
                        raise Exception
                    ip_with_port = {key: bundled_ip_port[0], key[:-3] + "_port": bundled_ip_port[1]}
                except Exception:
                    ip_with_port = {key: "?", str(key)[:-3] + "_port": "?"}

                data_for_database.update(ip_with_port)

            else:
                data_for_database.update({key: key_value if key_value != "_" else "?"})

        data_for_database["original_log"] = processed_log.unprocessed if keep_raw else None
        return {"client_name": sender, "date": date, "value": data_for_database}

    def start(self):
        self.__callback_process_1.start()
        self.__callback_process_2.start()
        self.__callback_process_3.start()
        self.__callback_process_4.start()
        self.__data_parser_manager_process_1.start()
        self.__data_parser_manager_process_2.start()
        self.__listener_process.start()
        threading.Thread(target=self.__calculate_incoming_logs, daemon=True,
                         name=f"engine ({self.__name}) load checker").start()

    def stop(self):
        with self.__process_lock:
            self.__stop_engine.value = True
        self.__load_checker = False
        try:
            only_for_exit = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            while True:
                only_for_exit.sendto(("_".encode("utf-8")), ("0.0.0.0", self.__binding_port))
                time.sleep(0.00001)
                if not self.__listener_process.is_alive():
                    break
        except Exception as e:
            self.__add_internal_status_to_queue(
                InternalLog.Type.Error, f"while closing down engine, details: {e}")
            return False
        try:
            self.__callback_process_1.terminate()
            self.__callback_process_2.terminate()
            self.__callback_process_3.terminate()
            self.__callback_process_4.terminate()
            self.__data_parser_manager_process_1.terminate()
            self.__data_parser_manager_process_2.terminate()
            self.__listener_process.terminate()
            self.__internal_queue_for_clients.close()
            self.__process_queue.close()
            self.__internal_status_log.close()
            self.__callback_queue.close()
            self.__listener_process.join()
        except Exception:
            traceback.print_exc()
            return False
        else:
            return True

    def get_internal_status(self):
        return self.__internal_status_log

    def __calculate_incoming_logs(self):
        while self.__load_checker:
            unknown_incoming = self.__unknown_incoming_per_second.value
            allowed_incoming = self.__known_incoming_per_second.value
            _all = self.__all_incoming_per_second.value
            self.__unknown_incoming_per_second.value = 0
            self.__known_incoming_per_second.value = 0
            self.__all_incoming_per_second.value = 0
            self.__incoming_per_second["all"] = _all
            self.__incoming_per_second["unknown_client"] = unknown_incoming
            self.__incoming_per_second["known_client"] = allowed_incoming
            time.sleep(1)

    def get_incoming_log_per_second(self):
        return self.__incoming_per_second

    def pause_engine(self):
        self.__pause_engine.value = True

    def resume_engine(self):
        self.__pause_engine.value = False
