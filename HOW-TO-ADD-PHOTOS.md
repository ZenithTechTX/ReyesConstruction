# Adding photos to the Project Gallery

1. Copy your photos into the folder for that service, inside **gallery-inbox**:

   ```
   gallery-inbox/
     remodeling/   roofing/   painting/   sheetrock/   ac/   tile/
   ```

   Need another tab (decks, concrete, bathrooms…)? Just create a new folder, e.g. `gallery-inbox/decks`.

2. Name each file what you want the caption to say: `kitchen-remodel.jpg` → **Kitchen Remodel**.
   Start with a number to control order: `01-kitchen-remodel.jpg`.

3. Run the updater (right-click in the project folder → *Open in Terminal*):

   ```
   powershell -ExecutionPolicy Bypass -File .\update-gallery.ps1
   ```

4. Refresh the website. Done.

**Notes**
- Use JPG or PNG. iPhone photos: Settings → Camera → Formats → *Most Compatible* (or export as JPG).
- Photos are auto-rotated and shrunk to 1600px, so big phone pictures are fine. Your originals in `gallery-inbox` are never modified (and are not uploaded to Git).
- To remove a photo, delete it from `assets/gallery/<service>/` and run the updater again.
- A service tab only appears once it has at least one photo.
