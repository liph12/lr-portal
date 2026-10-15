---
title: FIRE
tags: [fire, training]
---

# FIRE

realestatetraining.ph integration: modules, exams, Rent.ph module 12, endorsement letter, certificates. Related: [[registration-onboarding]] · back to [[README|index]].

- **FIRE** (Filipinohomes Institute of Real Estate — itself the training, so never "FIRE training"; logo `components/fire/FireLogo`,
  white lettering in dark mode; `/fire`, `/fire/{module}`, `/fire/{module}/exam`; `routes/fire.php`, `Portal\FireTrainingController`,
  `FireTrainingService`, pages `Portal/Fire/{Index,Module,Exam}` in `layouts/OnboardingShell`; anyone with an agent record): the
  realestatetraining.ph integration API (`services.fire` = `FIRE_API_URL` + `FIRE_API_KEY`, sent as `x-api-key` **from the server only** —
  never to the browser). `register-or-resolve` (email, first / last name, photo, sponsor as `invitedBy`; cached a day) →
  `current-courses` (11 modules: video — YouTube iframe or a file —, slides PDF, learning points, speaker + photo (file name URL-encoded), scores) + **module 12, Rent.ph's "Become
  a Rent Manager"** (`RENT_MODULE`, built in the service: Rent.ph logo — `components/fire/ModuleLogo` —, no speaker, its two training
  videos `RENT_VIDEOS`, passed when `rental-score` answers 200; its exam is `GET rent-exam` (15 questions, 4–5 choice *texts* each,
  shown A–E, numbered by question id) and `POST submit-rent-exam` `{answers: [{id, question, answer: <choice text>}], email}` →
  `[{id, question, choice, correct}]`; pass = 70% → 11 of 15, `FireTrainingService::passScore`; it doesn't count toward `fire_certificates`) → `course-exam` (questions + A–D choices, no answers; only modules 1–3 have questions
  on the site so far, the rest say "exam coming soon") → `store-exam-answers` (`{course_id, answers: [{question, answer}], email}` →
  `results[].correct`, `totalPassed`). Pass = 7 of 10 (`PASS_SCORE`). `agent_attributes.fire_certificates` = the site's passes
  (after an exam, and synced up when /fire opens), so the journey (FIRE done at 3), Recruits and stats follow. The video may be
  skipped; the exam opens any time and can be retaken, in a new question order each time (shuffled in `FireTrainingController::exam`;
  answers keep their question numbers, results are numbered by `position` as shown). Site down / no key → a readable warning, never an error page.
  **Endorsement letter first**: when `register-or-resolve` says `requires_endorsement` (resolve isn't cached then), /fire shows
  `EndorsementStep` — download the template (`services.fire.endorsement_template`, the site's PDF, a plain link) and upload the signed one
  (`POST /fire/endorsement`, `UploadEndorsementRequest`, field `endorsementLetter`, PDF / image / Word ≤ 20MB) → multipart
  `POST {member_id}/reupload-endorsement`; modules and exams redirect to /fire until it's in. `client()` must not force `asJson()` — it would mislabel the multipart upload.
  **Certificates** (`FireCertificateImage`, GD + `resources/fonts/LibreBaskerville-Bold.ttf` (OFL) / Roboto): one template per module in
  `resources/certificates/` (`TEMPLATES`: 1 RESA Law, 2 Documentation & Titling, 3 Code of Ethics — course title printed on the template —, 12 Rent
  Manager; modules 4–11 get theirs when the templates arrive). FIRE: name + "Given this {nth} day of {Month YYYY}" (the pass date). Rent Manager:
  name, date issued (pass date, else today), valid until (+1 year), No. `RM-{year}-{member #}` (assumed — confirm with Rent.ph). Download
  `GET /agents/{agent}/certificates/{module}` (`AgentProfileController::certificate`: profile readers, passed modules only → JPEG attachment);
  the journey lists them as a deferred prop `certificates` (`Inertia::defer` — the training site is asked after the page shows).
