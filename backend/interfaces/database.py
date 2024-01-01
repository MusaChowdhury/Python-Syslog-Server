import json
import os
from typing import Type

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from interfaces.models import Base, Engine, Client


class DataBaseController:
    def __init__(self, db_path: str, base_class: Type[Base]):
        self.__db_path = db_path
        self.__engine = create_engine(f"sqlite:///{self.__db_path}")
        self.__base_class = base_class
        self.__base_class.metadata.create_all(self.__engine)

    def dump_settings(self, configs: dict):
        with Session(self.__engine) as session:
            for _class in configs:
                for engine in configs[_class]:
                    target_engine = session.query(Engine).filter_by(name=engine["configs"]["engine_name"]).first()
                    if target_engine:
                        target_engine.configs = json.dumps(engine["configs"])
                    else:
                        session.add(Engine(name=engine["configs"]["engine_name"], class_type=engine["configs"]["class"],
                                           configs=json.dumps(engine["configs"])))
                    session.commit()
                    target_engine = session.query(Engine).filter_by(name=engine["configs"]["engine_name"]).first()
                    for client in engine["clients"]:
                        found = False
                        for db_client in target_engine.clients:
                            if db_client.name == client:
                                found = True
                                db_client.ip = str(engine["clients"][client][0])
                        if not found:
                            target_engine.clients.append(Client(name=str(client), ip=str(engine["clients"][client][0])))
                        session.commit()

    def fetch_settings(self):
        _all = []
        with Session(self.__engine) as session:
            engines = session.query(Engine).all()
            for engine in engines:
                temp = {
                    "configs": json.loads(engine.configs),
                    "clients": {}
                }
                for client in engine.clients:
                    temp["clients"][client.name] = [client.ip, 0]
                _all.append(temp)
        return _all

    def check_if_client_exist(self, client_name, client_ip):
        client_ip = client_ip.strip()
        client_name = client_name.strip()
        with Session(self.__engine) as session:
            clients = session.query(Client).all()
            for client in clients:
                if client.ip == client_ip or client.name == client_name:
                    return tuple([client.name, client.ip, client.engine])
        return False

    def check_if_engine_exist(self, engine_name):
        engine_name = engine_name.strip()
        with Session(self.__engine) as session:
            engines = session.query(Engine).all()
            for engine in engines:
                if engine.name == engine_name:
                    return tuple([engine.class_type, engine.name])
        return False

    def delete(self, name: str):
        with Session(self.__engine) as session:
            engine = session.query(Engine).where(Engine.name == name).first()
            if engine:
                session.delete(engine)
                session.commit()
                return
            raise Exception("engine dont exists in the database")
