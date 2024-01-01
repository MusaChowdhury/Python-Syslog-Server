import uvicorn

from configuration import (ENGINE_CLASSES, INTERFACE_FACTORY_PORT, ROOT_SAVED_DATA_DIRECTORY, FAST_API_SERVER_PORT,
                           AUTO_DELETE_DAYS, SPACE_PERCENTAGE_TO_STOP)
from interfaces.factory import InterfaceFactory

if __name__ == "__main__":
    InterfaceFactory(AUTO_DELETE_DAYS, SPACE_PERCENTAGE_TO_STOP, INTERFACE_FACTORY_PORT, ROOT_SAVED_DATA_DIRECTORY,
                     ENGINE_CLASSES)
    uvicorn.run("fast_api.fast_api_app:fast_api_app", host="127.0.0.1", port=FAST_API_SERVER_PORT, reload=True)
