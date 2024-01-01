import asyncio
import json
import os.path
import subprocess

import aiohttp
import psutil
import websockets
from fastapi import Depends, FastAPI, Query, WebSocketException, WebSocket
from fastapi import status, Request, Body
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from tzlocal import get_localzone
from websockets.exceptions import ConnectionClosedError

from configuration import (FAST_API_AUTH_SALT_WILL_AUTO_GENERATE, ROOT_SAVED_DATA_DIRECTORY, TOKEN_EXPIRATION,
                           INTERFACE_FACTORY_PORT, FAST_API_ALLOWED_ORIGIN, DOWNLOAD_TOKEN_EXPIRATION)
from .fast_api_data_models import *
from .fast_api_dependency import BackendDatabaseController, CryptoAndAuth, download_database

# Factory IP and Port Mapping
factory_url = f"http://127.0.01:{INTERFACE_FACTORY_PORT}"
interface_url = "http://127.0.01:"
# Factory IP and Port Mapping

fast_api_app = FastAPI()
auth_manager = CryptoAndAuth(FAST_API_AUTH_SALT_WILL_AUTO_GENERATE, TOKEN_EXPIRATION)
auth_manager_for_downloads_only = CryptoAndAuth(FAST_API_AUTH_SALT_WILL_AUTO_GENERATE, DOWNLOAD_TOKEN_EXPIRATION)
backend_db = BackendDatabaseController(ROOT_SAVED_DATA_DIRECTORY, Base)

fast_api_app.add_middleware(
    CORSMiddleware,
    allow_origins=FAST_API_ALLOWED_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ONLY FOR DEVELOPMENT PURPOSE
# @fast_api_app.get("/reset_database")
# def reset_database():
#     backend_db.for_debug_purpose_only_delete_all_data()
#
# ONLY FOR DEVELOPMENT PURPOSE


def authenticate_user(token: Annotated[str, Depends(OAuth2PasswordBearer(tokenUrl="get/token"))]):
    decoded_data = auth_manager.verify_signed_token(token)
    user_exist = None
    if decoded_data is not None:
        user_exist = backend_db.get_from_database(UserOrm, decoded_data["phone_number"])
    if decoded_data is None or user_exist is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials",
                            headers={"WWW-Authenticate": "Bearer"}, )
    return UserModel(**decoded_data)


def authenticate_user_for_websocket(token: Annotated[str, Query()]):
    try:
        decoded_data = auth_manager.verify_signed_token(token)
        user_exist = None
        if decoded_data is not None:
            user_exist = backend_db.get_from_database(UserOrm, decoded_data["phone_number"])
        if decoded_data is None or user_exist is None:
            raise Exception
    except Exception:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    return UserModel(**decoded_data)


@fast_api_app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = []
    for error in exc.errors():
        try:
            error.pop("url", None)  # to remove the pydantic documentation link
        except KeyError:
            pass
        error_details.append(error)
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=jsonable_encoder(error_details), )


#  According To Standard (OAuth2 with Password, Bearer)
@fast_api_app.post("/get/token", )
async def login_for_access_token(oauth_form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user_found = True
    user = backend_db.get_from_database(UserOrm, oauth_form_data.username)
    if user is None:
        user_found = False
    else:
        user: UserOrm = user[0]
    if user_found:
        correct_password = auth_manager.compare_hash_to_plain_text(oauth_form_data.password, user.password)
    else:
        correct_password = False
    if not user_found or not correct_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password",
                            headers={"WWW-Authenticate": "Bearer"}, )
    info_which_will_be_encoded = {"phone_number": user.phone_number, "is_admin": user.is_admin,
                                  "user_name": user.user_name}
    token = auth_manager.return_signed_token(info_which_will_be_encoded)
    return {"access_token": token["access_token"], "token_type": "bearer"}


#  According To Standard (OAuth2 with Password, Bearer)


@fast_api_app.post("/get/token/json", response_model=GenericResponseModel)
async def login_for_access_token(user_login_form: Annotated[UserLogInModel, Body()]):
    user_found = True
    user = backend_db.get_from_database(UserOrm, user_login_form.phone_number)
    if user is None:
        user_found = False
    else:
        user: UserOrm = user[0]
    if user_found:
        correct_password = auth_manager.compare_hash_to_plain_text(user_login_form.password, user.password)
    else:
        correct_password = False
    if not user_found or not correct_password:
        return GenericResponseModel(status=False, data=user_login_form.model_dump(),
                                    error="invalid user" if correct_password else "invalid password")
    info_which_will_be_encoded = {
        "phone_number": user.phone_number,
        "is_admin": user.is_admin,
        "user_name": user.user_name
    }
    token = auth_manager.return_signed_token(info_which_will_be_encoded)
    return GenericResponseModel(status=True, data=token, )


@fast_api_app.get("/renew/session", response_model=GenericResponseModel)
async def renew_session(requesting_user: Annotated[UserModel, Depends(authenticate_user)]):
    token = auth_manager.return_signed_token(requesting_user.model_dump())
    return GenericResponseModel(status=True, data=token, )


# About Systems
# About Systems

@fast_api_app.get("/get/time", response_model=GenericResponseModel)
async def get_time():
    return GenericResponseModel(status=True, data={"time": (datetime.now(get_localzone()
                                                                         ).strftime("%Y-%m-%dT%H:%M:%S.%f%z"))})


@fast_api_app.get("/alive", response_model=GenericResponseModel)
async def alive():
    return GenericResponseModel(status=True, data={})


@fast_api_app.get("/get_all_time_zone", response_model=GenericResponseModel)
async def time_zone(requesting_user: Annotated[UserModel, Depends(authenticate_user)]):
    try:
        return GenericResponseModel(status=True, data={
            "all_zones": list(pytz.common_timezones),
            "current_zone": str(get_localzone())
        })
    except Exception as e:
        return GenericResponseModel(status=False, data={}, error=f"{e}")


@fast_api_app.post("/set_zone", response_model=GenericResponseModel)
async def set_zone(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                   zone: Annotated[TimeZone, Body()]):
    if not requesting_user.is_admin:
        return GenericResponseModel(status=False, data={}, error="only admin can set timezone")

    try:
        set_timezone_command = f"timedatectl set-timezone {zone.zone}"
        enable_ntp_command = "timedatectl set-ntp true"
        subprocess.run(set_timezone_command, shell=True, check=True)
        subprocess.run(enable_ntp_command, shell=True, check=True)
        reboot_command = "reboot -f"
        subprocess.run(reboot_command, shell=True)
    except Exception as e:
        return GenericResponseModel(status=False, data={}, error=f"{e}")

    return GenericResponseModel(status=True, data={},)


@fast_api_app.get("/get/system/status", response_model=GenericResponseModel)
async def system_status(requesting_user: Annotated[UserModel, Depends(authenticate_user)]):
    def calculate_sizes(base_path):
        sizes = 0
        for dir_path, dir_names, filenames in os.walk(base_path):
            total_size = 0
            for filename in filenames:
                file_path = os.path.join(dir_path, filename)
                total_size += os.path.getsize(file_path)

            sizes += total_size
        return sizes

    def get_cpu_model_name():
        try:
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if line.startswith('model name'):
                        return line.split(':', 1)[1].strip()
        except Exception as e:
            return "Error"

    log = calculate_sizes(os.path.abspath(ROOT_SAVED_DATA_DIRECTORY))
    total = psutil.disk_usage('/').total
    free = psutil.disk_usage('/').free
    system_space = total - (log + free)
    percent_used = round((log / total) * 100, 2)
    percent_system = round((system_space / total) * 100, 2)
    percent_free = round((free / total) * 100, 2)
    total_disk_space = round(total / (1024 ** 3), 2)

    ram = psutil.virtual_memory()
    total_ram_gb = ram.total / (1024 ** 3)
    ram_percent_used = ram.percent

    disk = {
        # "location": os.path.abspath(ROOT_SAVED_DATA_DIRECTORY),
        "total": total_disk_space,
        'log': round(log / (1024 ** 3), 2),
        'percent_log': percent_used,
        'system': round(system_space / (1024 ** 3), 2),
        'percent_system': percent_system,
        'free': round(free / (1024 ** 3), 2),
        'percent_free': percent_free,
    }

    ram = {"total": round(total_ram_gb, 2), "percent": round(ram_percent_used, 2), }

    cpu = {
        "details": get_cpu_model_name(),
        "core": psutil.cpu_count(logical=True),
        "percent": round(psutil.cpu_percent(), 2),
    }

    system = {"cpu": cpu, "ram": ram, "disk": disk}

    return GenericResponseModel(status=True, data=system)


# About Systems
# About Systems

# Everything About Users
# Everything About Users

@fast_api_app.get("/get/all/users", response_model=GenericResponseModel)
async def get_all_users(requesting_user: Annotated[UserModel, Depends(authenticate_user)]):
    all_users: list[UserOrm] = backend_db.get_from_database(UserOrm)
    if all_users is None:
        return GenericResponseModel(status=False, data={}, error="no user exists in system")
    all_user_as_list = []
    for user in all_users:
        temp_user = {"user_name": user.user_name, "phone_number": user.phone_number, "password": "*__secret__*",
                     "is_admin": user.is_admin}
        all_user_as_list.append(temp_user)
    return GenericResponseModel(status=True, data={"users": all_user_as_list})


@fast_api_app.get("/eligible_for_admin", response_model=GenericResponseModel)
async def eligibility():
    users = backend_db.get_from_database(UserOrm, select(UserOrm).where(UserOrm.is_admin == True))
    if users is not None:
        return GenericResponseModel(status=False, data={},
                                    error="at least one admin user exists in the system")
    return GenericResponseModel(status=True, data={"status": "eligible for creating admin"}, )


@fast_api_app.post("/create/admin", response_model=GenericResponseModel)
async def create_initial_admin(user: Annotated[UserCreationModel, Body()], ):
    users = backend_db.get_from_database(UserOrm, select(UserOrm).where(UserOrm.is_admin == True))
    if users is not None:
        return GenericResponseModel(status=False, data=user.model_dump(),
                                    error="at least one admin user exists in the system")

    user.password = auth_manager.create_hash_from_plain_text(user.password)
    converted_dict = user.model_dump()
    converted_dict["is_admin"] = True
    backend_db.inset_orm_to_database(UserOrm(**converted_dict))
    converted_dict.pop("password")
    return GenericResponseModel(status=True, data=converted_dict)


@fast_api_app.post("/create/user", response_model=GenericResponseModel)
async def create_user(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      new_user: Annotated[UserCreationModelWithAdmin, Body()]):
    if requesting_user.is_admin:
        new_user_exist = backend_db.get_from_database(UserOrm, new_user.phone_number)
        if new_user_exist is not None:
            return GenericResponseModel(status=False, data=new_user.model_dump(),
                                        error="already a user exists with same phone number")
        else:
            plain_password = new_user.password
            new_user.password = auth_manager.create_hash_from_plain_text(new_user.password)
            new_user = new_user.model_dump()
            feedback = backend_db.inset_orm_to_database(UserOrm(**new_user))
            new_user["password"] = plain_password
            if feedback:
                return GenericResponseModel(status=True, data=new_user)
            else:
                return GenericResponseModel(status=False, data=new_user, error="system failed to save")

    return GenericResponseModel(status=False, data=new_user.model_dump(), error="only admin can create another user")


@fast_api_app.post("/update/user", response_model=GenericResponseModel)
async def update_user(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      updated_user: Annotated[UserUpdateModel, Body()]):
    target_user = backend_db.get_from_database(UserOrm, requesting_user.phone_number)[0]
    updated_user.password = auth_manager.create_hash_from_plain_text(updated_user.password)
    updated_user = updated_user.model_dump()
    backend_db.update_field_to_database(target_user, updated_user)
    return GenericResponseModel(status=True, data={})


@fast_api_app.post("/convert/to/admin", response_model=GenericResponseModel)
async def update_user(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      type_change_requested: Annotated[UserChangeAdminModel, Body()]):
    if requesting_user.is_admin:
        target_user_exist = backend_db.get_from_database(UserOrm, type_change_requested.phone_number)
        if target_user_exist is None:
            return GenericResponseModel(status=False, data=type_change_requested.model_dump(),
                                        error="user with the phon number dose not exist")
        if type_change_requested.phone_number == requesting_user.phone_number:
            return GenericResponseModel(status=False, data={},
                                        error="can not change yourself")
        target_user = backend_db.get_from_database(UserOrm, type_change_requested.phone_number)[0]
        type_change_requested = type_change_requested.model_dump()
        backend_db.update_field_to_database(target_user, type_change_requested)
        return GenericResponseModel(status=True, data={})
    return GenericResponseModel(status=False, data={}, error="only admin can change type")


@fast_api_app.post("/delete/user", response_model=GenericResponseModel)
async def delete_user(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      target_user: Annotated[UserID, Body()]):
    if target_user.phone_number == requesting_user.phone_number:
        return GenericResponseModel(status=False, data={},
                                    error="can not delete yourself")
    if requesting_user.is_admin:
        target_user_exist = backend_db.get_from_database(UserOrm, target_user.phone_number)
        if target_user_exist is None:
            return GenericResponseModel(status=False, data=target_user.model_dump(),
                                        error="user with the phon number dose not exist")
        feedback = backend_db.delete_from_database(UserOrm, target_user.phone_number)
        if feedback:
            return GenericResponseModel(status=True, data=target_user.model_dump())
        else:
            return GenericResponseModel(status=False, data=target_user.model_dump(), error="user deletion failed")
    return GenericResponseModel(status=False, data=target_user.model_dump(), error="only admin can delete any user")


# Everything About Users
# Everything About Users


# Everything About Engines
# Everything About Engines

async def dump_to_database():
    async with aiohttp.ClientSession() as session:
        async with session.post(factory_url, json={"dump_settings": ""}) as response:
            result = await response.json()
            if not result["status"] == "success":
                raise Exception("failed to save changes to database, extremely critical error")


@fast_api_app.get("/get/all_engines", response_model=GenericResponseModel)
async def get_all_interfaces(requesting_user: Annotated[UserModel, Depends(authenticate_user)]):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(factory_url, json={"running_engines": ""}) as response:
                result = await response.json()
                reply = {} if result["status"] != "success" else result["response"]
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=reply,
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface factory is not running, critical error {e}")


@fast_api_app.post("/create/engine", response_model=GenericResponseModel)
async def create_engine(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                        engine: Annotated[InterfaceCreateEngine, Body()]):
    if not requesting_user.is_admin:
        return GenericResponseModel(status=False, data=engine.model_dump(), error="only admin can create engine")

    engine = engine.model_dump()
    _class = engine["engine_class"]
    engine.pop("engine_class")
    engine["class"] = _class
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(factory_url, json={"create_engine": engine}) as response:
                result = await response.json()
                if result["status"] == "success":
                    await dump_to_database()
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data={},
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface factory is not running, critical error {e}")


@fast_api_app.post("/delete/engine", response_model=GenericResponseModel)
async def delete_engine(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                        engine: Annotated[DeleteEngine, Body()]):
    if not requesting_user.is_admin:
        return GenericResponseModel(status=False, data=engine.model_dump(), error="only admin can delete engine(s)")
    name = engine.engine
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(factory_url, json={"delete_engine": {"name": name}}) as response:
                result = await response.json()
                if result["status"] == "success":
                    await dump_to_database()
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data={},
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface factory is not running, critical error {e}")


@fast_api_app.post("/get/all_clients", response_model=GenericResponseModel)
async def get_all_clients(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                          interface: Annotated[InterfaceCommunicationModel, Body()]):
    interface_port = str(interface.port)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"all_clients": ""}) as response:
                result = await response.json()
                temp = []
                for client in result["response"]:
                    temp.append((client, result["response"][client]))
                reply = {} if result["status"] != "success" else {"clients": temp}
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=reply,
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/add/client", response_model=GenericResponseModel)
async def add_client(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                     client: Annotated[AddClient, Body()]):
    if not requesting_user.is_admin:
        return GenericResponseModel(status=False, data=client.model_dump(), error="only admin can add client(s)")
    client = client.model_dump()
    interface_port = str(client.pop("port"))
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"add_client": client}) as response:
                result = await response.json()
                if result["status"] == "success":
                    await dump_to_database()
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data={},
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/edit/client", response_model=GenericResponseModel)
async def edit_client(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      client: Annotated[AddClient, Body()]):
    if not requesting_user.is_admin:
        return GenericResponseModel(status=False, data=client.model_dump(), error="only admin can edit client(s)")
    client = client.model_dump()
    interface_port = str(client.pop("port"))
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"edit_client_ip": client}) as response:
                result = await response.json()
                if result["status"] == "success":
                    await dump_to_database()
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data={},
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/delete/client", response_model=GenericResponseModel)
async def delete_client(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                        client: Annotated[DeleteClient, Body()]):
    if not requesting_user.is_admin:
        return GenericResponseModel(status=False, data=client.model_dump(), error="only admin can delete client(s)")
    client_name = client.client
    interface_port = str(client.port)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"remove_client": client_name}) as response:
                result = await response.json()
                if result["status"] == "success":
                    await dump_to_database()
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data={},
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/get/history", response_model=GenericResponseModel)
async def get_history(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      interface: Annotated[InterfaceCommunicationModel, Body()]):
    interface_port = str(interface.port)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"history": ""}) as response:
                result = await response.json()

                if result["response"] == "engine is not running":
                    raise Exception("engine is not running")
                elif result["response"] == "no client":
                    reply = {}
                else:
                    reply = result["response"]

                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=reply,
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/get/engine_load", response_model=GenericResponseModel)
async def get_loads(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                    interface: Annotated[InterfaceCommunicationModel, Body()]):
    interface_port = str(interface.port)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"get_stats/second": ""}) as response:
                result = await response.json()

                if isinstance(result["response"], dict):
                    reply = result["response"]
                else:
                    raise Exception("engine is not running")

                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=reply,
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/set/engine_config", response_model=GenericResponseModel)
async def set_configs(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      config: Annotated[SetConfiguration, Body()]):
    if not requesting_user.is_admin:
        return GenericResponseModel(status=False, data={}, error="only admin can edit engine configs")
    interface_port = str(config.port)
    keep_raw_log = config.keep_original_log
    auto_delete_days = config.auto_delete_days
    try:
        config = {
            "keep_original_log": keep_raw_log,
            "auto_delete_days": auto_delete_days
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"set_configs": config}) as response:
                result = await response.json()
                if result["status"] == "success":
                    await dump_to_database()
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data={},
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/get/supported_configs", response_model=GenericResponseModel)
async def supported_configs(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                            query_target: Annotated[InterfaceCommunicationModel, Body()]):
    interface_port = str(query_target.port)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"get_supported_configs": ""}) as response:
                result = await response.json()
                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=result["response"],
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, critical error {e}")


@fast_api_app.post("/get/supported_query", response_model=GenericResponseModel)
async def supported_query(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                          query_target: Annotated[SupportedQuery, Body()]):
    interface_port = str(query_target.port)
    client = query_target.client
    date = query_target.date
    try:
        query_s = {"client": client, "date": date}
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"supported_query": query_s}) as response:
                result = await response.json()
                if isinstance(result["response"], dict):
                    reply = result["response"]
                else:
                    raise Exception(str(result["response"]))

                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=reply,
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, error {e}")


@fast_api_app.post("/query_count", response_model=GenericResponseModel)
async def query_count(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                      query_target_c: Annotated[QueryCount, Body()]):
    interface_port = str(query_target_c.port)
    client = query_target_c.client
    date = query_target_c.date
    conditions = query_target_c.conditions
    try:
        query_c = {"client": client, "date": date, "conditions": conditions}
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"query_count": query_c}) as response:
                result = await response.json()
                if isinstance(result["response"], dict):
                    reply = result["response"]
                else:
                    raise Exception(str(result["response"]))

                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=reply,
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, error {e}")


@fast_api_app.post("/query", response_model=GenericResponseModel)
async def query(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                _filter: Annotated[DBQuery, Body()]):
    interface_port = str(_filter.port)
    client = _filter.client
    date = _filter.date
    conditions = _filter.conditions
    starting = _filter.starting
    limit = _filter.limit
    try:
        _filter = {"client": client, "date": date, "starting": starting, "limit": limit, "conditions": conditions}
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + interface_port, json={"query": _filter}) as response:
                result = await response.json()
                if isinstance(result["response"], dict):
                    reply = result["response"]
                else:
                    raise Exception(str(result["response"]))

                return GenericResponseModel(status=True if result["status"] == "success" else False,
                                            data=reply,
                                            error=str(result["response"]) if result["status"] != "success" else None)
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, error {e}")


@fast_api_app.websocket("/realtime")
async def websocket_endpoint(requesting_user: Annotated[UserModel, Depends(authenticate_user_for_websocket)],
                             websocket_fast_api_client: WebSocket, interface: Annotated[int, Query()]):
    await websocket_fast_api_client.accept()
    while True:
        async with (websockets.connect(f"ws://localhost:{interface}", compression=None, ping_interval=None)
                    as interface_connector):
            while True:
                try:
                    message = await interface_connector.recv()
                    await websocket_fast_api_client.send_json(json.loads(message))
                    await asyncio.sleep(0.0001)
                except ConnectionClosedError:
                    break
                except Exception:
                    return


async def __get_query_parameters(query_object):
    try:
        query_object["port"] = str(query_object["port"])
        async with aiohttp.ClientSession() as session:
            async with session.post(interface_url + query_object["port"],
                                    json={"query_manual": query_object}) as response:
                response = await response.json()
                if not response["status"]:
                    return f"error, {response['error']}"
                else:
                    return response["response"]
    except Exception as exp:
        return f"error, {exp}"


@fast_api_app.post("/get/download_token", )
async def generate_download(requesting_user: Annotated[UserModel, Depends(authenticate_user)],
                            query_request: Annotated[DownloadEncoder, Body()]):
    request_as_dict = query_request.model_dump()
    if query_request.conditions is None:
        request_as_dict.pop("conditions")
    return {
        "token": auth_manager_for_downloads_only.return_signed_token(request_as_dict)["access_token"],
        "expire_after_minute": DOWNLOAD_TOKEN_EXPIRATION
    }


@fast_api_app.get("/download")
async def full_download(token: Annotated[str, Query()]):
    structure = auth_manager_for_downloads_only.verify_signed_token(token)

    if structure is None and not isinstance(structure, dict):
        raise HTTPException(status_code=401, detail="Unauthorized access")
    structure.pop("expire")
    query_parameters = await __get_query_parameters(structure)
    if not isinstance(query_parameters, dict):
        return GenericResponseModel(status=False, data={},
                                    error=f"most probably interface is not running, error {query_parameters}")

    try:
        if "conditions" in structure:
            return download_database(
                f"{structure['date']} ({structure['client']})",
                query_parameters["path"], query_parameters["sql"], query_parameters["value"])
        else:
            return download_database(
                f"{structure['date']} ({structure['client']})", query_parameters["path"])
    except Exception as e:
        return GenericResponseModel(status=False, data={},
                                    error=f"error {e}")

# Everything About Engines
# Everything About Engines
