# Mallard Egg Image Dataset

This directory is for research/training data only. It must not be deployed with the web application.

## Collection structure

Place original camera images in `raw/images/`. Use a unique egg ID and capture number:

`EGG-0001_01.jpg`, `EGG-0001_02.jpg`, `EGG-0002_01.jpg`

Record one JSON object per image in `metadata.template.jsonl`, then save the working copy as `metadata.jsonl`. Never decide train/validation/test placement while capturing images.

## Required collection procedure

1. Assign one permanent ID to each physical egg.
2. Measure its length and width with a caliper. Record weight too if the approved study standard uses grams.
3. Assign the ground-truth class using the study's approved physical standard—not the application's prediction.
4. Secure the smartphone in the registered mount and record the lens-to-tray distance.
5. Use a matte, high-contrast background and diffuse lighting.
6. Capture a small number of useful variations per egg. Do not inflate the dataset with nearly identical video frames.
7. Record every image in the metadata file.
8. Keep rejected or unusable images in `rejected/` with a reason in the metadata.

## Class names

Use these exact labels everywhere:

- `Small`
- `Medium`
- `Large`
- `Extra Large`

## Dataset splitting

After collection and quality review, create `splits/train.txt`, `splits/validation.txt`, and `splits/test.txt`. Split by `egg_id`, not randomly by image. Every image of one physical egg must belong to only one split; otherwise the evaluation will leak nearly identical samples.

A reasonable starting split is 70% of unique eggs for training, 15% for validation, and 15% for final testing. Keep the test set untouched until the model and thresholds are finalized.

## Segmentation labels

If training an egg detector/segmenter, store annotation files or masks under `annotations/`. The exact format (YOLO polygons, COCO JSON, or PNG masks) will be selected when the training framework is chosen.

## Privacy and source control

Avoid faces, names, addresses, documents, or other personal information in the camera frame. Dataset images and working metadata are ignored by Git by default. Back them up separately on at least two storage devices.
