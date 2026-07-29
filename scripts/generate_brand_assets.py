"""Generate GeoBov splash + launcher assets from master PNGs."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Users\vitor\faculdade\lab_inovacao3\houseagro")
MARK_SRC = Path(
    r"C:\Users\vitor\.cursor\projects\c-Users-vitor-faculdade-lab-inovacao3-houseagro\assets\geobov-mark-1024.png"
)
SPLASH_SRC = Path(
    r"C:\Users\vitor\.cursor\projects\c-Users-vitor-faculdade-lab-inovacao3-houseagro\assets\geobov-splash-logo.png"
)

BRAND = ROOT / "brand"
ANDROID_RES = ROOT / "App_Resources" / "Android" / "src" / "main" / "res"
IOS_ICON = (
    ROOT
    / "App_Resources"
    / "iOS"
    / "Assets.xcassets"
    / "AppIcon.appiconset"
    / "icon-1024.png"
)
ASSETS = ROOT / "src" / "assets"

NAVY = (0x19, 0x33, 0x6C, 255)
NAVY_RGB = (0x19, 0x33, 0x6C)

# Splash backgrounds (existing template sizes)
BACKGROUNDS = {
    "drawable-ldpi": (270, 444),
    "drawable-mdpi": (360, 592),
    "drawable-hdpi": (540, 888),
    "drawable-xhdpi": (720, 1184),
    "drawable-xxhdpi": (1080, 1776),
    "drawable-xxxhdpi": (1440, 2368),
}

# Splash logos — wider+taller than NS template so pin+wordmark stays sharp
LOGOS = {
    "drawable-ldpi": (180, 100),
    "drawable-mdpi": (240, 134),
    "drawable-hdpi": (360, 200),
    "drawable-xhdpi": (480, 268),
    "drawable-xxhdpi": (720, 400),
    "drawable-xxxhdpi": (960, 536),
}

LAUNCHERS = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def near_navy(r: int, g: int, b: int) -> bool:
    # Treat near-navy pixels as transparent for adaptive foreground.
    return abs(r - 0x19) < 40 and abs(g - 0x33) < 40 and abs(b - 0x6C) < 55


def make_transparent_mark(mark: Image.Image) -> Image.Image:
    rgba = mark.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if near_navy(r, g, b):
                pixels[x, y] = (r, g, b, 0)
    return rgba


def fit_contain(
    src: Image.Image, size: tuple[int, int], bg: tuple[int, int, int, int] | None
) -> Image.Image:
    tw, th = size
    fitted = src.copy()
    fitted.thumbnail((tw, th), Image.Resampling.LANCZOS)
    if bg is None:
        canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    else:
        canvas = Image.new("RGBA", (tw, th), bg)
    x = (tw - fitted.width) // 2
    y = (th - fitted.height) // 2
    if fitted.mode != "RGBA":
        fitted = fitted.convert("RGBA")
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def solid(size: tuple[int, int], color: tuple[int, int, int]) -> Image.Image:
    return Image.new("RGB", size, color)


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)

    mark = Image.open(MARK_SRC).convert("RGBA")
    splash = Image.open(SPLASH_SRC).convert("RGBA")

    mark_path = BRAND / "geobov-mark-1024.png"
    splash_path = BRAND / "geobov-splash-logo.png"
    shutil.copy2(MARK_SRC, mark_path)
    shutil.copy2(SPLASH_SRC, splash_path)

    # Crop splash horizontally to content-ish margins optional: use full image on navy.
    splash_on_navy = fit_contain(splash, splash.size, NAVY)

    # Transparent mark for adaptive foreground (safe ~66%)
    transparent = make_transparent_mark(mark)
    fg_master = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    inner = transparent.copy()
    inner.thumbnail((680, 680), Image.Resampling.LANCZOS)
    fg_master.paste(
        inner,
        ((1024 - inner.width) // 2, (1024 - inner.height) // 2),
        inner,
    )
    fg_path = BRAND / "geobov-foreground-1024.png"
    fg_master.save(fg_path, "PNG")

    # Splash backgrounds + logos
    for folder, size in BACKGROUNDS.items():
        out = ANDROID_RES / folder / "background.png"
        solid(size, NAVY_RGB).save(out, "PNG")
        print(f"wrote {out.relative_to(ROOT)} {size}")

    for folder, size in LOGOS.items():
        out = ANDROID_RES / folder / "logo.png"
        # Navy canvas so edges blend with splash background
        fit_contain(splash, size, NAVY).convert("RGB").save(out, "PNG")
        print(f"wrote {out.relative_to(ROOT)} {size}")

    # Legacy launcher icons (full mark with navy)
    for folder, px in LAUNCHERS.items():
        out = ANDROID_RES / folder / "ic_launcher.png"
        fit_contain(mark, (px, px), NAVY).convert("RGB").save(out, "PNG")
        print(f"wrote {out.relative_to(ROOT)} {px}x{px}")

    # Adaptive foreground PNG (drawable)
    drawable = ANDROID_RES / "drawable"
    fg_out = drawable / "ic_launcher_foreground.png"
    fit_contain(fg_master, (432, 432), None).save(fg_out, "PNG")
    print(f"wrote {fg_out.relative_to(ROOT)}")

    # Remove old vector foreground if present — XML will point to PNG
    old_xml = drawable / "ic_launcher_foreground.xml"
    if old_xml.exists():
        old_xml.unlink()
        print(f"removed {old_xml.relative_to(ROOT)}")

    # iOS
    fit_contain(mark, (1024, 1024), NAVY).convert("RGB").save(IOS_ICON, "PNG")
    print(f"wrote {IOS_ICON.relative_to(ROOT)}")

    # In-app assets
    signin_logo = ASSETS / "geobov-logo.png"
    fit_contain(splash, (640, 360), NAVY).convert("RGB").save(signin_logo, "PNG")
    print(f"wrote {signin_logo.relative_to(ROOT)}")

    mark_asset = ASSETS / "geobov-mark.png"
    fit_contain(mark, (512, 512), NAVY).convert("RGB").save(mark_asset, "PNG")
    print(f"wrote {mark_asset.relative_to(ROOT)}")

    print("done")


if __name__ == "__main__":
    main()
