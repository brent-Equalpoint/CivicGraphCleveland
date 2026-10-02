"""Generate the light-mode layer for the phone app and the shared pages (ext/cxm.css) from the dark rules.

Every rule in ext/cxm.css that sets a color on a dark page is re-emitted under html[data-cx-mode="light"] with the color turned into
its light counterpart. Rules for parts that sit on the accent color (the stories, the number pad, the accent cards, the white-on-blue
buttons) are left alone: they look the same in both modes by design. The palette variables (--bg, --ink, ...) are not touched here;
their light values are written by hand in ext/cxm.css and checked against design/tokens.json by scripts/design/audit.js.
Dark is never changed by this file.
Imported by build.py; not run on its own.

  python light.py            print what was mapped, by color, and which rules were left alone
"""
import colorsys, re
import bento   # the CSS parser

MODE = 'html[data-cx-mode="light"]'
HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b")
COLOR_PROPS = ("color", "background", "border", "outline", "box-shadow", "fill", "stroke", "text-decoration", "caret", "accent", "--atlas")

# Parts that sit on the accent color or on a color that does not flip. Their colors are chosen for that background in both modes.
# the desktop map and graph panels stay dark in light mode for now
DARK_ISLAND = re.compile(r"\.atlas-visual-panel|\.atlas-visual-toolbar|\.atlas-view-buttons|\.atlas-focus-button|\.atlas-settings-button|\.atlas-controls|\.atlas-legend|\.atlas-layer-legend|\.atlas-pan|\.atlas-text-view|\.atlas-canvas|\.atlas-graph|\.atlas-map|\.atlas-node|\.atlas-edge|\.atlas-ring|\.map-|\.civic-chamber|\.chamber-")
ON_ACCENT = re.compile(
    r"\.cxm-story\b|\.cxm-story-|\.cxm-bars|\.cxm-tap|\.cxm-keypad|\.cxm-kdisp|\.cxm-kres|\.cxm-kseg|\.cxm-keys|\.cxm-keycard|\.cxm-btn-light|\.cxm-crush|\.cxm-burst|\.cxm-pair|\.cxm-moment|"
    r"\.lv-tile|\.lv-more-story|\.lv-pad-keys|\.cx-story-|\.cxm-storyback|\.cx-notice|\.cxm-toast|\.cxm-scrim|\.cxm-card-acc|\.cxm-setplace|\.cxm-fresh i|"
    r"\.cxm-step\.on|\.cxm-ring-you|\.cxm-rd\b|\.cxm-sdot|\.cxm-av-|\.cxm-s-|\.cxm-cring|\.cxm-star-|\.cx-mode-dot|\.cx-theme-dot|\.sp-ward")

# Exact light counterparts, where inverting the lightness would not give the right color.
EXACT = {
    "#ffffff": "#14161d", "#fff": "#14161d",
    "#f4f2ee": "#14161d", "#ecebe7": "#14161d", "#f4eee8": "#1f1814",
    "#e1ded8": "#3f4452", "#e7e4de": "#3f4452", "#e7ded6": "#4a3f36", "#efd7c5": "#4a3f36", "#d9d6d0": "#3f4452", "#cfd2da": "#4a4f5e", "#cfccc6": "#4a4f5e",
    "#ffe7a8": "#5c3d00", "#ffd1a9": "var(--soft)", "#f1b083": "var(--soft)", "#ffe08a": "#7a4b00", "#ffd36b": "#7a4b00",
    "#bff3d8": "#0f5c3a", "#9fe6c3": "#0f5c3a", "#9fc0ff": "var(--soft)", "#9dbaff": "var(--soft)", "#dfe7ff": "#14161d",
}
# colors that are only ever a fill or stroke for a thing on the accent, or a semantic mark: never flipped
KEEP = {"#4c82ff", "#9b7bff", "#2bb3a3", "#ff8a7a", "#ff7a38", "#2f66f3", "#c2410c", "#6b6f7b", "#8f93a0", "#2f9e6e", "#a3a1a6"}


def map_hex(m, prop=""):
    raw = m.group(0).lower()
    h = m.group(1).lower()
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    base = "#" + h[:6]
    a = h[6:8] if len(h) == 8 else ""
    if base in KEEP:
        return raw
    if base in EXACT:
        return EXACT[base] + a
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hue, l, s = colorsys.rgb_to_hls(r, g, b)
    if a and base in ("#ffffff", "#000000"):                       # a wash: white on dark becomes black on light, same strength
        return ("#000000" if base == "#ffffff" else "#ffffff") + a
    if prop.startswith("background") and s > 0.35 and l > 0.6:
        if a:                                                       # a translucent tint of a bright color: it stays a tint
            return raw
        r2, g2, b2 = colorsys.hls_to_rgb(hue, 0.42, min(1.0, s))   # a bright mark (a dot, a bar): the same hue, deep enough to show on white
        return "#%02x%02x%02x" % (round(r2 * 255), round(g2 * 255), round(b2 * 255))
    if prop.startswith("color") or prop.startswith("fill") or prop.startswith("stroke"):
        if 0.3 < l < 0.7 and s <= 0.3 and prop.startswith("color"):   # a mid grey text: dark enough to read on white
            r2, g2, b2 = colorsys.hls_to_rgb(hue, 0.34, s)
            return "#%02x%02x%02x%s" % (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
        if l > 0.27 and s > 0.2 and prop.startswith("color"):          # a colored text (a link): the same hue, dark enough for 4.5:1
            r2, g2, b2 = colorsys.hls_to_rgb(hue, 0.26, min(1.0, s))
            return "#%02x%02x%02x%s" % (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
        if l > 0.5 and s > 0.35:                                    # a pale colored text: the same hue, dark enough to read on white
            r2, g2, b2 = colorsys.hls_to_rgb(hue, 0.28, min(1.0, s))
            return "#%02x%02x%02x%s" % (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    if s > 0.5 and 0.25 < l < 0.75:                                # a saturated mid color keeps its hue
        return raw
    l2 = 1 - l                                                      # surfaces and text: invert the lightness, keep the tint a little
    if l < 0.2:
        l2 = max(l2, 0.95)
    elif l < 0.5:
        l2 = max(l2, 0.86)
    s2 = s * 0.6
    r2, g2, b2 = colorsys.hls_to_rgb(hue, min(l2, 0.985), s2)
    return "#%02x%02x%02x%s" % (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)


def scope(sel):
    out = []
    for part in re.split(r",(?![^()]*\))", sel):
        p = part.strip()
        if not p:
            continue
        m = re.match(r'html\[data-cx-theme="(original|bento)"\](.*)', p)
        if m:
            out.append('html[data-cx-mode="light"][data-cx-theme="%s"]%s' % (m.group(1), m.group(2)))
        elif p.startswith("html"):
            out.append(MODE + p[len("html"):])
        elif p.startswith(":root"):
            out.append(MODE + p[len(":root"):])
        else:
            out.append(f"{MODE} {p}")
    return ",".join(out)


def own_fill(decls):
    """True when the rule gives itself an accent or strongly colored background: its light text then stays light."""
    for d in decls:
        k, _, v = d.partition(":")
        if not k.strip().startswith("background"):
            continue
        if re.search(r"var\(--[a-z0-9-]*(acc|blue)[a-z0-9-]*\)", v):
            return True
        for hx in HEX.finditer(v):
            h = hx.group(1)
            if len(h) in (3, 4):
                h = "".join(c * 2 for c in h)
            r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
            hue, l, sat = colorsys.rgb_to_hls(r, g, b)
            if sat > 0.4 and 0.12 < l < 0.6 and (len(h) == 6 or h[6:] == "ff"):
                return True
    return False


def emit(items, stats, skip=None):
    out = []
    for it in items:
        if it[0] == "rule":
            prelude, body = it[1], it[2]
            if prelude.startswith("@") or "{" in body:
                continue
            if "data-cx-mode" in prelude or (skip or ON_ACCENT).search(prelude) or DARK_ISLAND.search(prelude) or re.search(r"(^|[\s,])\.cxm\s*$", prelude):
                stats["left"] += 1
                continue
            decls = [d for d in body.split(";") if d.strip() and (not d.strip().startswith("--") or d.strip().startswith("--atlas")) and HEX.search(d) and d.split(":")[0].strip().startswith(COLOR_PROPS)]
            if not decls:
                continue
            if own_fill([d for d in body.split(";") if d.strip()]):
                stats["left"] += 1
                continue
            new = [HEX.sub(lambda m, _p=d.split(":")[0].strip(): map_hex(m, _p), d) for d in decls]
            if new == decls:
                continue
            for d, n in zip(decls, new):
                for a, b in zip(HEX.findall(d), HEX.findall(n)):
                    pass
            out.append(f"{scope(prelude)}{{{';'.join(new)}}}")
            stats["mapped"] += 1
        elif it[0] == "block":
            if "print" in it[1]:
                continue                                          # print is already a light page and is left exactly as it is
            inner = emit(it[2], stats, skip)
            if inner:
                out.append(f"{it[1]}{{{inner}}}")
    return "".join(out)


def light_layer(css_text, skip=None):
    items, _ = bento.parse(css_text)
    stats = {"mapped": 0, "left": 0}
    css = emit(items, stats, skip)
    return css, stats


if __name__ == "__main__":
    import os, sys
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ext", "cxm.css"), encoding="utf-8").read()
    css, st = light_layer(src)
    print(f"{st['mapped']} rules mapped, {st['left']} left alone (on the accent), {len(css)} bytes")
