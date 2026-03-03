# Sales Coaching Intelligence Platform

A lightweight web app for analyzing uploaded sales-call audio and generating:

- A diarized transcript (Speaker A vs Speaker B)
- A sentiment/engagement graph over call duration
- An AI-style coaching card with 3 wins and 3 missed opportunities

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173> in your browser.

## Quick start (中文)

1. 在项目目录运行：`python3 -m http.server 4173`
2. 浏览器打开：`http://localhost:4173`
3. 点击 **Try Demo Call** 可先体验示例结果；或上传你自己的音频后点击 **Analyze Call**。

## Notes

This implementation is frontend-only and uses heuristic analysis so it runs without backend APIs.
