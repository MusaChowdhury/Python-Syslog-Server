#!/bin/bash

# Check if running with sudo
if [ "$(id -u)" -ne 0 ]; then
    echo "uninstall script must be run with sudo or as root. exiting."
    exit 1
fi

destination_path="/home/$SUDO_USER/fast_logger"

rm -rf "/home/$SUDO_USER/fast_logger"
rm -f "/etc/systemd/system/fast_logger_start.service"

sudo sed -i '/timedatectl set-timezone/d' /etc/sudoers
sudo sed -i '/timedatectl set-ntp true/d' /etc/sudoers
sudo sed -i '/\/sbin\/reboot -f/d' /etc/sudoers
sudo mv /etc/nginx/old-sites-configs/sites-available/* /etc/nginx/sites-available
sudo mv /etc/nginx/old-sites-configs/sites-enabled/* /etc/nginx/sites-enabled
sudo rm /etc/nginx/sites-enabled/fastlogger.conf
sudo rm /etc/nginx/sites-available/fastlogger.conf
sudo rm -rv /etc/nginx/old-sites-configs
sudo systemctl restart nginx
read -p "press enter to exit, system will reboot"
sudo reboot -f
