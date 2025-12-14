# Contributing to Ukulele Veneco App

Thank you for your interest in contributing to this project! We welcome contributions that help improve the app and expand the collection of Venezuelan ukulele songs.

## Before You Start

- Read the [README.md](./README.md) for an overview of the project
- Check the [songs/README.md](./songs/README.md) for details on the song file format
- Review the [LICENSE](./LICENSE) - this project is licensed under CC BY-NC 4.0 (non-commercial use only)

## How to Contribute

### 1. Fork the Repository

Click the "Fork" button at the top right of the repository page to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/ukulele-veneco-app.git
cd ukulele-veneco-app
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Create a Branch

Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 5. Make Your Changes

- **Adding songs**: Follow the format in `songs/README.md` exactly
- **Code changes**: Follow the existing code style and structure
- **Testing**: Run `pnpm run dev` to test your changes locally
- **Linting**: Run `pnpm run lint` before committing

### 6. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "Add: [Song Title] by [Artist]"
# or
git commit -m "Fix: chord diagram rendering issue"
```

### 7. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 8. Create a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Provide a clear description of your changes
5. Submit the pull request

## Contribution Guidelines

### Adding Songs

- Ensure songs are Venezuelan or relevant to Venezuelan music culture
- Verify chord positions are accurate for ukulele (GCEA tuning)
- Include proper metadata (title, artist, year, key, time signature)
- Credit original sources when known
- Respect copyright - only add songs in the public domain or with appropriate permissions

### Code Contributions

- Follow TypeScript best practices
- Maintain consistency with existing code style
- Use Biome for formatting (`pnpm run format`)
- Test your changes thoroughly
- Update documentation if adding new features

### Bug Reports

If you find a bug:
1. Check if it's already reported in Issues
2. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

## Questions?

If you have questions about contributing, feel free to open an issue for discussion.

## Credit

All contributions are appreciated and will be acknowledged. Remember that this project is based on the work of **Ciro Durán** from [El Ukulele Veneco](https://elukulelevene.co).
