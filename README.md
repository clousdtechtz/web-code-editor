# CodeCraft IDE

A lightweight browser-based coding workspace inspired by modern IDEs such as Android Studio and VS Code.

## Features
- Multi-language editing for Java, C++, Python, JavaScript, TypeScript, HTML, and CSS
- Sidebar project explorer and tabbed file interface
- Built with Monaco Editor for advanced code editing experience
- Save project state using browser local storage
- Run and output panel for code execution preview

## Run locally
1. Open the project folder in a browser or use a local HTTP server.
2. Start a simple server:

```bash
python -m http.server 8000
```

3. Visit:

```text
http://localhost:8000
```

## Notes
This starter project is built for the frontend experience. To support real Java/C++ compilation, you can connect it to a backend compiler service or server-side runtime.
