#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pdflinux"
DISPLAY_NAME="PDFLinux"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[*]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

detect_pkg_manager() {
    local distro="$1"
    case "$distro" in
        ubuntu|debian|linuxmint|pop|elementary|zorin|kali|raspbian|deepin|mx)
            command -v apt &>/dev/null && echo "apt" || echo "unknown"
            ;;
        fedora|rhel|centos|rocky|almalinux|ol|amzn)
            if command -v dnf &>/dev/null; then echo "dnf"
            elif command -v yum &>/dev/null; then echo "yum"
            else echo "unknown"
            fi
            ;;
        arch|manjaro|endeavouros|garuda|artix)
            command -v pacman &>/dev/null && echo "pacman" || echo "unknown"
            ;;
        opensuse*|sles|suse)
            command -v zypper &>/dev/null && echo "zypper" || echo "unknown"
            ;;
        *)
            if command -v dnf &>/dev/null; then echo "dnf"
            elif command -v pacman &>/dev/null; then echo "pacman"
            elif command -v zypper &>/dev/null; then echo "zypper"
            elif command -v yum &>/dev/null; then echo "yum"
            elif command -v apt &>/dev/null; then echo "apt"
            else echo "unknown"
            fi
            ;;
    esac
}

PM=$(detect_pkg_manager "$(detect_distro)")

echo ""
echo -e "${RED}╔══════════════════════════════════╗${NC}"
echo -e "${RED}║   PDFLinux — Uninstall           ║${NC}"
echo -e "${RED}╚══════════════════════════════════╝${NC}"
echo ""

# Remove package installed via package manager
case "$PM" in
    apt)
        if dpkg -l "pdflinux" &>/dev/null 2>&1; then
            info "Removing .deb package..."
            sudo apt-get remove -y pdflinux || true
        fi
        ;;
    dnf|yum)
        if rpm -q "pdflinux" &>/dev/null 2>&1; then
            info "Removing .rpm package..."
            sudo "$PM" remove -y pdflinux || true
        fi
        ;;
esac

# Remove AppImage
if [ -f "$HOME/.local/bin/$APP_NAME" ]; then
    info "Removing AppImage..."
    rm -f "$HOME/.local/bin/$APP_NAME"
fi

# Remove .desktop file and icon
info "Removing application menu shortcut..."
rm -f "$HOME/.local/share/applications/$APP_NAME.desktop"
rm -f "$HOME/.local/share/icons/hicolor/128x128/apps/$APP_NAME.png"

if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$HOME/.local/share/applications" &>/dev/null || true
fi

success "$DISPLAY_NAME removed successfully."
echo ""
