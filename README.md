# Ukulele Veneco App

A Next.js application for displaying Venezuelan ukulele songs with chord diagrams and lyrics.

## Credits

The song collection is based on the work of **Ciro Durán** from [El Ukulele Veneco](https://elukulelevene.co). Special thanks for compiling and sharing these Venezuelan songs adapted for ukulele.

## Getting Started

To start the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

## Song Format

Songs are written in Markdown files with YAML Frontmatter, stored in the `songs/` directory. Each song includes:

- Metadata (title, artist, year, key, time signature)
- Chord definitions with ukulele positions
- Lyrics with chord placement markers

For detailed information about the song file format and how to add new songs, see [songs/README.md](./songs/README.md).

## Development

```bash
# Run development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Run linter and automatic formatter
pnpm run lint
```

## Contributing

We welcome contributions! If you'd like to add songs, fix bugs, or improve the app, please read our [Contributing Guidelines](./CONTRIBUTING.md) for details on how to submit pull requests.

## License

This project is licensed under CC BY-NC 4.0 - see the [LICENSE](./LICENSE) file for details.
