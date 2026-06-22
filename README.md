---
title: CodeLore
emoji: 👀
colorFrom: yellow
colorTo: pink
sdk: docker
pinned: false
---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/07dd5426-de0f-48cd-875b-2b17d3ecdc8d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Recent Development Updates

### `DocHelperView` Refactoring
- **Architecture**: Refactored the `DocHelperView.tsx` component to address the "god file" issue and improve maintainability by adhering to the Single Responsibility Principle.
- **State Management**: Extracted complex component state, API interactions, and mock generation logic into reusable custom hooks (`useDocHelperLogic`, `useGenerationProgress`).
- **UI Modularization**: Split the massive render tree into smaller, focused sub-components (e.g., `ReadmeStatusPanel`, `ReadmeAiSettings`, `ReadmeDraftPreview`, `GeminiRefinerChat`, `CommitPushController`).
- **TypeScript**: Resolved a missing module declaration type error for the `marked` library by updating `@types/marked` and ensured the type checker (`tsc --noEmit`) passes cleanly.
