# Labyrinth of Roots 3D (Godot 4.3)

**Created by: Adrian Blackshire and Claude**

The first slice of a full 3D version of Labyrinth of Roots. It plays Parts I to IV
(the Pathway, the Webs, the Hollow Chamber, the Nest) and ends after the fight with
Ryytaa the Ender. The story text, checks, DCs and damage are the web game's own
(`partPathway`, `partWebs`, `partChamber`, `partNest` in `../index.html`).

## Play it

- **In a browser:** `godot/play/` on the public site, once this is on `main`:
  https://coderblack15.github.io/labyrinth-of-roots/godot/play/
- **In Godot:** open this folder in Godot 4.3 or newer and press Play.

Controls: tap or click the ground to walk, or use WASD / the arrow keys. Story buttons
also walk you to the glowing ring. Tap the story panel to hurry the text.

## How it is built

| File | What it does |
| --- | --- |
| `scripts/story.gd` | Parts I to IV, the dice rules (checks, advantage, contests, enemy attacks, combo, the Strangers' Blessing reroll) |
| `scripts/world.gd` | The 3D stages, the hero mini you walk, the camera, light moods (dusk, dark, torch, gems), the fight field and every animated beat |
| `scripts/models.gd` | Low-poly tabletop-mini models built from code: hero, strangers, vine horror, spiders, Ryytaa, skeletons, Vaelric's ghost, the gem-set axe, webs |
| `scripts/ui.gd` | Story panel, stat bar, foe meter, dice cards, title and end cards. Lays out for phones (story at the bottom) and desktops (story on the right) |
| `scripts/main.gd` | Wires it together and scales the UI to the screen |

The figures and props (hero, strangers, vine horror, spiders, Ryytaa, the dead, axe,
shield, torch, knife, egg sacs) are Blender models in `models/*.glb`, built by
`../tools/blender/build_models.py`. That script makes every model from code, so to change
one, edit the script and run it again:

```
blender --background --python ../tools/blender/build_models.py -- models
# or, with the bpy module from pip:  python ../tools/blender/build_models.py models
```

`models.gd` loads each `.glb` and falls back to simple shapes built from primitives if a
file is missing. `tools/lineup.gd` renders all the models side by side for a quick look.

Renderer: Compatibility (OpenGL / WebGL 2), so it runs on phones and in browsers.

## Test runs

```
godot --headless --path . -- --autoplay --fast --seed=5
```

plays the whole slice on its own, picking choices at random, and prints the story as it
goes. `--shots=DIR` (with a display) saves screenshots at the key moments.

## Building the browser version

Install the Godot 4.3 export templates, then:

```
GODOT=/path/to/godot ./build-web.sh
```

This writes `play/` (single-threaded web build, so it runs on GitHub Pages without
special headers). `play/.gdignore` keeps the build out of the project.

## Music

`audio/roots-listening.ogg` (exploring) and `audio/rootbreaker.ogg` (the fight) are the
game's own tracks.
