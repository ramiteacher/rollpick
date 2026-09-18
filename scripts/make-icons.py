"""PWA/OG 아이콘 생성. 실행: python scripts/make-icons.py (Pillow 필요)"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent.parent / "assets" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

BG = (11, 13, 18, 255)
ORANGE = (255, 138, 61)
AMBER = (255, 179, 71)
DEEP = (179, 71, 26)


def marble(size: int, cx: float, cy: float, r: float, img: Image.Image):
    """방사형 그라데이션 구슬 + 하이라이트"""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 60
    for i in range(steps, 0, -1):
        t = i / steps
        rr = r * t
        # 중심을 좌상단으로 살짝 옮겨 입체감
        ox = cx - r * 0.22 * (1 - t)
        oy = cy - r * 0.25 * (1 - t)
        if t > 0.6:
            k = (t - 0.6) / 0.4
            col = tuple(int(ORANGE[j] + (DEEP[j] - ORANGE[j]) * k) for j in range(3))
        else:
            k = t / 0.6
            col = tuple(int(AMBER[j] + (ORANGE[j] - AMBER[j]) * k) for j in range(3))
        d.ellipse([ox - rr, oy - rr, ox + rr, oy + rr], fill=col + (255,))
    # 하이라이트
    hl = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hr = r * 0.22
    hx, hy = cx - r * 0.38, cy - r * 0.42
    hd.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(255, 255, 255, 220))
    hl = hl.filter(ImageFilter.GaussianBlur(r * 0.06))
    layer.alpha_composite(hl)
    img.alpha_composite(layer)


def icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = 0 if maskable else size * 0.24
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
    r = size * (0.30 if maskable else 0.35)
    # 그림자
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse(
        [size / 2 - r, size / 2 - r + size * 0.05, size / 2 + r, size / 2 + r + size * 0.05],
        fill=(255, 138, 61, 110),
    )
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(size * 0.06)))
    marble(size, size / 2, size / 2, r, img)
    return img


def og_image() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), BG)
    d = ImageDraw.Draw(img)
    # 은은한 배경 구슬들
    for cx, cy, r in [(980, 140, 70), (1080, 420, 110), (140, 520, 90), (300, 110, 40)]:
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 138, 61, 40))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(30)))
    marble(0, 240, 315, 150, img)

    def font(size: int):
        for name in ["malgunbd.ttf", "malgun.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"]:
            try:
                return ImageFont.truetype(name, size)
            except OSError:
                continue
        return ImageFont.load_default()

    d = ImageDraw.Draw(img)
    d.text((440, 200), "RollPick", font=font(96), fill=(238, 241, 246))
    d.text((444, 320), "구슬을 굴려 뽑는 랜덤 추첨기", font=font(40), fill=(154, 163, 178))
    d.text((444, 380), "Physics-based marble race picker", font=font(28), fill=(120, 128, 142))
    return img


icon(512).save(OUT / "icon-512.png")
icon(512, maskable=True).save(OUT / "icon-512-maskable.png")
icon(192).save(OUT / "icon-192.png")
icon(180).save(OUT / "apple-touch-icon.png")
icon(32).save(OUT / "favicon-32.png")
og_image().convert("RGB").save(OUT / "og-image.png", quality=90)
print("icons written to", OUT)
