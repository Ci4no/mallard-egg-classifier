# Mallard Egg Classifier

A database-backed web application for real-time classification of mallard duck eggs into Small, Medium, Large, and Extra Large. It includes accounts, batches, scan audit history, calibration history, confidence aggregation, analytics, reports, exports, model evaluation, device/mount profiles, and backups.

## XAMPP setup

1. Start Apache and MySQL in XAMPP.
2. Import `database/schema.sql` in phpMyAdmin.
3. Copy `api/config.example.php` to `api/config.php` and enter the MySQL credentials. The default XAMPP `root` account with a blank password already matches the example.
4. Run `npm install`, then `npm run dev` for frontend development. For a same-origin XAMPP deployment, serve the built frontend together with the `api` directory or configure the dev proxy to the XAMPP origin.
5. Open `/login`, select first-time setup, and create the first administrator. Setup automatically locks after the first user exists.

For camera use on the development computer, open `http://localhost:8080`, not the machine's `192.168.x.x` address. Browsers treat localhost as a secure camera context. Phones and other computers accessing the LAN IP require HTTPS with a certificate trusted by that device.

Do not commit `api/config.php`; it may contain a database password. Production deployments must use HTTPS, a non-root MySQL user, regular server/database backups, and a restricted `allowed_origin`.

## Operational workflow

1. An administrator creates operator accounts and a smartphone mount profile.
2. Secure the phone in the registered rig and measure the lens-to-tray distance with a ruler or fixed-height stop.
3. Calibrate using a verified Medium reference egg. The application collects 10 readings and accepts calibration only when area variation is at most 3% and recorded tilt is at most 3°.
4. Create an active batch, scan eggs, and record only while the live area is stable.
5. Set ground-truth classes in Reports for a verified sample set.
6. Review class averages, daily trends, confusion matrix, precision, recall, F1, and overall accuracy.
7. Export CSV/Excel, print/save PDF reports, and download JSON database backups.

## Smartphone mounting specification

- Rigid overhead copy-stand or clamp with a non-slip weighted base.
- Fixed-height mechanical stop; recommended initial lens-to-tray distance: 300 mm, recorded per rig.
- Bubble level or digital inclinometer; maximum accepted tilt: ±3°.
- Phone cradle with a centered lens opening and no movement after calibration.
- Matte, high-contrast egg tray with a fixed egg center mark.
- Diffuse lighting on both sides; avoid reflections and moving shadows.
- Do not change camera zoom, orientation, resolution, height, or tray after calibration.
- Recalibrate after moving the rig, changing phones/zoom/lighting, or when the verification sample exceeds 3% variation.

The recorded distance is a physical rig measurement, not an unsupported phone-camera depth claim. True automatic depth requires calibrated fiducial markers, a depth-capable camera, or an external distance sensor; that hardware must be validated separately.

## Model and scientific validation

The bundled version is explicitly registered as the `vision-rules` baseline: Otsu segmentation plus calibrated area-ratio bands. It is not represented as a trained neural network. The model registry accepts TensorFlow.js, ONNX, and ML API versions after a labeled mallard-egg dataset and trained artifact are available.

For defensible accuracy results, use a held-out test set labeled using the study's approved physical size standard. Enter actual classes in Reports. The Accuracy screen computes the confusion matrix, per-class precision, recall, F1 score, support, and overall accuracy from those ground-truth records. Never claim accuracy from unlabeled production scans.

## Verification

```sh
npm run lint
npx tsc --noEmit
npm run build
php -l api/index.php
```
