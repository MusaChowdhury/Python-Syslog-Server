import ipaddress
from datetime import datetime
from typing import Annotated, Any, Union, Optional

import pytz
from pydantic import BaseModel, Field, AfterValidator, BeforeValidator, field_validator, validator
from pydantic_core import PydanticCustomError
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped


class GenericResponseModel(BaseModel):
    status: Annotated[bool | None, Field(description=None)] = None
    data: Annotated[dict | None, Field(description=None)] = None
    error: Annotated[None | str | list[str], Field(description=None)] = None


class UserID(BaseModel):
    @staticmethod
    def check_if_phone_number_is_correct(number: str):
        number = number.strip().replace(" ", "")
        if not (0 < len(number) <= 20):
            raise PydanticCustomError('invalid_length',
                                      'phon_number should be less than 20 digits and more than 0 digit', )
        if not number.isdigit():
            raise PydanticCustomError('invalid_phone_number',
                                      'phone_number should not contain anything but digits 0-9', )
        return number

    @staticmethod
    def valid_str(string: str):
        string = string.strip()
        if len(string) == 0:
            raise PydanticCustomError('empty_string',
                                      "after removing leading and trailing whitespace length is zero")
        if len(string) < 4 or len(string) > 20:
            raise PydanticCustomError(
                'invalid length',
                "after removing leading and trailing whitespace length is should be between 4-20")
        return string

    phone_number: Annotated[str, AfterValidator(check_if_phone_number_is_correct)]


class UserCreationModel(UserID):
    password: Annotated[str, Field(max_length=20, min_length=6)]
    user_name: Annotated[str, AfterValidator(UserID.valid_str)]


class UserUpdateModel(BaseModel):
    password: Annotated[str, Field(max_length=20, min_length=6)]
    user_name: Annotated[str, AfterValidator(UserID.valid_str)]


class UserChangeAdminModel(UserID):
    is_admin: Annotated[bool, Field()]


class UserLogInModel(UserID):
    password: Annotated[str, Field(max_length=20, min_length=6)]


class UserCreationModelWithAdmin(UserCreationModel):
    is_admin: Annotated[bool, Field()]
    user_name: Annotated[str, AfterValidator(UserID.valid_str)]


class UserModel(UserID):
    is_admin: Annotated[bool, Field()]
    user_name: Annotated[str, AfterValidator(UserID.valid_str)]


class InterfaceCommunicationModel(BaseModel):

    @staticmethod
    def is_port_is_valid(port):
        if not (1 <= port <= 65000):
            raise PydanticCustomError('invalid_port',
                                      'port should be between 1 - 65000')
        return port

    port: Annotated[int, AfterValidator(is_port_is_valid)]


class InterfaceCreateEngine(BaseModel):
    @staticmethod
    def strip(string: str):
        string = string.strip()
        if len(string) == 0:
            raise PydanticCustomError('empty_string',
                                      "after removing leading and trailing whitespace length is zero")
        return string

    @staticmethod
    def only_lower(string):
        if not all(c.islower() or c.isdigit() or c == '_' for c in string):
            raise PydanticCustomError('invalid_character',
                                      "only lowercase letters, digits, and '_' are allowed.")
        return string

    engine_class: Annotated[str, AfterValidator(only_lower)]
    engine_name: Annotated[str, AfterValidator(only_lower)]
    engine_port: Annotated[int, AfterValidator(InterfaceCommunicationModel.is_port_is_valid)]
    keep_original_log: Annotated[bool, Field()]


class AddClient(InterfaceCommunicationModel):
    client: Annotated[str, AfterValidator(InterfaceCreateEngine.only_lower)]
    ip: str


class DeleteClient(InterfaceCommunicationModel):
    client: Annotated[str, AfterValidator(InterfaceCreateEngine.only_lower)]


class DeleteEngine(BaseModel):
    engine: Annotated[str, AfterValidator(InterfaceCreateEngine.only_lower)]


class SetConfiguration(InterfaceCommunicationModel):
    @staticmethod
    def delay_checker(days: int):
        if not (2 <= days <= 10000):
            raise PydanticCustomError("invalid auto_delete_days",
                                      "auto_delete_days mush be greater or equal to 2 and less or equal to 10000")
        return days

    keep_original_log: Annotated[bool, Field()]
    auto_delete_days: Annotated[int, AfterValidator(delay_checker)]


class SupportedQuery(InterfaceCommunicationModel):
    @staticmethod
    def percent_checker(input_string):
        # Check if the string contains '%'
        if '%' in input_string:
            return True
        else:
            return False

    @staticmethod
    def date_validator(date: str):
        date = InterfaceCreateEngine.strip(date)
        try:
            datetime.strptime(date, "%d %B %Y")
            return date
        except Exception as e:
            raise PydanticCustomError('invalid_date', f"invalid date format, {e}")

    client: Annotated[str, InterfaceCreateEngine.only_lower]
    date: Annotated[str, AfterValidator(date_validator)]


class QueryCount(SupportedQuery):

    @staticmethod
    def validate_conditions(conditions: dict):
        _temp = {}
        if len(conditions.keys()) == 0:
            raise PydanticCustomError('empty condition',
                                      f"condition cant be empty")
        for key in conditions:
            _key = InterfaceCreateEngine.strip(key)
            _temp[_key] = conditions[key]
            if SupportedQuery.percent_checker(conditions[key]):
                raise PydanticCustomError('invalid_value',
                                          f"query value can not have %")
        return _temp

    conditions: Annotated[dict[str, str], AfterValidator(validate_conditions)]


class DBQuery(QueryCount):
    starting: Annotated[int, Field(None, gt=-1)]
    limit: Annotated[int, Field(None, gt=0, le=100)]


class TimeZone(BaseModel):
    @staticmethod
    def timezone_validator(zone: str):
        zone = InterfaceCreateEngine.strip(zone)
        if zone not in list(pytz.common_timezones):
            raise PydanticCustomError('invalid timezone',
                                      f"zone is invalid")
        return zone

    zone: Annotated[str, AfterValidator(timezone_validator)]


class DownloadEncoder(SupportedQuery):
    conditions: Optional[dict[str, str]] = None

    @field_validator("conditions")
    @classmethod
    def validator(cls, value):
        return QueryCount.validate_conditions(value)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "port": 0,
                    "client": "string",
                    "date": "string",
                    "conditions": "note: it is optional, if not given, will return token for full database, else for "
                                  "given condition. conditions must be inside a dictionary"
                }
            ]
        }
    }


class Base(DeclarativeBase):
    def __getitem__(self, key):
        return getattr(self, key)

    def __setitem__(self, key, value):
        setattr(self, key, value)

    def get_dict(self):
        result = {}
        for column in self.__table__.columns:
            column_name = column.name
            column_value = getattr(self, column_name)
            result[column_name] = column_value
        return result


class UserOrm(Base):
    __tablename__ = 'web_interface_users'
    user_name: Mapped[str] = mapped_column(nullable=False)
    phone_number: Mapped[str] = mapped_column(nullable=False, primary_key=True, unique=True)
    password: Mapped[str] = mapped_column(nullable=False)
    is_admin: Mapped[bool] = mapped_column(nullable=False)

    def __repr__(self):
        return f"(username: {self.user_name}, phone_number: {self.phone_number}, is_admin: {self.is_admin})"
