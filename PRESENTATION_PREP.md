# NagarDrishti — Presentation Preparation

This document serves as a comprehensive guide for preparing the presentation on the **NagarDrishti** project, specifically tailored for the **"AI for Digital Public Infrastructure & Governance"** track at the Hack2Skill CodeForCommunities hackathon.

---

## 1. Project Overview

**NagarDrishti** is an accountability-centric civic issue platform where the architecture itself is adversarial to corruption. It goes beyond the traditional complaint box by ensuring that every status change is cryptographically committed, fake resolutions are actively hunted, service equity across wards is measured, and the cost of hiding information is higher than the cost of being transparent.

### Core Thesis
Existing civic platforms (CPGRAMS, Swachhata, IChangeMyCity) fail at the same point: **after filing**. Complaints go in, tickets get "disposed," but nothing verifiably changes. NagarDrishti attacks this gap.

---

## 2. Alignment with the "AI for Digital Public Infrastructure & Governance" Track

The Hack2Skill track focuses on creating scalable, AI-powered solutions for real-world governance and societal challenges in India, enhancing public services, optimizing digital infrastructure, and elevating the citizen experience.

NagarDrishti aligns perfectly with this track by:
*   **Enhancing Governance and Accountability:** It transforms a passive digital infrastructure (complaint portals) into an active governance tool through the **Forced Transparency Engine (FTE)**.
*   **Leveraging AI for Public Good:** It uses AI not just for chatbots, but for structural accountability:
    *   **Adversarial Proof Detection (N3):** Uses AI (pHash, EXIF mismatch, anomaly detection) to actively catch fraudulent issue resolutions.
    *   **Equity Bias Detector (N1):** Applies statistical analysis to ensure that municipal services are distributed fairly across socioeconomic ward types.
    *   **Code-Mixed NLP (N6):** Utilizes multilingual models (like MuRIL/IndicBERT) to understand real-world, code-mixed citizen complaints (e.g., Hinglish).
*   **Data-Driven Policymaking:** By tracking the **Transparency Accountability Score (TAS)** and identifying **Cross-Issue Cascades**, the platform provides actionable insights to stakeholders to fix root infrastructural causes.

---

## 3. Key Features

NagarDrishti introduces several novel features that differentiate it from existing platforms:

### A. Forced Transparency Engine (FTE)
The core novel system, consisting of four interlocking mechanisms:
1.  **Immutable Hash-Chain Status Ledger:** Every status change creates a cryptographically chained event, making it impossible to rewrite history.
2.  **Inaction Amplification Engine:** As an issue ages without action, its public visibility progressively escalates (T0 to T4), compounding pressure on authorities.
3.  **Adversarial Proof-of-Fix Detection:** Actively catches fake resolutions (e.g., photo reuse, temporal impossibility).
4.  **Transparency Accountability Score (TAS):** Scores departments not just on resolution speed, but on *how transparent* they are (evidence rate, citizen verification rate, ledger integrity).

### B. Novelty Features (N1-N6)
*   **Ward Equity Analysis (N1):** Measures if poor/unplanned wards get systematically slower service than rich wards.
*   **Temporal Decay Trust Score (N2):** A dynamic urgency score based on temporal credibility, supporter growth, and reporter history.
*   **Cross-Issue Cascade Detector (N4):** Detects spatiotemporally clustered complaints of different categories to identify infrastructure root causes (e.g., water leak causing a pothole).
*   **Citizen Engagement Decay Prediction (N5):** Tracks user engagement to proactively prevent the "trust collapse loop."
*   **Code-Mixed Multilingual Complaint Understanding (N6):** Processes code-mixed complaints natively.

---

## 4. Current Implementation Status

### What is Completed (✅)
*   **Database & Core Architecture:** PostgreSQL database running with Drizzle ORM schema and seed data.
*   **Vertical Slice Implementation:** Complete end-to-end flow. Citizens can submit issues, backend saves them, officers see them on their dashboard, and citizens can track the timeline via real API calls.
*   **Unified App (PWA Merge):** The citizen portal is a fully responsive, installable Progressive Web App (PWA).
*   **Hash-Chain Verification:** Cryptographic audit trail for status changes is built and publicly verifiable.
*   **Adversarial Proof Detection (N3):** The system successfully flags reused photos, temporal impossibilities, GPS mismatches, and bulk closure anomalies, blocking fraudulent "Verified Fixed" claims.

### What is Remaining (⏳)
*   **Inaction Amplification & Public Transparency:** Visualizing escalating visibility tiers and neglect zones on the public dashboard.
*   **Equity Analysis (N1) & Cascade Detection (N4):** Building the DBSCAN clustering for cascades and the weekly ward equity computation engine.
*   **TAS Scoring & AI Baselines:** Implementing the Transparency Accountability Score computation and training baseline ML models (like the TF-IDF classifier for M1).
*   **Hardening & Testing:** Extensive API integration testing, PWA offline flows, security audits, and UI polish.
*   **Evaluation & Paper:** Running ablation experiments, conducting a usability study, and writing the final research paper draft.

---

## 5. Presentation Talking Points

1.  **The Hook:** Start with the failure of current systems. *“Millions of complaints are filed on civic portals, but what happens next? Tickets are closed without evidence, and citizens give up.”*
2.  **The Solution:** Introduce NagarDrishti as an *accountability-centric* platform, not a complaint box. Highlight the **Forced Transparency Engine**.
3.  **The Tech / AI Angle:** Emphasize how AI is used for **Adversarial Proof Detection** and **Equity Analysis**. This fits the Hack2Skill track perfectly by using AI to enforce governance.
4.  **The Proof:** Show what’s built—the working vertical slice, the PWA, the hash-chain ledger, and the active fraud detection system.
5.  **The Impact:** Conclude with how the system changes the cost of hiding information, making transparency the easiest path for authorities.
