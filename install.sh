#!/bin/bash

# Check if running with sudo
if [ "$(id -u)" -ne 0 ]; then
    echo "install script must be run with sudo or as root. exiting."
    exit 1
fi


destination_path="/home/$SUDO_USER/fast_logger"
node_v="20"

sudo -u $SUDO_USER mkdir -p "$destination_path"

sudo -u $SUDO_USER cp -r "./backend" "$destination_path"
sudo -u $SUDO_USER cp -r "./frontend" "$destination_path"
sudo -u $SUDO_USER cp -r "GLOBAL_CONFIG.JSON" "$destination_path"
sudo -u $SUDO_USER cp -r "AUTO_CONFIG.JSON" "$destination_path"

# dependencies and venv

packages=(
  python3-dev
  python3-venv
  build-essential
)

sudo apt update
sudo apt install -y "${packages[@]}"

#python/backend
python3 -m venv "$destination_path/backend/.venv"
source "$destination_path/backend/.venv/bin/activate"
pip install -r "$destination_path/backend/requirements.txt"
deactivate
#python/backend

#node/frontend
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
sudo rm /etc/apt/keyrings/nodesource.gpg
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$node_v.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt update
sudo apt install nodejs -y
npm --prefix "$destination_path/frontend" install
npm --prefix "$destination_path/frontend" run build
#node/frontend

# dependencies and venv

#run script
echo -e "#!/bin/bash\nsource \"$destination_path/backend/.venv/bin/activate\"\ncd \"\$(dirname \"\${BASH_SOURCE[0]}\")/backend\" || exit 1\npython3 ./server.py &\nsleep 10\ncd ../frontend || exit 1\nnpm run start\ndeactivate" > "$destination_path/start.sh"
chmod +x "$destination_path/start.sh"
#run script

# run on boot and allow timedatectl free from passwords
USERNAME=$(logname)

echo "$USERNAME ALL=(ALL:ALL) NOPASSWD: /usr/bin/timedatectl set-timezone *" | sudo bash -c "cat >> /etc/sudoers"
echo "$USERNAME ALL=(ALL:ALL) NOPASSWD: /usr/bin/timedatectl set-ntp true" | sudo bash -c "cat >> /etc/sudoers"
echo "$USERNAME ALL=(ALL:ALL) NOPASSWD: /sbin/reboot -f" | sudo bash -c "cat >> /etc/sudoers"

cat <<EOL > "/etc/systemd/system/fast_logger_start.service"
[Unit]
Description=Fast Logger Start Script
After=multi-user.target

[Service]
Type=simple
ExecStart="$destination_path/start.sh"

[Install]
WantedBy=multi-user.target
EOL

chmod 644 "/etc/systemd/system/fast_logger_start.service"

systemctl daemon-reload
systemctl enable fast_logger_start.service

# run on boot and allow timedatectl free from passwords

# production mode
echo '{"DEVELOPMENT": true}' > "$destination_path/MODE.JSON"
# production mode

## nginx
sudo apt-get install nginx

sudo mkdir -p /etc/nginx/old-sites-configs/sites-available/
sudo mkdir -p /etc/nginx/old-sites-configs/sites-enabled/

sudo mv /etc/nginx/sites-available/* /etc/nginx/old-sites-configs/sites-available/
sudo mv /etc/nginx/sites-enabled/* /etc/nginx/old-sites-configs/sites-enabled/

conf_path="/etc/nginx/sites-available/fastlogger.conf"

ssl_certificates_path="$destination_path/ssl"

if [ ! -d "$ssl_certificates_path" ]; then
    sudo -u "$USER" mkdir -p "$ssl_certificates_path"
fi

fastlogger_config="
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    ssl_certificate $ssl_certificates_path/nginx.crt;
    ssl_certificate_key $ssl_certificates_path/nginx.key;

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Origin http://127.0.0.1:3200;
    }

    location /download {
        proxy_pass http://127.0.0.1:3000/download;
        proxy_http_version 1.1;
    }

    location /realtime {
        proxy_pass http://127.0.0.1:3000/realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
"

echo -e "$fastlogger_config" | sudo dd of="$conf_path"
sudo ln -s "$conf_path" "/etc/nginx/sites-enabled/"
#self signed cert
sudo openssl genpkey -algorithm RSA -out $ssl_certificates_path/nginx.key
sudo openssl req -x509 -key $ssl_certificates_path/nginx.key -out $ssl_certificates_path/nginx.crt -days 365 -subj "/CN=fastlogger.app"
#self signed cert
sudo systemctl restart nginx
## ngnix





echo "installed at $destination_path"
read -p "press enter to exit, system will reboot"
sudo reboot -f



