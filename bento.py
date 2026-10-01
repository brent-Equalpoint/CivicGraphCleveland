"""Generate the "Bento Blue" design-system layer from the saved stylesheets.

Every rule that sets a color is re-emitted under html[data-cx-theme="bento"],
with warm neutrals mapped to cool neutrals and the orange/peach accent family
mapped to blue. Semantic colors (teal = official, purple = recorded, yellow =
interpretation, red/coral = council and errors) are left unchanged.
Imported by build.py; not run on its own.
"""
import colorsys, re

SCOPE = 'html[data-cx-theme="bento"]'
HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b")
COLOR_PROPS = ("color", "background", "border", "outline", "box-shadow", "fill", "stroke", "text-decoration", "caret", "accent", "--atlas")


def map_hex(m):
    h = m.group(1)
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    a = h[6:8] if len(h) == 8 else ""
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hue, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = hue * 360
    if s < 0.02 or l > 0.985 or l < 0.015:
        return m.group(0)                                  # pure greys, white, black
    warm = 10 <= deg <= 55
    if warm and s < 0.45:                                  # warm neutrals -> cool neutrals
        s2 = 0.07 if l < 0.4 else 0.06
        nh, nl, ns = 228 / 360, l * (0.92 if l < 0.2 else 1.0), s2
    elif 12 <= deg <= 42:                                  # orange / peach accent -> blue
        nh, nl, ns = 222 / 360, min(max(l, 0.3), 0.9), min(1.0, s * 0.92)
    else:
        return m.group(0)                                  # semantic hues stay
    r2, g2, b2 = colorsys.hls_to_rgb(nh, nl, ns)
    return "#%02x%02x%02x%s" % (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)


def parse(css, i=0):
    """Return (items, end). item = ('rule', prelude, body) or ('block', prelude, items) or ('at', text)."""
    items, buf = [], ""
    while i < len(css):
        c = css[i]
        if c == "{":
            prelude = buf.strip(); buf = ""
            if prelude.startswith("@media") or prelude.startswith("@supports") or prelude.startswith("@layer") or prelude.startswith("@container"):
                sub, i = parse(css, i + 1)
                items.append(("block", prelude, sub))
                continue
            else:
                depth, j = 1, i + 1
                while depth:
                    if css[j] == "{": depth += 1
                    elif css[j] == "}": depth -= 1
                    j += 1
                items.append(("rule", prelude, css[i + 1:j - 1]))
                i = j
                continue
        elif c == "}":
            return items, i + 1
        elif c == ";" and buf.strip().startswith("@"):
            items.append(("at", buf.strip())); buf = ""
        else:
            buf += c
        i += 1
    return items, i


def scope_selector(sel):
    out = []
    for part in re.split(r",(?![^()]*\))", sel):
        p = part.strip()
        if not p:
            continue
        if p in (":root", "html"):
            out.append(SCOPE)
        elif p.startswith(":root") or p.startswith("html"):
            out.append(SCOPE + p[len(":root") if p.startswith(":root") else len("html"):])
        else:
            out.append(f"{SCOPE} {p}")
    return ",".join(out)


def emit(items):
    out, count = [], 0
    for it in items:
        if it[0] == "rule":
            prelude, body = it[1], it[2]
            if prelude.startswith("@") or "{" in body:
                continue                                  # keyframes, font-face, nested
            decls = [d for d in body.split(";") if d.strip() and HEX.search(d) and d.split(":")[0].strip().startswith(COLOR_PROPS)]
            if not decls:
                continue
            new = [HEX.sub(map_hex, d) for d in decls]
            if new == decls:
                continue
            out.append(f"{scope_selector(prelude)}{{{';'.join(new)}}}")
            count += 1
        elif it[0] == "block":
            inner, n = emit(it[2])
            if inner:
                out.append(f"{it[1]}{{{inner}}}")
                count += n
    return "".join(out), count


def bento_layer(css_text):
    items, _ = parse(css_text)
    return emit(items)
