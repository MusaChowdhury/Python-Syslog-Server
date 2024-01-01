from typing import List

from sqlalchemy import ForeignKey
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship


class Base(DeclarativeBase):
    pass


class Engine(Base):
    __tablename__ = "engines"
    name: Mapped[str] = mapped_column(unique=True, primary_key=True)
    configs: Mapped[str] = mapped_column()
    class_type: Mapped[str] = mapped_column()
    clients: Mapped[List["Client"]] = relationship(cascade="all, delete-orphan")

    def __str__(self):
        return f"(name: {self.name}, configs: {self.configs}, clients: {self.clients})"

    def __repr__(self):
        return f"(name: {self.name}, configs: {self.configs}, clients: {self.clients})"


class Client(Base):
    __tablename__ = "clients"
    _id: Mapped[int] = mapped_column(unique=True, primary_key=True, autoincrement="auto")
    engine: Mapped[str] = mapped_column(ForeignKey("engines.name"))
    name: Mapped[str] = mapped_column()
    ip: Mapped[str] = mapped_column()

    def __str__(self):
        return f"(name: {self.name}, ip: {self.ip}, engine: {self.engine})"

    def __repr__(self):
        return f"(name: {self.name}, ip: {self.ip}, engine: {self.engine})"
