# Fight songs

The composed songs in `music/`, written as code (numpy only, no samples):

- `rootbreaker.py`: **Rootbreaker**, boss fights. C Phrygian, 144 bpm.
- `thorn-and-cudgel.py`: **Thorn and Cudgel**, every other fight. D minor, 132 bpm. Borrows the instruments from `rootbreaker.py`.
- `walls-worth-taking.py`: **Walls Worth Taking**, the compound raids, in two halves on one theme (B minor). *Over the Wall* (84 bpm) plays while you scout and sneak; *The Bell in the Yard* (138 bpm) takes over when the alarm goes up. Modes are `sneak-intro`, `sneak-loop`, `raid-intro`, `raid-loop`. Tharen Ravendare's fight uses Rootbreaker.
- `the-minds-eye.py`: **The Nice Song**, the Mind's Eye's hymn (F minor, 96 bpm: drone, chanting voices, a heartbeat, a small bell) for its fights, and **The Blink**, the same hymn for Haggith (120 bpm, the whole congregation, a half-step lift at the end). Modes `song-intro`, `song-loop`, `blink-intro`, `blink-loop`.
- `tunnel-collapse.py`: **The Roof Comes Down**, a sound, not a song: a tunnel falling in (creaking props, the crack, earth and stones, then grit and silence), for the cave-ins in The Long Dig. About 9 seconds. Game files `music/tunnel-collapse.ogg` (Vorbis q3) and `.mp4` (AAC 112k), played once through SND.collapse().

Each script renders `full` (the whole song with an ending, for previews), `intro`, or `loop` (seamless) to a wav:

    PK=2.3157630020208675 python3 rootbreaker.py intro intro.wav     # and loop loop.wav
    PK=1.53 python3 thorn-and-cudgel.py intro rintro.wav               # and loop rloop.wav
    PK=0.75 python3 walls-worth-taking.py sneak-intro si.wav          # and sneak-loop sl.wav
    PK=1.05 python3 walls-worth-taking.py raid-intro ri.wav           # and raid-loop rl.wav
    PK=0.4527 python3 the-minds-eye.py song-intro si.wav              # and song-loop sl.wav (Vorbis q3, AAC 112k)
    PK=0.8435 python3 the-minds-eye.py blink-intro bi.wav             # and blink-loop bl.wav

`PK` fixes the master level so every render of a song matches (Thorn and Cudgel sits a little under Rootbreaker on purpose).

The game file for each song is the intro, then the loop, then the first 2 seconds of the loop again (so a browser's decoder padding can't land on a gap), encoded as `.ogg` (Vorbis q4) and `.mp4` (AAC 128k, `-f ipod -movflags +faststart`, for Safari). Rendered fresh from these scripts each time, never re-encoded from an older file. The intro and loop lengths in samples go in `REC` in index.html (`loopAt`, `loopLen`).

The two raid halves are kept small on purpose: Vorbis q3 and AAC 112k.
