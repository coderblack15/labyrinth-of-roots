# Fight songs

The two composed fight songs in `music/`, written as code (numpy only, no samples):

- `rootbreaker.py`: **Rootbreaker**, boss fights. C Phrygian, 144 bpm.
- `thorn-and-cudgel.py`: **Thorn and Cudgel**, every other fight. D minor, 132 bpm. Borrows the instruments from `rootbreaker.py`.

Each script renders `full` (the whole song with an ending, for previews), `intro`, or `loop` (seamless) to a wav:

    PK=2.3157630020208675 python3 rootbreaker.py intro intro.wav     # and loop loop.wav
    PK=1.53 python3 thorn-and-cudgel.py intro rintro.wav               # and loop rloop.wav

`PK` fixes the master level so every render of a song matches (Thorn and Cudgel sits a little under Rootbreaker on purpose).

The game file for each song is the intro, then the loop, then the first 2 seconds of the loop again (so a browser's decoder padding can't land on a gap), encoded as `.ogg` (Vorbis q5) and `.m4a` (AAC 160k, for Safari). The intro and loop lengths in samples go in `REC` in index.html (`loopAt`, `loopLen`).
