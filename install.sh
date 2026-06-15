#!/usr/bin/env bash
set -uo pipefail

APP_NAME="pdflinux"
DISPLAY_NAME="PDFLinux"
REPO_URL="https://github.com/saaandbite/pdflinux"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[*]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# ── Privilege helper ─────────────────────────────────────────────────────────

HAS_SUDO=false
RUN_AS_ROOT=false

detect_privilege() {
    if [ "$(id -u)" = "0" ]; then
        RUN_AS_ROOT=true
        HAS_SUDO=true
        return
    fi
    if command -v sudo &>/dev/null && sudo -n true 2>/dev/null; then
        HAS_SUDO=true
        return
    fi
    # Try to get sudo interactively (non-fatal)
    if command -v sudo &>/dev/null; then
        if sudo -v 2>/dev/null; then
            HAS_SUDO=true
            # Keep sudo token alive in background
            ( while true; do sudo -v 2>/dev/null; sleep 50; done ) &
            SUDO_KEEPALIVE=$!
            trap "kill \${SUDO_KEEPALIVE:-0} 2>/dev/null; true" EXIT
        fi
    fi
}

# Wrapper: run command with privilege if available, else warn and continue
priv_run() {
    if [ "$RUN_AS_ROOT" = true ]; then
        "$@"
    elif [ "$HAS_SUDO" = true ]; then
        sudo "$@"
    else
        warn "Tidak ada akses sudo. Lewati: $*"
        warn "Jalankan perintah berikut secara manual sebagai root:"
        warn "  $*"
        return 1
    fi
}

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif command -v lsb_release &>/dev/null; then
        lsb_release -si | tr '[:upper:]' '[:lower:]'
    else
        echo "unknown"
    fi
}

detect_pkg_manager() {
    local distro="$1"
    case "$distro" in
        ubuntu|debian|linuxmint|pop|elementary|zorin|kali|raspbian|deepin|mx)
            if command -v apt &>/dev/null; then echo "apt"; else echo "unknown"; fi
            ;;
        fedora|rhel|centos|rocky|almalinux|ol|amzn)
            if command -v dnf &>/dev/null; then echo "dnf"
            elif command -v yum &>/dev/null; then echo "yum"
            else echo "unknown"
            fi
            ;;
        arch|manjaro|endeavouros|garuda|artix)
            if command -v pacman &>/dev/null; then echo "pacman"; else echo "unknown"; fi
            ;;
        opensuse*|sles|suse)
            if command -v zypper &>/dev/null; then echo "zypper"; else echo "unknown"; fi
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

try_download_prebuilt() {
    local pm="$1"
    local type
    case "$pm" in
        apt)         type="deb" ;;
        dnf|yum)     type="rpm" ;;
        pacman|zypper|*) type="appimage" ;;
    esac

    local version
    version=$(node -pe "require('./package.json').version" 2>/dev/null) || return 1
    [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || return 1

    local filename
    case "$type" in
        deb)      filename="pdflinux_${version}_amd64.deb" ;;
        rpm)      filename="pdflinux_${version}_x86_64.rpm" ;;
        appimage) filename="pdflinux_${version}_amd64.AppImage" ;;
    esac

    local url="https://github.com/saaandbite/pdflinux/releases/download/v${version}/${filename}"
    local dest="/tmp/${filename}"

    info "Checking for pre-built binary v${version}..."
    if curl -fsSL --max-time 30 -o "$dest" "$url" 2>/dev/null; then
        success "Downloaded pre-built binary: ${filename}"
        echo "$dest:$type"
        return 0
    else
        warn "No pre-built release found. Building from source instead..."
        return 1
    fi
}

install_system_deps() {
    local pm="$1"
    info "Installing PDF tools (Ghostscript, Poppler, QPDF, Tesseract)..."

    local DEPS_FAILED=false
    case "$pm" in
        apt)
            priv_run apt-get update -qq || DEPS_FAILED=true
            priv_run apt-get install -y \
                ghostscript poppler-utils qpdf tesseract-ocr \
                libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev \
                librsvg2-dev pkg-config build-essential curl wget || DEPS_FAILED=true
            ;;
        dnf)
            priv_run dnf install -y \
                ghostscript poppler-utils qpdf tesseract \
                webkit2gtk4.1-devel openssl-devel librsvg2-devel \
                pkg-config gcc curl wget || DEPS_FAILED=true
            ;;
        yum)
            priv_run yum install -y \
                ghostscript poppler-utils qpdf tesseract \
                webkit2gtk3-devel openssl-devel librsvg2-devel \
                pkgconfig gcc curl wget || DEPS_FAILED=true
            ;;
        pacman)
            priv_run pacman -Sy --noconfirm \
                ghostscript poppler qpdf tesseract \
                webkit2gtk-4.1 openssl librsvg pkg-config base-devel curl wget || DEPS_FAILED=true
            ;;
        zypper)
            priv_run zypper install -y \
                ghostscript poppler-tools qpdf tesseract-ocr \
                webkit2gtk3-devel libopenssl-devel librsvg-devel \
                pkg-config gcc curl wget || DEPS_FAILED=true
            ;;
        *)
            warn "Package manager not recognized."
            DEPS_FAILED=true
            ;;
    esac

    if [ "$DEPS_FAILED" = true ]; then
        warn "Could not auto-install system deps. Please install manually:"
        warn "  ghostscript poppler-utils qpdf tesseract-ocr"
    else
        success "System dependencies installed."
    fi
}

install_rust() {
    if command -v rustup &>/dev/null && rustup show active-toolchain &>/dev/null; then
        success "Rust already installed: $(rustc --version)"
        return
    fi
    info "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    export PATH="$HOME/.cargo/bin:$PATH"
    success "Rust installed: $(rustc --version)"
}

install_node() {
    if command -v node &>/dev/null; then
        success "Node.js already installed: $(node --version)"
        return
    fi
    info "Installing Node.js via NodeSource..."
    local pm="$1"
    case "$pm" in
        apt)
            curl -fsSL https://deb.nodesource.com/setup_lts.x | priv_run bash -
            priv_run apt-get install -y nodejs
            ;;
        dnf|yum)
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | priv_run bash -
            priv_run "$pm" install -y nodejs
            ;;
        pacman)
            priv_run pacman -Sy --noconfirm nodejs npm
            ;;
        zypper)
            priv_run zypper install -y nodejs npm
            ;;
        *)
            error "Please install Node.js LTS manually from https://nodejs.org/ then run this script again."
            ;;
    esac
    success "Node.js installed: $(node --version)"
}

build_app() {
    local pm="$1"
    local bundle_target

    case "$pm" in
        apt)    bundle_target="deb" ;;
        dnf|yum) bundle_target="rpm" ;;
        pacman) bundle_target="appimage" ;;
        zypper) bundle_target="rpm" ;;
        *)      bundle_target="appimage" ;;
    esac

    info "Installing npm dependencies..."
    npm install

    info "Building application — bundle target: $bundle_target (this may take a few minutes the first time)..."
    export PATH="$HOME/.cargo/bin:$PATH"
    npx tauri build --bundles "$bundle_target"

    success "Build complete."
}

install_prebuilt_deb() {
    local path="$1"
    info "Installing pdflinux from .deb package..."

    # Try dpkg with privilege first
    if priv_run dpkg -i "$path" 2>/dev/null; then
        success "$DISPLAY_NAME installed successfully."
        return 0
    fi

    # No sudo available — try user-level extraction fallback
    warn "No sudo access. Attempting user-level installation..."
    local install_dir="$HOME/.local/bin"
    local tmp_extract="$HOME/.local/tmp_deb_extract"
    mkdir -p "$install_dir" "$tmp_extract"

    if command -v dpkg-deb &>/dev/null; then
        dpkg-deb -x "$path" "$tmp_extract"
        if [ -f "$tmp_extract/usr/bin/pdflinux" ]; then
            cp "$tmp_extract/usr/bin/pdflinux" "$install_dir/pdflinux"
            chmod +x "$install_dir/pdflinux"
            rm -rf "$tmp_extract"
            # Ensure ~/.local/bin is on PATH
            _ensure_path_in_shell "$install_dir"
            success "$DISPLAY_NAME installed to $install_dir/pdflinux (no-sudo fallback)"
            return 0
        fi
        rm -rf "$tmp_extract"
    fi

    warn "Could not install $DISPLAY_NAME automatically."
    warn "Please ask your system administrator to run:"
    warn "  sudo dpkg -i $path"
    return 1
}

install_prebuilt_rpm() {
    local path="$1"
    info "Installing pdflinux from .rpm package..."
    if command -v dnf &>/dev/null; then
        priv_run dnf install -y "$path" || {
            warn "Please ask admin to run: sudo dnf install -y $path"
        }
    else
        priv_run yum install -y "$path" || {
            warn "Please ask admin to run: sudo yum install -y $path"
        }
    fi
}

install_prebuilt_appimage() {
    local path="$1"
    info "Installing AppImage..."
    local install_dir="$HOME/.local/bin"
    mkdir -p "$install_dir"
    cp "$path" "$install_dir/$APP_NAME"
    chmod +x "$install_dir/$APP_NAME"
    _ensure_path_in_shell "$install_dir"
    install_desktop_file "$install_dir/$APP_NAME"
    success "$DISPLAY_NAME installed to $install_dir/$APP_NAME"
}

_ensure_path_in_shell() {
    local dir="$1"
    local shell_rc=""
    case "$SHELL" in
        */bash) shell_rc="$HOME/.bashrc" ;;
        */zsh)  shell_rc="$HOME/.zshrc" ;;
        */fish) shell_rc="$HOME/.config/fish/config.fish" ;;
    esac
    if [ -n "$shell_rc" ] && ! grep -q "$dir" "$shell_rc" 2>/dev/null; then
        echo "export PATH=\"$dir:\$PATH\"" >> "$shell_rc"
        warn "PATH updated in $shell_rc. Run: source $shell_rc"
    fi
}

install_package() {
    local pm="$1"
    local bundle_dir="src-tauri/target/release/bundle"

    case "$pm" in
        apt)
            local deb
            deb=$(find "$bundle_dir/deb" -name "*.deb" 2>/dev/null | head -1)
            if [ -n "$deb" ]; then
                install_prebuilt_deb "$deb"
                return
            fi
            ;;
        dnf|yum)
            local rpm
            rpm=$(find "$bundle_dir/rpm" -name "*.rpm" 2>/dev/null | head -1)
            if [ -n "$rpm" ]; then
                install_prebuilt_rpm "$rpm"
                return
            fi
            ;;
        pacman)
            ;;
    esac

    # Fallback to AppImage
    local appimage
    appimage=$(find "$bundle_dir/appimage" -name "*.AppImage" 2>/dev/null | head -1)
    if [ -n "$appimage" ]; then
        install_prebuilt_appimage "$appimage"
        return
    fi

    error "No installer found in $bundle_dir"
}

install_desktop_file() {
    local exec_path="$1"
    local desktop_dir="$HOME/.local/share/applications"
    local icon_src="src-tauri/icons/128x128.png"
    local icon_dest="$HOME/.local/share/icons/hicolor/128x128/apps/$APP_NAME.png"

    mkdir -p "$desktop_dir" "$(dirname "$icon_dest")"

    if [ -f "$icon_src" ]; then
        cp "$icon_src" "$icon_dest"
    fi

    cat > "$desktop_dir/$APP_NAME.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=PDFLinux
Comment=Privacy-first PDF tools for Linux — runs 100% offline
Exec=$exec_path
Icon=$APP_NAME
Categories=Office;Utility;
StartupNotify=true
Terminal=false
EOF

    if command -v update-desktop-database &>/dev/null; then
        update-desktop-database "$desktop_dir" &>/dev/null || true
    fi
    if command -v gtk-update-icon-cache &>/dev/null; then
        gtk-update-icon-cache -f "$HOME/.local/share/icons/hicolor" &>/dev/null || true
    fi
    success "Application menu shortcut added."
}

# ── Main ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}╔══════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PDFLinux — Installer           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DISTRO=$(detect_distro)
PKG_MANAGER=$(detect_pkg_manager "$DISTRO")

info "Detected distro: $DISTRO (package manager: $PKG_MANAGER)"

if [ "$PKG_MANAGER" = "unknown" ]; then
    error "Could not detect a supported package manager for distro '$DISTRO'. Supported: apt, dnf, yum, pacman, zypper."
fi

# Detect privilege level (non-fatal)
detect_privilege

if [ "$HAS_SUDO" = false ] && [ "$RUN_AS_ROOT" = false ]; then
    warn "No sudo/root access detected."
    warn "System-level installation will be skipped."
    warn "If installation fails, ask your admin to run this script with sudo."
    echo ""
fi

# Try downloading a pre-built binary first (fast path)
prebuilt_result=""
if prebuilt_result=$(try_download_prebuilt "$PKG_MANAGER"); then
    prebuilt_path="${prebuilt_result%%:*}"
    prebuilt_type="${prebuilt_result##*:}"

    install_system_deps "$PKG_MANAGER"

    info "Installing $DISPLAY_NAME..."
    case "$prebuilt_type" in
        deb)
            install_prebuilt_deb "$prebuilt_path"
            ;;
        rpm)
            install_prebuilt_rpm "$prebuilt_path"
            ;;
        appimage)
            install_prebuilt_appimage "$prebuilt_path"
            ;;
    esac
else
    # Fall back to building from source
    install_system_deps "$PKG_MANAGER"
    install_rust
    install_node "$PKG_MANAGER"
    build_app "$PKG_MANAGER"
    install_package "$PKG_MANAGER"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ PDFLinux installed successfully!                 ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   • Launch from app menu: search for \"PDFLinux\"      ║${NC}"
echo -e "${GREEN}║   • Or run from terminal: pdflinux                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
