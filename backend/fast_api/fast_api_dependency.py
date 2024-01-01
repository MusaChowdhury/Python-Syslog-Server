import csv
import os
import sqlite3
from datetime import datetime, timedelta
from io import StringIO
from typing import Type, Any

import jose.constants
import sqlalchemy.exc
from dateutil import parser
from fastapi.responses import StreamingResponse
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select, Select, create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from tzlocal import get_localzone

from .fast_api_data_models import Base


class CryptoAndAuth:

    def __init__(self, private_key: str, token_expire: int = 120):
        self._private_key: str = private_key
        self._access_token_expiration_time_in_minutes = int(token_expire)
        self._hash_manager = CryptContext(schemes=["bcrypt"], deprecated="auto")
        if (not isinstance(self._access_token_expiration_time_in_minutes, int)
                or self._access_token_expiration_time_in_minutes < 1):
            raise Exception("token_expire mus be greater than 1")

    def create_hash_from_plain_text(self, plaintext_password: str):
        return self._hash_manager.hash(plaintext_password)

    def compare_hash_to_plain_text(self, plain_text: str, hashed_text: str):
        try:
            return self._hash_manager.verify(plain_text, hashed_text)
        except Exception:
            return False

    def return_signed_token(self, pairs: dict):
        pairs["expire"] = ((datetime.now(get_localzone()) +
                            timedelta(minutes=self._access_token_expiration_time_in_minutes))
                           .strftime("%Y-%m-%dT%H:%M:%S.%f%z"))
        return {"access_token": jwt.encode(pairs, self._private_key, jose.constants.ALGORITHMS.HS256)}

    def verify_signed_token(self, token: str) -> dict | None:
        verified = True
        result = None
        try:
            result = jwt.decode(token, self._private_key, jose.constants.ALGORITHMS.HS256, {
                "verify_exp": False
            })
        except Exception:
            verified = False
        if result and (
                int(parser.isoparse(result["expire"]).timestamp()
                    - (datetime.now(get_localzone()).timestamp())) <= 0):
            verified = False
            result.pop("expire")
        return result if verified else None


class BackendDatabaseController:
    def __init__(self, root_path, base_class: Type["DeclarativeBase"]):
        if not isinstance(root_path, str):
            raise Exception
        if not os.path.exists(os.path.join(root_path)):
            os.makedirs(os.path.join(root_path))
        self.__root_path = os.path.join(root_path, "fast_api.db")
        if not os.path.exists(self.__root_path):
            with open(self.__root_path, 'w') as _:
                pass
        self.__engine = create_engine(f"sqlite:///{self.__root_path}")
        self.__session_maker = sessionmaker(self.__engine)
        self.__base_class = base_class
        self.__base_class.metadata.create_all(self.__engine)

    @staticmethod
    def orm_to_dict(table_instance: Base):
        result = {}
        for column in table_instance.__table__.columns:
            result[column.name] = getattr(table_instance, column.name)
        return result

    def inset_orm_to_database(self, row: Base):
        temp_session = self.__session_maker()
        try:
            temp_session.add(row)
            temp_session.commit()
            temp_session.close()
            return True
        except sqlalchemy.exc.IntegrityError:
            temp_session.close()
            return False

    def get_from_database(
            self,
            table: Type["Base"],
            all_or_single_object_or_where_statement: int | float | str | Select | None = None) -> list | None | Any:
        temp_session = self.__session_maker()
        try:

            if isinstance(all_or_single_object_or_where_statement, Select):
                result = temp_session.scalars(all_or_single_object_or_where_statement).all()
            elif isinstance(all_or_single_object_or_where_statement, (int, float, str)):
                result = temp_session.get(table, all_or_single_object_or_where_statement)
                if result is not None:
                    _result = list()
                    _result.append(result)
                    result = _result

                else:
                    result = list()
            else:
                result = temp_session.scalars(select(table)).all()
            temp_session.close()
            return result if len(result) != 0 else None
        except Exception:
            temp_session.close()
            return None

    def update_field_to_database(self, table_instance: Base, updated_key_value_pair: dict):
        temp_session = self.__session_maker()
        statement = select(type(table_instance)).filter_by(**(self.orm_to_dict(table_instance)))
        matched_object: Base = temp_session.scalars(statement).first()
        for key in updated_key_value_pair:
            matched_object[key] = updated_key_value_pair[key]
        temp_session.commit()
        temp_session.close()

    def delete_from_database(self, table: Type["Base"], primary_key: str | int | float):
        temp_session = self.__session_maker()
        try:
            target_row = temp_session.get(table, primary_key)
            temp_session.delete(target_row)
            temp_session.commit()
            temp_session.close()
            return True
        except Exception:
            temp_session.close()
            return False

    # ONLY FOR DEVELOPMENT PURPOSE
    def for_debug_purpose_only_delete_all_data(self):
        self.__base_class.metadata.drop_all(self.__engine)
        self.__base_class.metadata.create_all(self.__engine)

    # ONLY FOR DEVELOPMENT PURPOSE


def database_query(path, sql_statement=None, values=None):
    with sqlite3.connect(f'file:{path}?mode=ro', uri=True, check_same_thread=False) as connection:
        cursor = connection.cursor()
        if sql_statement is None or values is None:
            cursor.execute("SELECT * FROM LOG")
        else:
            cursor.execute(sql_statement, values)
        header = [column_name[0] for column_name in cursor.description]
        csv_buffer = StringIO()
        csv_writer = csv.writer(csv_buffer)
        print_head = True
        result = False
        while True:
            rows = cursor.fetchmany(1000)
            if not rows:
                if result:
                    break
                else:
                    yield "No Match Found"
                    break
            if print_head:
                csv_writer.writerow(header)
                print_head = False

            for row in rows:
                result = True
                csv_writer.writerow(row)

            yield csv_buffer.getvalue()
            csv_buffer.truncate(0)
            csv_buffer.seek(0)


def download_database(name, path, sql_statement=None, values=None):
    return StreamingResponse(database_query(path, sql_statement, values),
                             media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={name}.csv"})
