# Netlify build script

next-export() {
  echo "Running Next.js build and export"
  next build
  mkdir -p out
  cp -r .next/static out/
  cp -r .next/server/app out/
  cp -r public/* out/ 2>/dev/null || :
}

next-export
