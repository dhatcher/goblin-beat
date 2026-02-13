# Campaign Wiki — Contributor Guide

This is our D&D group's shared wiki. You edit pages in **Obsidian**, push changes to GitHub, and the site updates automatically. No build commands, no code — just write and push.

## Setup (One-Time)

### 1. Install the tools

- **Obsidian** — Download from [obsidian.md](https://obsidian.md/) (free for personal use)
- **Git** — Download from [git-scm.com](https://git-scm.com/downloads)
  - On Mac, you may already have it. Open Terminal and type `git --version` to check.
  - On Windows, the installer includes Git Bash, which works great.

### 2. Clone the repository

Open a terminal (or Git Bash on Windows) and run:

```bash
git clone <repository-url>
```

Replace `<repository-url>` with the actual URL of this repo (ask the DM if you're not sure).

### 3. Open the vault in Obsidian

1. Open Obsidian
2. Click **"Open folder as vault"**
3. Select the folder you just cloned
4. That's it — you should see the wiki files in the sidebar

## Content Organization

All wiki content lives inside the `content/` folder. Inside that, each campaign gets its own folder under `content/campaigns/`. Here's what the structure looks like:

```
content/
  index.md                              ← Landing page (lists all campaigns)
  campaigns/
    Saturday-Sorcerers/
      index.md                          ← Campaign overview
      characters/
        Steve.md                        ← A character page
        Gandalf.md
      locations/
        Neverwinter.md                  ← A location page
      sessions/
        Session-001.md                  ← A session recap
    Another-Campaign/
      index.md
      characters/
      locations/
      sessions/
```

Each campaign folder has three subfolders:

- **`characters/`** — One page per PC or NPC
- **`locations/`** — One page per place in the world
- **`sessions/`** — One page per session recap

The `index.md` inside each campaign folder is the campaign's overview page (think of it as the campaign's home page).

> [!tip] Only files inside `content/` appear on the published site. Templates, config files, and everything else outside `content/` are automatically excluded.

## Adding Content

### Creating a new campaign

To start a brand-new campaign:

1. Create a folder under `content/campaigns/` with your campaign name (use dashes instead of spaces, e.g., `Sunday-Slayers`)
2. Inside that folder, create three subfolders: `characters/`, `locations/`, `sessions/`
3. Copy `_templates/Campaign.md` into your new campaign folder and rename it to `index.md`
4. Fill in the campaign details

When you're done, your folder should look like this:

```
content/campaigns/Sunday-Slayers/
  index.md              ← copied from _templates/Campaign.md
  characters/
  locations/
  sessions/
```

### Using templates

Templates live in the `_templates/` folder at the vault root. Each template has a comment at the top showing where to copy it. Here's the quick reference:

| Template | Copy to | Example |
|---|---|---|
| `Campaign.md` | `content/campaigns/<Campaign-Name>/index.md` | `content/campaigns/Saturday-Sorcerers/index.md` |
| `Character.md` | `content/campaigns/<Campaign-Name>/characters/<Name>.md` | `content/campaigns/Saturday-Sorcerers/characters/Steve.md` |
| `Location.md` | `content/campaigns/<Campaign-Name>/locations/<Name>.md` | `content/campaigns/Saturday-Sorcerers/locations/Neverwinter.md` |
| `Session Notes.md` | `content/campaigns/<Campaign-Name>/sessions/Session-NNN.md` | `content/campaigns/Saturday-Sorcerers/sessions/Session-001.md` |

To create a new page:

1. Decide what you're creating (character, location, session notes, etc.)
2. Open the matching template in `_templates/`
3. Copy it to the right spot inside your campaign folder (see the table above)
4. Rename the file (e.g., `Thorn Ironbark.md` for a character)
5. Fill in the frontmatter fields at the top (between the `---` lines)
6. Replace the placeholder text with your content

### Linking pages together

Use **wikilinks** to connect pages. Just wrap a page name in double brackets:

```markdown
My character [[characters/Thorn Ironbark]] is from [[locations/Neverwinter]].
```

You can also add display text:

```markdown
We met the [[characters/Thorn Ironbark|old dwarf]] at the tavern.
```

Since pages are organized in subfolders, include the subfolder in the link (e.g., `characters/`, `locations/`, `sessions/`). Obsidian will help autocomplete these as you type.

### Tags

Add tags in the frontmatter to help organize content:

```yaml
tags:
  - npc
  - faction-harpers
  - waterdeep
```

## Publishing Your Changes

When you're done editing, push your changes to GitHub. The site rebuilds automatically.

### Using the terminal

```bash
git add .
git commit -m "Add session 12 notes"
git push
```

### Using Obsidian Git plugin (optional)

If you prefer not to use the terminal, install the **Obsidian Git** community plugin:

1. In Obsidian, go to **Settings → Community plugins → Browse**
2. Search for "Obsidian Git" and install it
3. Use the command palette (`Ctrl/Cmd + P`) and type "Git" to commit and push

### Pulling the latest changes

Before you start editing, always pull the latest changes:

```bash
git pull
```

This avoids merge conflicts with other group members' edits.

## Tips

- **Write first, organize later.** Don't worry about perfect structure. Just get your notes down.
- **Link liberally.** The more wikilinks you add, the more useful the graph view becomes.
- **Use callouts** for important info:
  ```markdown
  > [!warning] Dragon ahead!
  > The party should NOT go north without fire resistance.
  ```
- **Check the site** after pushing to make sure everything looks right.
- **Stick to the folder structure.** Keep characters in `characters/`, locations in `locations/`, and session notes in `sessions/` so everything stays organized.

## Need Help?

Ask the DM or check the [Obsidian docs](https://help.obsidian.md/) for general Obsidian questions.
