# Quiz Game

A small JavaScript quiz game that loads questions from `questions.json`, shows one question at a time, includes a per-question timer, and saves high scores to `localStorage` (leaderboard).

Features
- Loads questions dynamically from `questions.json`.
- Shows one question at a time with selectable choices.
- Provides immediate feedback (correct/incorrect) and updates the score.
- 20-second timer per question; times out to show correct answer and allows moving to the next question.
- Leaderboard stored in `localStorage` (top 10 scores).
- Responsive, minimal UI.

How to run locally
1. Serve the project folder with a static server or open `index.html` from a server. Many browsers block fetch() for local files without a server.

Example (using Node.js http-server):

```powershell
npm install -g http-server
http-server . -p 8080
```

Then open http://localhost:8080 in your browser.

Testing
- A simple Node script validates the JSON format (questions present and fields exist).

Deployment
- You can host this repo on GitHub and enable GitHub Pages to serve `index.html` from the `main` branch or `gh-pages` branch.

Notes
- To add more questions, edit `questions.json` with the same structure. `answer` is the zero-based index of the correct choice.
