#!/usr/bin/env bash
# Puts ไฟรักไม่มอด on the VM (ssh alias cpxsim) at https://fairak.cpxsim.online, the same way
# staff.cpxsim.online and schedule.cpxsim.online are put there, but as a stack of its own.
#
#   bash deploy/deploy-vm.sh
#   TUNNEL_TOKEN=eyJ... bash deploy/deploy-vm.sh     # first time, or a new token
#
# Wholly apart from CPX prod, ARMY-INTEL, Coding Adventure and exec-scheduler: own folder
# (/opt/fai-rak), project (fai-rak-prod), containers (fai-rak-web, fai-rak-tunnel), loopback
# port 8093 and its own Cloudflare tunnel "fai-rak". That tunnel's route
# fairak.cpxsim.online -> http://fai-rak:80 is set in the Cloudflare dashboard; its token lives
# only on the VM in /opt/fai-rak/tunnel.env (kept between deploys).
#
# Only committed files are sent, so commit first.
set -euo pipefail

VM_HOST="${VM_HOST:-cpxsim}"
APP_DIR=/opt/fai-rak
PUBLIC_URL="${PUBLIC_URL:-https://fairak.cpxsim.online}"
COMPOSE="sudo docker compose -f docker-compose.vm.yml"

SSH=ssh
[ -x /c/Windows/System32/OpenSSH/ssh.exe ] && SSH=/c/Windows/System32/OpenSSH/ssh.exe
vm() { "$SSH" -o BatchMode=yes -o ConnectTimeout=10 "$VM_HOST" "$@"; }

cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
REV=$(git rev-parse --short HEAD)
echo "== Deploying $REV: $(git log -1 --format=%s)"
[ -z "$(git status --porcelain --untracked-files=no)" ] || echo "   Note: uncommitted changes are not sent; only $REV is."

TARBALL=$(mktemp)
trap 'rm -f "$TARBALL"' EXIT
# The site files go in site/, the compose file and nginx.conf next to it.
git archive --format=tar --prefix=site/ HEAD -- index.html cards.json bonus.json sw.js manifest.webmanifest icon.svg icon-180.png icon-192.png icon-512.png icon-maskable-512.png > "$TARBALL"

echo "== Checking the VM"
vm true || { echo "Cannot reach $VM_HOST. If the key needs its passphrase, run: ssh-add ~/.ssh/id_ed25519" >&2; exit 1; }
vm "sudo mkdir -p $APP_DIR && sudo chown \$(id -u):\$(id -g) $APP_DIR"
if [ -n "${TUNNEL_TOKEN:-}" ]; then
  echo "== Saving the tunnel token on the VM"
  printf 'TUNNEL_TOKEN=%s\n' "$TUNNEL_TOKEN" | vm "umask 077 && cat > $APP_DIR/tunnel.env"
fi
vm "test -s $APP_DIR/tunnel.env" || {
  echo "No tunnel token on the VM yet. Run: TUNNEL_TOKEN=<token of the tunnel fai-rak> bash deploy/deploy-vm.sh" >&2
  exit 1
}
echo "   Running now: $(vm "cat $APP_DIR/REVISION 2>/dev/null || echo nothing")"

echo "== Copying $REV"
# Same folder every time (nginx bind-mounts it), so empty it and unpack in place.
vm "mkdir -p $APP_DIR/site && find $APP_DIR/site -mindepth 1 -delete && tar xf - -C $APP_DIR/site --strip-components=1 && chmod -R a+rX $APP_DIR/site" < "$TARBALL"
vm "cat > $APP_DIR/docker-compose.vm.yml" < deploy/vm/docker-compose.vm.yml
vm "cat > $APP_DIR/nginx.conf" < deploy/vm/nginx.conf
vm "echo $REV > $APP_DIR/REVISION"

echo "== Starting"
vm "cd $APP_DIR && $COMPOSE up -d --remove-orphans 2>&1 | tail -4 && sudo docker exec fai-rak-web nginx -s reload >/dev/null 2>&1 || true"

echo "== Checking"
vm "for i in \$(seq 1 20); do curl -fs -o /dev/null http://127.0.0.1:8093/manifest.webmanifest && echo '   VM 200' && exit 0; sleep 1; done; echo '   VM FAILED'; sudo docker logs --tail 30 fai-rak-web; exit 1"
vm "for i in \$(seq 1 15); do sudo docker logs fai-rak-tunnel 2>&1 | grep -q 'Registered tunnel connection' && echo '   Own tunnel connected' && exit 0; sleep 2; done; echo '   Own tunnel NOT connected:'; sudo docker logs --tail 15 fai-rak-tunnel; exit 1" || true
code=$(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL/manifest.webmanifest" || true)
echo "   Public $code"
[ "$code" = 200 ] || echo "   (Not 200: on the tunnel fai-rak add the public hostname ${PUBLIC_URL#https://} -> http://fai-rak:80. If it was just added, it may also be your own DNS cache.)"
echo "== Done: $REV is on the VM"
