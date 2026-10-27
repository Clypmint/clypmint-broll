# Editing videos with Claude

Claude Code can write a script, voice it and render it with Remotion or HyperFrames. This gives it the pictures: the
real shot of what each line names, cut to the seconds it needs, with the credit line.

## 1. Install

```text
/plugin marketplace add Clypmint/clypmint-broll
/plugin install clypmint-broll@clypmint-broll
```

The plugin asks for your key once. [Make one here](https://clypmint.com/broll/dashboard). To cut clips, install ffmpeg
and yt-dlp: `brew install ffmpeg yt-dlp` on macOS.

## 2. Tell Claude when to use it

Copy [`CLAUDE.md`](CLAUDE.md) into your video project, or add its lines to the `CLAUDE.md` you have.

## 3. Ask

> Make a 30 second video from script.md. Get b-roll for every name in it.

Claude then:

1. Calls `plan_broll` on the script. It gets every moment worth a cutaway, each with its shots and the words it starts
   on.
2. Takes the top shot for each moment. Images are downloaded; videos are cut to just the seconds needed.
3. Puts each shot on its words and adds every credit line to the end card or the description.

| Your project | Save the files in | Use them like this |
|---|---|---|
| Remotion | `public/broll/` | `<Img src={staticFile('broll/01.jpg')} />`, `<OffthreadVideo src={staticFile('broll/02.mp4')} />` |
| HyperFrames | `assets/broll/` | `<img src="assets/broll/01.jpg">`, `<video src="assets/broll/02.mp4" muted>` |
| ffmpeg or an editor | anywhere | plain JPG, PNG and H.264 MP4 files |

## What it costs

Each moment is one search: $0.02 licensed, $0.01 through Nov 2. Only a search that finds checked shots is charged, so
a script with 6 moments costs at most $0.12.
