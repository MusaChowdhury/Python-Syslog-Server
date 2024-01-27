import random
import socket
import string
import time


def udp_test_client(port: int, delay: float = 0.0001, host: str = "127.0.0.1", ):
    def random_log():
        def random_ip():
            ip = ".".join(str(random.randint(0, 255)) for _ in range(4))
            return ip

        def random_name():
            name_length = random.randint(6, 10)
            letters_and_numbers = string.ascii_letters + string.digits
            _random_name = ''.join(random.choice(letters_and_numbers) for _ in range(name_length))
            return _random_name

        def random_number():
            _random_number = random.randint(100, 999)
            return _random_number

        def random_port():
            return random.randint(1024, 49151)

        dummy_string = f'''<{random_number()}> 00:00:00 {random_name()} prerouting: in:<pppoe-{random_name()}> out:(unknown 0), connection-state:established,snat proto TCP (ACK,FIN,PSH), {random_ip()}:{random_port()}->{random_ip()}:{random_port()}, NAT ({random_ip()}:{random_port()}->{random_ip()}:{random_port()})->{random_ip()}:{random_port()}, len {random_number()}'''
        return dummy_string.encode("utf-8")

    server_address = (host, port)
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        count = 0
        previous = 0
        while True:
            if delay > 0:
                client_socket.sendto(random_log(), server_address)
                time.sleep(delay)
            else:
                client_socket.sendto(
                    "7812wer345 sd erw345 erf zxv dft 34 534 t dsff qa we21 34 23tg sdf va 23".encode("utf-8"),
                    server_address)
            count += 1
            current = time.time()
            if current - previous >= 1:
                print(f"log send per second: {count}")
                count = 0
                previous = current

    except KeyboardInterrupt:
        print("closed test udp client")


if __name__ == "__main__":
    udp_test_client(5200, 0.00001)
