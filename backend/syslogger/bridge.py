import copy
import gc
import glob
import multiprocessing
import os
import threading
import time
import traceback
from datetime import datetime, timedelta
from threading import Thread

import psutil
from faster_fifo import Queue

from .database import DataBaseHook
from .engine import Engine, ClientWithIP, InternalLog


class EngineDatabaseBridge:

    def __init__(self, name: str, port: int, regular_expression: list, database_config: dict, keep_raw_log: bool,
                 auto_delete_days: int, space_percentage_to_stop: int, verbose: bool = False):
        self.__name = name.strip()
        if not isinstance(self.__name, str):
            raise Exception("name must be str")
        self.__port = port
        self.__internal_all_queue_size_limit = 10
        self.__saved_data = []
        self.__internal_status = []
        self.__internal_performance_status = {}
        self.__database_config = database_config
        self.__regular_expression = regular_expression
        self.__keep_raw_log = keep_raw_log
        self.__engine: Engine | None = None
        self.__db_hook: DataBaseHook | None = None
        self.__any_internal_status_update: bool = False
        self.__any_data_saved: bool = False
        self.__debug = verbose
        self.__debug_thread = True
        self.__debug_thread_stopped = False
        self.__auto_delete_days = auto_delete_days
        self.__space_percentage_to_stop = space_percentage_to_stop
        self.__is_paused = False
        self.__pause_reason = "undefined"
        if (not isinstance(self.__auto_delete_days, int)) and int(self.__auto_delete_days) < 2:
            raise Exception("auto_delete_days must be greater than or equal to 2")
        if (not isinstance(self.__space_percentage_to_stop, int)) and not (
                1 < int(self.__space_percentage_to_stop) < 100):
            raise Exception("space_percentage_to_stop must be greater than 1 or less than 100")
        self.__automated_threads = True
        self.__auto_delete_thread_stopped = False
        self.__auto_space_checker_thread_stopped = False
        self.__lock = threading.Lock()

    @staticmethod
    def __none_checker_decorator(inverse: bool = False):
        def decorated_funtion(function):
            def wrapper(self, *args, **kwargs):
                if not inverse:
                    if self.__engine is None or self.__db_hook is None:
                        return "engine is not running"
                else:
                    if self.__engine is not None or self.__db_hook is not None:
                        return "engine is already running"
                try:
                    result = function(self, *args, **kwargs)
                except Exception as e:
                    raise Exception(str(e))
                return result

            return wrapper

        return decorated_funtion

    def is_none(self):
        return self.__engine is None or self.__db_hook is None

    @__none_checker_decorator()
    def get_engine_buffer(self):
        return self.__engine.get_buffer_size()

    @__none_checker_decorator(inverse=True)
    def start(self, verbose_engine=False, verbose_db=False):
        try:
            self.__db_hook = DataBaseHook(self.__name, self.__database_config, verbose_db)
            self.__engine = Engine(self.__name, self.__port, self.__regular_expression, self.__keep_raw_log,
                                   self.__db_hook.get_main_callback(), verbose=verbose_engine)

            self.__automated_threads = True
            self.__auto_delete_thread_stopped = False
            self.__auto_space_checker_thread_stopped = False
            self.__debug_thread_stopped = False
            self.__db_hook.start()
            self.__engine.start()

            # Monitoring threads
            Thread(target=self.__internal_status_cache_thread,
                   kwargs={"status_queue": self.__engine.get_internal_status(), "status_for": "Engine"}, daemon=True,
                   name=f"bridge ({self.__name}) internal_status checker for engine").start()

            Thread(target=self.__internal_status_cache_thread,
                   kwargs={"status_queue": self.__db_hook.get_internal_status(), "status_for": "Database"}, daemon=True,
                   name=f"bridge ({self.__name}) internal_status checker for database_hook").start()

            Thread(target=self.__internal_performance_cache_thread, daemon=True,
                   name=f"bridge ({self.__name}) incoming/saving load checker for engine / database_hook").start()

            Thread(target=self.__saved_data_cache_thread,
                   kwargs={"saved_data_queue": self.__db_hook.get_already_committed_data()}, daemon=True,
                   name=f"bridge ({self.__name}) already saved data checker for database_hook").start()

            Thread(target=self.__auto_delete_old_files, daemon=True,
                   name=f"bridge ({self.__name}) auto delete thread").start()

            Thread(target=self.__pause_bridge_because_of_no_space, daemon=True,
                   name=f"bridge ({self.__name}) disk space checker").start()

            if self.__debug:
                Thread(target=self.__for_debug_purpose_check_all_thread, name=f"bridge ({self.__name}) verbose thread",
                       daemon=True).start()
        except Exception:
            if self.__debug:
                traceback.print_exc()
            return False
        return True

    @__none_checker_decorator()
    def stop(self, reason="stopped", automated_thread=True):
        self.__lock.acquire()
        try:
            self.__engine.stop()
            self.__db_hook.stop()
            gc.collect()
        except Exception:
            for status in self.__internal_performance_status:
                self.__internal_performance_status[status] = "error"
            self.__lock.release()
            traceback.print_exc()
            gc.collect()
            return False
        time.sleep(2)
        self.__automated_threads = not automated_thread
        self.__lock.release()
        while not self.__auto_delete_thread_stopped:
            time.sleep(0.1)
        while not self.__auto_space_checker_thread_stopped:
            time.sleep(0.1)
        if self.__debug:
            self.__debug_thread = False
            while not self.__debug_thread_stopped:
                time.sleep(0.1)
        self.__engine = None
        self.__db_hook = None
        self.__internal_status.clear()
        self.__saved_data.clear()
        self.__any_data_saved = False
        self.__any_internal_status_update = False
        time.sleep(2)
        for status in self.__internal_performance_status:
            self.__internal_performance_status[status] = reason
        self.__internal_status.clear()
        self.__saved_data.clear()
        return True

    @staticmethod
    def all_thread_or_pprocess(_print=True):
        t = [thread.name for thread in threading.enumerate()]
        p = [process.name for process in multiprocessing.active_children()]
        if _print:
            print("all active threads:", t)
            print("all active processes: ", p)
        else:
            return [f"all active threads: {t}", f"all active processes: {p}"]

    @__none_checker_decorator()
    def add_client(self, client_name: str, client_ip: str):
        if len(client_name) < 3:
            return "invalid name length"
        self.__lock.acquire()
        try:
            return self.__engine.add_client(ClientWithIP(client_name, client_ip))
        except Exception as e:
            raise Exception(str(e))
        finally:
            self.__lock.release()

    @__none_checker_decorator()
    def remove_client(self, client_name: str):
        with self.__lock:
            if len(client_name) < 3:
                return "invalid name length"
            if not self.__db_hook.is_client_busy(client_name):
                if self.__engine.remove_client(client_name):
                    return self.__db_hook.delete_client(client_name)
            else:
                raise Exception("client is busy")

    @__none_checker_decorator()
    def change_client_ip(self, client_name, new_ip):
        edited_client = ClientWithIP(client_name, new_ip)

        if not edited_client.is_valid_client():
            raise Exception("either client name is empty or invalid ip")
        else:
            client_found = False
            for client in self.__engine.get_all_clients():
                if client.client == edited_client.client:
                    client_found = True
                if client.ip == edited_client.ip:
                    raise Exception("ip already exists")

            if not client_found:
                raise Exception("client does not exist")

            if self.__engine.remove_client(edited_client.client):
                return self.__engine.add_client(edited_client)
            else:
                raise Exception("failed to edit client for unknown reason")

    @__none_checker_decorator()
    def get_allowed_clients_from_engine(self) -> list[ClientWithIP]:
        self.__lock.acquire()
        temp = self.__engine.get_all_clients()
        self.__lock.release()
        return temp

    def __internal_status_list_manager(self, status: InternalLog):
        self.__lock.acquire()
        try:
            if len(self.__internal_status) > self.__internal_all_queue_size_limit:
                self.__internal_status.pop(0)
            self.__internal_status.append(status.as_dict())
        except Exception:
            pass
        finally:
            self.__lock.release()

    def __saved_data_list_manager(self, data):
        self.__lock.acquire()
        try:
            if len(self.__saved_data) > self.__internal_all_queue_size_limit:
                self.__saved_data.pop(0)
            self.__saved_data.append(data)
        except Exception:
            pass
        finally:
            self.__lock.release()

    def if_internal_status_changed(self) -> bool:
        try:
            if self.__any_internal_status_update:
                self.__any_internal_status_update = False
                return True
            return self.__any_internal_status_update
        except Exception:
            pass

        return False

    def get_internal_status(self, clear_buffer=True):
        self.__lock.acquire()
        try:
            _temp = copy.deepcopy(self.__internal_status)
            if clear_buffer:
                self.__internal_status.clear()
            return _temp
        except Exception:
            pass
        finally:
            self.__lock.release()
        return []

    def if_data_saved(self) -> bool:
        try:
            if self.__any_data_saved:
                self.__any_data_saved = False
                return True
            return self.__any_data_saved
        except Exception:
            pass
        return False

    def get_saved_data(self, clear_buffer=True):
        self.__lock.acquire()
        try:
            _temp = copy.deepcopy(self.__saved_data)
            if clear_buffer:
                self.__saved_data.clear()
            return _temp
        except Exception:
            pass
        finally:
            self.__lock.release()
        return []

    def get_performance_status(self):
        try:
            return self.__internal_performance_status
        except Exception:
            pass
        return None

    def __internal_status_cache_thread(self, status_queue: Queue, status_for: str):
        while self.__engine is not None or self.__db_hook is not None:
            try:
                try:
                    _temp = status_queue.get(timeout=0.001)
                except Exception:
                    continue
                self.__internal_status_list_manager(_temp)
                self.__any_internal_status_update = True
                time.sleep(0.01)
            except Exception as e:
                msg = f"while trying to get internal status, {e}"
                origin = f"Bridge ({self.__name}) [status checker for {status_for}]"
                self.__internal_status_list_manager(InternalLog(InternalLog.Type.Error, msg, origin))

    def __saved_data_cache_thread(self, saved_data_queue: Queue):
        while self.__engine is not None or self.__db_hook is not None:
            try:
                try:
                    saved_data: dict = saved_data_queue.get(timeout=0.001)
                except Exception:
                    continue
                self.__saved_data_list_manager(saved_data)
                self.__any_data_saved = True
                time.sleep(0.01)
            except Exception as e:
                msg = f"while trying to get saved data, {e}"
                origin = f"Bridge ({self.__name}) [status checker for database]"
                self.__internal_status_list_manager(InternalLog(InternalLog.Type.Error, msg, origin))

    def __internal_performance_cache_thread(self):
        while self.__engine is not None or self.__db_hook is not None:
            if self.__is_paused:
                self.__internal_performance_status["server_receiving_log"] = self.__pause_reason
                self.__internal_performance_status["realtime_rejecting_unknown_ip"] = self.__pause_reason
                self.__internal_performance_status["realtime_processing_client_log"] = self.__pause_reason
                self.__internal_performance_status["realtime_saving"] = self.__pause_reason
                time.sleep(0.2)
                continue
            try:
                from_engine = self.__engine.get_incoming_log_per_second()
                from_db = self.__db_hook.get_logs_saved_per_second()
                self.__lock.acquire()
                self.__internal_performance_status["server_receiving_log"] = from_engine["all"]
                self.__internal_performance_status["realtime_rejecting_unknown_ip"] = from_engine["unknown_client"]
                self.__internal_performance_status["realtime_processing_client_log"] = from_engine["known_client"]
                self.__internal_performance_status["realtime_saving"] = from_db["saved_to_database"]
                self.__lock.release()
                time.sleep(0.5)
            except Exception as e:
                msg = f"while trying to get internal processor's load information, {e}"
                self.__internal_status_list_manager(
                    InternalLog(InternalLog.Type.Error, msg, f"Bridge ({self.__name}) [load checker]"))

    def __for_debug_purpose_check_all_thread(self):
        while True:
            if not self.__debug_thread:
                self.__debug_thread_stopped = True
                return
            try:
                print("*" * 10, f"From Bridge ({self.__name})", "*" * 10)
                saved_data = self.get_saved_data(False)
                print(f"Saved Data: ({len(saved_data)})", saved_data)
                internal_status = self.get_internal_status(False)
                print(f"internal Log: ({len(internal_status)})", internal_status)
                print(self.get_performance_status())
                print("*" * 10, f"From Bridge ({self.__name})", "*" * 10)
                print("\n")
            except Exception as e:
                traceback.print_exc()
                pass
            time.sleep(1)

    @__none_checker_decorator()
    def get_saved_history(self):
        with self.__lock:
            return self.__db_hook.get_saved_client_information()

    @__none_checker_decorator()
    def get_supported_queries(self, client, date):
        # with self.__lock:
        return self.__db_hook.get_supported_query(client, date)

    @__none_checker_decorator()
    def query(self, client, date, conditions, limit, starting):
        # with self.__lock:
        return self.__db_hook.query_history(client, date, conditions, limit, starting)

    @__none_checker_decorator()
    def query_count(self, client, date, conditions):
        # with self.__lock:
        return self.__db_hook.query_history_count(client, date, conditions)

    @__none_checker_decorator()
    def query_manual(self, client, date, conditions):
        # with self.__lock:
        return self.__db_hook.query_manual(client, date, conditions)

    @__none_checker_decorator()
    def pause_engine(self, reason="undefined"):
        with self.__lock:
            self.__is_paused = True
            self.__pause_reason = reason
            self.__engine.pause_engine()

    @__none_checker_decorator()
    def resume_engine(self):
        with self.__lock:
            self.__is_paused = False
            self.__pause_reason = "undefined"
            self.__engine.resume_engine()

    def __pause_bridge_because_of_no_space(self):
        previous_time_s = 0
        while True:
            if not self.__automated_threads:
                self.__auto_space_checker_thread_stopped = True
                return
            current_time_s = int(time.time())
            if current_time_s - previous_time_s > 5:
                previous_time_s = int(current_time_s)
                try:
                    percent = psutil.disk_usage('/').percent
                    if percent > self.__space_percentage_to_stop:
                        if self.__engine:
                            self.pause_engine("no space")
                    else:
                        if self.__engine:
                            self.resume_engine()
                except Exception:
                    pass

            time.sleep(0.3)

    def __auto_delete_old_files(self):
        previous_time_s = 0
        while True:
            if not self.__automated_threads:
                self.__auto_delete_thread_stopped = True
                return
            current_time_s = int(time.time())
            if current_time_s - previous_time_s > 5:
                previous_time_s = int(current_time_s)
                try:
                    current_date = datetime.now()
                    time_threshold = current_date - timedelta(days=self.__auto_delete_days)
                    for file_path in glob.glob(
                            os.path.join(self.__database_config["log_saving_directory"], "**", '*.db')):
                        file_modified_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                        if file_modified_time < time_threshold:
                            immediate_parent = os.path.dirname(file_path)
                            target_db, _ = os.path.splitext(os.path.basename(file_path))
                            for related_file in glob.glob(os.path.join(immediate_parent, f"{target_db}*")):
                                try:
                                    os.remove(related_file)
                                except Exception:
                                    pass
                except Exception:
                    pass

            time.sleep(0.3)
