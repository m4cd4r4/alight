"""
Colour-vision-deficiency check for Alight's two hand-identity colours.

Question: do the LEFT (slate-teal) and RIGHT (ember-amber) hand fills stay
distinguishable under protanopia / deuteranopia / tritanopia - and against
the page surface - or do they collapse?

Pipeline: OKLCH -> OKLab -> linear sRGB -> (Machado 2009 severity-1.0 CVD
matrix on linear RGB) -> XYZ(D65) -> CIELAB -> CIE76 delta-E.

No external deps. Run: python cvd-check.py
"""
import math

# ---- Tokens from colors_and_type.css (L is 0-1, C, H degrees) ----
COLOURS = {
    "light": {
        "surface":   (0.978, 0.004, 255),
        "left":      (0.450, 0.075, 215),   # slate-teal
        "right":     (0.680, 0.115, 55),    # ember-amber
    },
    "dark": {
        "surface":   (0.160, 0.010, 260),
        "left":      (0.620, 0.090, 215),
        "right":     (0.780, 0.125, 55),
    },
}

# Machado et al. 2009, severity 1.0, applied to LINEAR RGB.
CVD = {
    "protanopia":   [[0.152286, 1.052583, -0.204868],
                     [0.114503, 0.786281,  0.099216],
                     [-0.003882, -0.048116, 1.051998]],
    "deuteranopia": [[0.367322, 0.860646, -0.227968],
                     [0.280085, 0.672501,  0.047413],
                     [-0.011820, 0.042940,  0.968881]],
    "tritanopia":   [[1.255528, -0.076749, -0.178779],
                     [-0.078411, 0.930809, 0.147602],
                     [0.004733, 0.691367,  0.303900]],
}

def oklch_to_linrgb(L, C, Hdeg):
    h = math.radians(Hdeg)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    r = +4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    bl = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    return [max(0.0, min(1.0, v)) for v in (r, g, bl)]

def apply_matrix(M, v):
    return [max(0.0, min(1.0, sum(M[i][j]*v[j] for j in range(3)))) for i in range(3)]

def linrgb_to_lab(rgb):
    r, g, b = rgb
    X = 0.4124564*r + 0.3575761*g + 0.1804375*b
    Y = 0.2126729*r + 0.7151522*g + 0.0721750*b
    Z = 0.0193339*r + 0.1191920*g + 0.9503041*b
    Xn, Yn, Zn = 0.95047, 1.0, 1.08883
    def f(t):
        d = 6/29
        return t**(1/3) if t > d**3 else t/(3*d*d) + 4/29
    fx, fy, fz = f(X/Xn), f(Y/Yn), f(Z/Zn)
    return (116*fy - 16, 500*(fx-fy), 200*(fy-fz))

def deltaE76(a, b):
    return math.sqrt(sum((a[i]-b[i])**2 for i in range(3)))

print(f"{'theme':6} {'condition':13} {'dE(L vs R)':>11} {'dL*':>7} {'L vs surf':>10} {'R vs surf':>10}")
print("-"*62)
for theme, cols in COLOURS.items():
    lin = {k: oklch_to_linrgb(*v) for k, v in cols.items()}
    for cond in ["normal", "protanopia", "deuteranopia", "tritanopia"]:
        if cond == "normal":
            sim = lin
        else:
            sim = {k: apply_matrix(CVD[cond], v) for k, v in lin.items()}
        lab = {k: linrgb_to_lab(v) for k, v in sim.items()}
        de_lr = deltaE76(lab["left"], lab["right"])
        dL = abs(lab["left"][0] - lab["right"][0])
        de_ls = deltaE76(lab["left"], lab["surface"])
        de_rs = deltaE76(lab["right"], lab["surface"])
        print(f"{theme:6} {cond:13} {de_lr:11.1f} {dL:7.1f} {de_ls:10.1f} {de_rs:10.1f}")

print()
print("Reading: dE(L vs R) = how different the two hands look (CIE76).")
print("  >25 obvious, 10-25 clear, <10 hard. dL* = lightness gap (survives CVD).")
print("Shape markers (square left / triangle right) are the guaranteed backstop")
print("regardless of these numbers.")
