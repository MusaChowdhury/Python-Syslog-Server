import json
import random
import socket
import string

CONFIGURATION_FILE_PATH = "../GLOBAL_CONFIG.JSON"
AUTO_CONFIGURATION_FILE_PATH = "../AUTO_CONFIG.JSON"
MODE_FILE_PATH = "../MODE.JSON"


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("0.0.0.1", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except (socket.error, socket.herror, socket.gaierror, socket.timeout):
        return "0.0.0.0"


with open(CONFIGURATION_FILE_PATH, "r") as configs_json:
    server_config = json.load(configs_json)

with open(AUTO_CONFIGURATION_FILE_PATH, "r") as configs_json:
    auto_config = json.load(configs_json)

with open(MODE_FILE_PATH, "r") as configs_json:
    mode = json.load(configs_json)
    DEVELOPMENT = mode["DEVELOPMENT"]


# note: it is only intended for initial starting up
if (not auto_config.get("FAST_API_AUTH_SALT_WILL_AUTO_GENERATE") or
        len(auto_config["FAST_API_AUTH_SALT_WILL_AUTO_GENERATE"]) < 64):
    random_salt = ''.join(random.choices(string.ascii_letters + string.digits, k=64))
    auto_config["FAST_API_AUTH_SALT_WILL_AUTO_GENERATE"] = random_salt
# note: it is only intended for initial starting up

# note: it is intended for every start up
with open(AUTO_CONFIGURATION_FILE_PATH, "w") as updated_auto_config_file:
    auto_config["FAST_API_SERVER_IP_WILL_AUTO_GENERATE"] = get_local_ip()
    json.dump(auto_config, updated_auto_config_file, indent=4)
# note: it is intended for every start up

# auto configurations
FAST_API_SERVER_IP_WILL_AUTO_GENERATE = auto_config["FAST_API_SERVER_IP_WILL_AUTO_GENERATE"]
FAST_API_AUTH_SALT_WILL_AUTO_GENERATE = auto_config["FAST_API_AUTH_SALT_WILL_AUTO_GENERATE"]
# auto configurations


# reconstructed configurations
FAST_API_ALLOWED_ORIGIN = server_config["FAST_API_ALLOWED_ORIGIN"]
ROOT_SAVED_DATA_DIRECTORY = server_config["ROOT_SAVED_DATA_DIRECTORY"]
FAST_API_SERVER_PORT = server_config["FAST_API_SERVER_PORT"] if not DEVELOPMENT else 2000
INTERFACE_FACTORY_PORT = server_config["INTERFACE_FACTORY_PORT"] if not DEVELOPMENT else 2100
TOKEN_EXPIRATION = server_config["TOKEN_EXPIRATION"]
DOWNLOAD_TOKEN_EXPIRATION = server_config["DOWNLOAD_TOKEN_EXPIRATION"]
AUTO_DELETE_DAYS = server_config["AUTO_DELETE_DAYS"]
SPACE_PERCENTAGE_TO_STOP = server_config["SPACE_PERCENTAGE_TO_STOP"]
ENGINE_CLASSES = server_config["ENGINE_CLASSES"]
# reconstructed configurations
