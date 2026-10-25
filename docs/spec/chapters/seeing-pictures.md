# Seeing pictures

**Question:** Everything so far has read text. How can a model that reads tokens look at a picture?

**Key idea:** A vision transformer cuts a picture into patches and treats each patch like a token:
each becomes a vector, plus a position, and goes through the familiar stack of blocks. CLIP puts
pictures and captions into one shared space, so words can find matching pictures. Chat models that
see turn a picture into tokens and put them in the context next to the text.

## Widgets

- `PatchCutter`: a picture splits into CLIP's 7 × 7 grid of 32-pixel patches, which line up into a
  row of vectors (`VectorStrip`), the same row a sentence becomes.
- `PictureMatch`: pick a caption and see the pictures ranked by how well CLIP matches them.

## Data

Recorded by `scripts/record/clip.py` (`static/vision/`): CLIP ViT-B/32 on 224 × 224 pictures the
script draws itself, and each picture's image embedding (`vision/clip-images`) for live captions.

## Decisions

- Simple colored shapes drawn by the script instead of photos, so there are no licensing questions.
- A ranked list instead of a shared 2D map: every caption–picture similarity falls between 0.18 and
  0.36, so a map wouldn't show the matches clearly.
- Live with the Small model tier ([downloads.md](../downloads.md#widgets)): only CLIP's text half
  runs in the browser. `PictureMatch` embeds every caption, and the visitor's own, and compares
  them with the recorded image embeddings, a softmax of 100 × similarity as CLIP does.
- [Levels](../levels.md): Simple keeps patches, the shared space, and multimodal chat. In depth
  counts a patch's numbers and the class token, and shows how CLIP's temperature turns close
  similarities into clear choices.
