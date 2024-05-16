{ pkgs }: {
  deps = [
   pkgs.unzipNLS
   pkgs.zip
    pkgs.chromium
    pkgs.nodejs
    pkgs.xvfb-run
    pkgs.dwm
    pkgs.st
    pkgs.maim
    pkgs.surf
    pkgs.conky
  ];
}