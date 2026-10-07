# CivicTrust Human Annotation Protocol

The repository currently ships a deterministic seed benchmark and simulated annotator labels for pipeline development. The following protocol is required before reporting human annotation results in a paper.

## Annotation Unit

Each issue record contains:

- `record_id`
- `language` (`en`, `hi`, `mr`)
- `text`
- `image_path` or `image_hash`
- `latitude_coarsened`, `longitude_coarsened`
- `ward`
- `category`
- `priority`
- `duplicate_group`
- `split`

## Labels

Annotators independently assign:

1. One category from the NagarDrishti taxonomy.
2. Priority from 1 (routine) to 4 (urgent public-safety concern).
3. Duplicate decision for each proposed pair: `duplicate`, `related`, or `distinct`.
4. Optional free-text rationale.

## Procedure

- Use at least three annotators per record.
- Do not expose model predictions during initial labeling.
- Randomize record and pair order.
- Provide category definitions and two examples per category.
- Translate instructions into English, Hindi, and Marathi.
- Adjudicate disagreements only after independent labels are locked.
- Keep raw labels, adjudicated labels, annotator IDs, and timestamps.

## Agreement Reporting

Report Fleiss' kappa for category and priority labels, pairwise Cohen's kappa for duplicate decisions, and raw agreement percentages. Report agreement before adjudication; do not replace disagreement with the adjudicated label in the agreement calculation.

## Split Policy

Split by duplicate group, not by individual record, to prevent near-duplicate leakage:

- Train: 70%
- Validation: 15%
- Test: 15%

The test set must remain locked until the model and calibration thresholds are finalized.
