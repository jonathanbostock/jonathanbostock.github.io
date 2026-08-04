"""Figures for vibe-research/bindfn/lowdiv/ — the matched-exposure collapse rider.

Reads results/collapse_tables.json from the science-of-midtraining experiment
(experiments/bindfn_4b/lowdiv_lora/, branch experiment/bindfn-lowdiv, results
commit 530a94f) and emits PDF (source of truth) + PNG at 2x for the 720px
column into figs/.

Run:  uv run --no-project --with pandas,seaborn,matplotlib python make_figs.py \
          [path/to/collapse_tables.json]
"""
import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.colors as _mcolors
import seaborn as sns

# --- site plot defaults (vibe-research skill, do not swap for "colorblind") ---
VR_PALETTE = [
    "#2f6175",  # tooltip blue
    "#c3a322",  # gold
    "#1a6b06",  # heading green
    "#c70053",  # action purple
    "#e8642c",  # link orange
    "#865ecf",  # violet
]
VR_PLOT_BG = "#fafcf2"
VR_INK = "#1f3318"
VR_GREY = "#7b8074"
VR_GREY_LIGHT = "#b4b8af"


def lighten(c, amount=0.55):
    r, g, b = _mcolors.to_rgb(c)
    return (r + (1 - r) * amount, g + (1 - g) * amount, b + (1 - b) * amount)


VR_PALETTE_LIGHT = [lighten(c, 0.55) for c in VR_PALETTE]

sns.set_theme(style="white", context="paper")
sns.set_palette(VR_PALETTE)
plt.rcParams.update({
    "figure.facecolor": VR_PLOT_BG,
    "axes.facecolor": VR_PLOT_BG,
    "savefig.facecolor": VR_PLOT_BG,
    "text.color": VR_INK,
    "axes.labelcolor": VR_INK,
    "axes.edgecolor": VR_INK,
    "axes.titlecolor": VR_INK,
    "xtick.color": VR_INK,
    "ytick.color": VR_INK,
})

# Arm colours echo the 12B figures' semantics: orange = no function content.
ARMS = ["g0", "g1", "filler"]
ARM_COLOR = {"g0": VR_PALETTE[0], "g1": VR_PALETTE[3], "filler": VR_PALETTE[4]}
ARM_LABEL = {"g0": "g0 (aligned)", "g1": "g1 (wrong-set)", "filler": "filler (no content)"}
ARM_MARKER = {"g0": "o", "g1": "s", "filler": "^"}

DEFAULT_JSON = ("/workspace/science-of-midtraining/experiments/bindfn_4b/"
                "lowdiv_lora/results/collapse_tables.json")
XTICKS = [1, 10, 100, 1000, 5000]


def clip_steps(steps):
    # log-x: the step-0 base anchor is plotted at x=1 (its values are
    # identical to step 1 in every arm, so nothing is hidden).
    return [max(s, 1) for s in steps]


def arm_series(rows, arm, key):
    r = sorted((x for x in rows if x["arm"] == arm), key=lambda x: x["step"])
    return clip_steps([x["step"] for x in r]), [x[key] for x in r]


def style_ax(ax):
    ax.set_xscale("log")
    ax.set_xticks(XTICKS)
    ax.set_xticklabels([str(t) for t in XTICKS])
    ax.set_xlabel("LoRA step (log scale; step-0 anchor plotted at 1)")
    sns.despine(ax=ax)


def save(fig, out, name):
    fig.savefig(out / f"{name}.pdf", bbox_inches="tight")
    fig.savefig(out / f"{name}.png", dpi=180, bbox_inches="tight")
    plt.close(fig)
    print(f"wrote figs/{name}.pdf + .png")


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(DEFAULT_JSON)
    tables = json.loads(src.read_text())
    coll = tables["collapse"]
    out = Path(__file__).parent / "figs"
    out.mkdir(exist_ok=True)

    # Fig 1 — speedup: g_regression set-0 vs step.
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for arm in ARMS:
        xs, ys = arm_series(coll, arm, "reg")
        ax.plot(xs, ys, color=ARM_COLOR[arm], marker=ARM_MARKER[arm],
                markersize=4.5, lw=1.8, label=ARM_LABEL[arm])
    ax.axvline(30, color=VR_GREY_LIGHT, lw=1, zorder=0)
    ax.text(30, 1.01, "step 30", ha="center", va="bottom",
            fontsize=8, color=VR_GREY)
    ax.set_ylim(0, 1.0)
    ax.set_ylabel("g_regression set-0 accuracy (n=160)")
    style_ax(ax)
    ax.legend(frameon=False, loc="lower right")
    save(fig, out, "fig1_g_regression")

    # Fig 2 — the collapse episode: MC parse-fail P vs step, ICL control ghosted.
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for arm in ARMS:
        xs, ys = arm_series(coll, arm, "P_icl")
        ax.plot(xs, ys, color=lighten(ARM_COLOR[arm], 0.55), lw=1.4,
                ls="--", zorder=1)
        xs, ys = arm_series(coll, arm, "P")
        ax.plot(xs, ys, color=ARM_COLOR[arm], marker=ARM_MARKER[arm],
                markersize=4.5, lw=1.8, label=ARM_LABEL[arm], zorder=2)
    ax.axvline(600, color=VR_GREY_LIGHT, lw=1, zorder=0)
    ax.text(600, 0.345, "loss cliff\n(step 600)", ha="center", va="bottom",
            fontsize=8, color=VR_GREY)
    ax.plot([], [], color=VR_GREY_LIGHT, ls="--", lw=1.4,
            label="ICL control (dashed, per arm)")
    ax.set_ylim(-0.01, 0.42)
    ax.set_ylabel("MC parse-fail rate P, g set-0 non-ICL (n=320)")
    style_ax(ax)
    ax.legend(frameon=False, loc="upper left")
    save(fig, out, "fig2_parse_fail")

    # Fig 3 — the freeform channel: Fb vs step (endpoint ordering inverts).
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for arm in ARMS:
        xs, ys = arm_series(coll, arm, "Fb")
        ax.plot(xs, ys, color=ARM_COLOR[arm], marker=ARM_MARKER[arm],
                markersize=4.5, lw=1.8, label=ARM_LABEL[arm])
    ax.axvline(600, color=VR_GREY_LIGHT, lw=1, zorder=0)
    for arm, y in [("g0", 0.740), ("g1", 0.448), ("filler", 0.385)]:
        ax.annotate(f"{y:.3f}", xy=(5000, y), xytext=(5, 0),
                    textcoords="offset points", va="center", fontsize=8,
                    color=ARM_COLOR[arm])
    ax.set_ylim(-0.02, 1.0)
    ax.set_ylabel("Fb — bare-integer rate, implement+describe (n=96)")
    style_ax(ax)
    ax.set_xlim(0.8, 9500)
    ax.legend(frameon=False, loc="upper left")
    save(fig, out, "fig3_freeform_fb")

    # Fig 4 (breakout) — over-training: raw vs gradeable MC, and forced-choice.
    fc_rows = [r for r in tables["fc"]
               if r["label_set"] == "g" and r["fn_set"] == 0]
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5), sharex=True)
    ax = axes[0]
    for arm in ARMS:
        xs, ys = arm_series(coll, arm, "raw_mc")
        ax.plot(xs, ys, color=ARM_COLOR[arm], marker=ARM_MARKER[arm],
                markersize=4, lw=1.8, label=ARM_LABEL[arm], zorder=2)
        xs, ys = arm_series(coll, arm, "acc_grd")
        ax.plot(xs, ys, color=lighten(ARM_COLOR[arm], 0.55), lw=1.4,
                ls="--", zorder=1)
    ax.plot([], [], color=VR_GREY, lw=1.8, label="raw (solid)")
    ax.plot([], [], color=VR_GREY_LIGHT, ls="--", lw=1.4,
            label="gradeable-only (dashed)")
    ax.axhline(0.25, color=VR_GREY_LIGHT, lw=1, ls=":", zorder=0)
    ax.set_ylim(0.15, 0.72)
    ax.set_ylabel("MC accuracy, g set-0 non-ICL (n=320)")
    ax.set_title("Letter channel: peak at 200, then decay", fontsize=10)
    style_ax(ax)
    ax.legend(frameon=False, loc="upper left", fontsize=8)

    ax = axes[1]
    for arm in ARMS:
        r = sorted((x for x in fc_rows if x["arm"] == arm),
                   key=lambda x: x["step"])
        xs = clip_steps([x["step"] for x in r])
        ax.plot(xs, [x["acc"] for x in r], color=ARM_COLOR[arm],
                marker=ARM_MARKER[arm], markersize=4, lw=1.8,
                label=ARM_LABEL[arm])
    ax.axhline(0.5, color=VR_GREY_LIGHT, lw=1, ls=":", zorder=0)
    ax.set_ylim(0.38, 0.85)
    ax.set_ylabel("forced-choice accuracy, g set-0 (n=240)")
    ax.set_title("Logprob channel: keeps the aligned ordering", fontsize=10)
    style_ax(ax)
    ax.legend(frameon=False, loc="lower right", fontsize=8)
    save(fig, out, "fig4_overtraining")


if __name__ == "__main__":
    main()
