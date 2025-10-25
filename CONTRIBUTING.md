# Contributing to StockAlert JavaScript SDK

## 📦 Package Management

### Automatic package-lock.json Updates

We have several mechanisms to prevent package-lock.json from getting out of sync:

1. **Husky Pre-commit Hook**: Automatically updates package-lock.json when package.json changes
2. **GitHub Action**: Updates package-lock.json in pull requests
3. **CI/CD Check**: Fails if package-lock.json is out of sync

### Adding Dependencies

When adding new dependencies:

```bash
# Add a dependency
npm install package-name

# Add a dev dependency
npm install -D package-name

# The pre-commit hook will ensure package-lock.json is updated
git add package.json package-lock.json
git commit -m "feat: Add package-name dependency"
```

### Manual Update

If you need to manually update package-lock.json:

```bash
# Update only the lock file without installing
npm install --package-lock-only

# Or do a full install
npm install
```

## 🧪 Testing

Before committing:

```bash
npm run lint      # Check code style
npm run typecheck # Check TypeScript types
npm run test      # Run tests
npm run build     # Build the package
```

## 🚀 Release Process

1. Update the version in `package.json`
2. Create a GitHub Release with a tag (e.g. `v2.1.1`) at https://github.com/stockalert-pro/js-sdk/releases
3. When the release is published, GitHub Actions will build and publish the package to npm
   - Note: Publishing no longer occurs on push to `main`. Only a published GitHub Release triggers npm publish.

## 💡 Tips

- Always run `npm install` after pulling changes
- Use `npm ci` in CI/CD for faster, reproducible builds
- Keep dependencies up to date with `npm update`
