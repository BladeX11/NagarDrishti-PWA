import { Router } from "express";
import { CANONICAL_DEPARTMENT_IDS, issueService } from "../services/issueService.js";
import { workflowService } from "../services/workflowService.js";
import { verificationService } from "../services/verificationService.js";
import { adversarialService } from "../services/adversarialService.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { aiQueue } from "../ai/queue.js";
import multer from "multer";
import { notificationService } from "../services/notificationService.js";
import { storeIssueImage } from "../services/objectStorage.js";
import { isSafePublicMediaUrl } from "../services/privacyService.js";
import { CATEGORIES, type Category } from "../../shared/types.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_MEDIA_TYPES = new Set(["before", "after", "proof"]);
const VALID_VOTES = new Set(["fixed", "not_fixed", "unsure"]);
const VALID_DEPARTMENTS = new Set<string>(CANONICAL_DEPARTMENT_IDS);

function sendDomainError(res: any, error: any) {
  const message = error?.message ?? "Internal server error";
  if (message === "Issue not found") {
    return res.status(404).json({ success: false, error: message });
  }
  if (message.includes("not authorized")) {
    return res.status(403).json({ success: false, error: message });
  }
  if (
    message.startsWith("Invalid status transition") ||
    message.startsWith("Cannot transition") ||
    message.startsWith("Cannot advance") ||
    message.includes("already supporting") ||
    message.includes("already voted") ||
    message.includes("Can only verify") ||
    message.includes("Vote must be") ||
    message.includes("identical image")
  ) {
    return res.status(400).json({ success: false, error: message });
  }
  return res.status(500).json({ success: false, error: message });
}

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/"))
      return callback(new Error("Only image files are allowed"));
    callback(null, true);
  },
});
const uploadPhoto = (req: any, res: any, next: any) =>
  upload.single("photo")(req, res, (error: any) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE")
      return res
        .status(413)
        .json({ success: false, error: "Photo must be 15 MB or smaller" });
    return res
      .status(400)
      .json({ success: false, error: error.message || "Photo upload failed" });
  });

router.get("/", async (req, res) => {
  try {
    const issues = await issueService.listIssues({
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      category:
        typeof req.query.category === "string" ? req.query.category : undefined,
      wardId: typeof req.query.wardId === "string" ? req.query.wardId : undefined,
      departmentId:
        typeof req.query.departmentId === "string"
          ? req.query.departmentId
          : undefined,
      page: typeof req.query.page === "string" ? Number(req.query.page) : undefined,
      limit:
        typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, data: issues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/mine", requireAuth, requireRole("citizen"), async (req, res) => {
  try {
    const data = await issueService.listIssues({
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      page: typeof req.query.page === "string" ? Number(req.query.page) : undefined,
      limit:
        typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
      reporterId: req.user!.id,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  "/",
  requireAuth,
  requireRole("citizen"),
  uploadPhoto,
  async (req, res) => {
    try {
      const title =
        typeof req.body.title === "string" ? req.body.title.trim() : "";
      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);
      if (
        !title ||
        !req.body.category ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          error: "Title, category, and valid coordinates are required",
        });
      }
      const issue = await issueService.createIssue(
        {
          title,
          description:
            typeof req.body.description === "string"
              ? req.body.description
              : undefined,
          category: String(req.body.category),
          language:
            typeof req.body.language === "string"
              ? req.body.language
              : undefined,
          latitude,
          longitude,
          photoDataUrl:
            typeof req.body.photoDataUrl === "string"
              ? req.body.photoDataUrl
              : undefined,
          photo: req.file
            ? {
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
              }
            : undefined,
        },
        req.user!.id
      );
      res.json({ success: true, data: issue });
    } catch (error: any) {
      console.error("[POST /api/issues] ERROR:", error?.message ?? error);
      if (
        error?.message ===
        "An identical image has already been submitted for another issue."
      ) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({
          success: false,
          error: error.message,
          detail:
            process.env.NODE_ENV !== "production"
              ? (error?.detail ?? error?.stack?.slice(0, 300))
              : undefined,
        });
      }
    }
  }
);

router.get("/:id", async (req, res) => {
  try {
    const issue = await issueService.getIssue(req.params.id);
    if (!issue)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch("/:id", requireAuth, requireRole("officer", "admin"), async (req, res) => {
  try {
    const resolvedId = await issueService.resolveIssueId(req.params.id);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "Issue not found" });
    }

    const updates: Partial<{
      category: string;
      departmentId: string;
      assignedTo: string;
      priority: number;
      urgencyExplanation: string;
    }> = {};

    if (req.body.category !== undefined) {
      if (!CATEGORIES.includes(req.body.category as Category)) {
        return res.status(400).json({ success: false, error: "Invalid category" });
      }
      updates.category = req.body.category;
    }
    if (req.body.departmentId !== undefined) {
      if (!VALID_DEPARTMENTS.has(String(req.body.departmentId))) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid departmentId" });
      }
      updates.departmentId = String(req.body.departmentId);
    }
    if (req.body.assignedTo !== undefined) {
      if (!UUID_RE.test(String(req.body.assignedTo))) {
        return res
          .status(400)
          .json({ success: false, error: "assignedTo must be a valid UUID" });
      }
      updates.assignedTo = String(req.body.assignedTo);
    }
    if (req.body.priority !== undefined) {
      const priority = Number(req.body.priority);
      if (!Number.isInteger(priority) || priority < 1 || priority > 4) {
        return res
          .status(400)
          .json({ success: false, error: "priority must be between 1 and 4" });
      }
      updates.priority = priority;
    }
    if (req.body.urgencyExplanation !== undefined) {
      if (typeof req.body.urgencyExplanation !== "string") {
        return res
          .status(400)
          .json({ success: false, error: "urgencyExplanation must be a string" });
      }
      updates.urgencyExplanation = req.body.urgencyExplanation;
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No valid editable fields provided" });
    }

    await issueService.updateIssue(resolvedId, updates);
    const enriched = await issueService.getIssue(resolvedId);
    res.json({ success: true, data: enriched });
  } catch (error: any) {
    return sendDomainError(res, error);
  }
});

router.post(
  "/:id/support",
  requireAuth,
  requireRole("citizen"),
  async (req, res) => {
    try {
      const resolvedId = await issueService.resolveIssueId(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }
      await issueService.supportIssue(resolvedId, req.user!.id);
      const enriched = await issueService.getIssue(resolvedId);
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      return sendDomainError(res, error);
    }
  }
);

router.post(
  "/:id/assign",
  requireAuth,
  requireRole("officer", "admin"),
  async (req, res) => {
    try {
      const resolvedId = await issueService.resolveIssueId(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }
      await workflowService.transitionStatus(
        resolvedId,
        "Assigned",
        req.user!.id,
        req.user!.role,
        "Assigned to officer"
      );
      await issueService.updateIssue(resolvedId, {
        assignedTo: req.user!.id,
      });
      const enriched = await issueService.getIssue(resolvedId);
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      return sendDomainError(res, error);
    }
  }
);

router.post(
  "/:id/status",
  requireAuth,
  requireRole("officer", "admin"),
  async (req, res) => {
    try {
      const resolvedId = await issueService.resolveIssueId(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }
      const { toStatus, reason } = req.body;
      if (typeof toStatus !== "string" || !toStatus.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "toStatus is required" });
      }
      const transitioned = await workflowService.transitionStatus(
        resolvedId,
        toStatus,
        req.user!.id,
        req.user!.role,
        typeof reason === "string" ? reason : undefined
      );
      if (transitioned.reporterId)
        void notificationService.sendToUser(transitioned.reporterId, {
          title: `Issue ${transitioned.publicRef} updated`,
          body: `Status changed to ${toStatus}.`,
          url: `/citizen/issue/${transitioned.id}`,
        });
      const enriched = await issueService.getIssue(resolvedId);
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      return sendDomainError(res, error);
    }
  }
);

router.post(
  "/:id/proof",
  requireAuth,
  requireRole("officer", "admin"),
  async (req, res) => {
    try {
      const resolvedId = await issueService.resolveIssueId(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }
      await issueService.submitProof(resolvedId, req.body?.note);

      // Async adversarial checks
      if (typeof req.body?.mediaId === "string" && UUID_RE.test(req.body.mediaId)) {
        adversarialService
          .runProofChecks(resolvedId, req.body.mediaId)
          .catch((err) => {
            console.error(
              "[adversarial] proof check failed for",
              resolvedId,
              err
            );
          });
      }

      const enriched = await issueService.getIssue(resolvedId);
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      return sendDomainError(res, error);
    }
  }
);

router.post(
  "/:id/proof/review",
  requireAuth,
  requireRole("officer", "admin"),
  async (req, res) => {
    try {
      const resolvedId = await issueService.resolveIssueId(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }
      const decision =
        req.body.decision === "accepted"
          ? "accepted"
          : req.body.decision === "rejected"
            ? "rejected"
            : null;
      if (!decision)
        return res.status(400).json({
          success: false,
          error: "Decision must be accepted or rejected",
        });
      await issueService.reviewProof(resolvedId, decision);
      const enriched = await issueService.getIssue(resolvedId);
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      return sendDomainError(res, error);
    }
  }
);

router.post(
  "/:id/verify",
  requireAuth,
  requireRole("citizen"),
  async (req, res) => {
    try {
      const resolvedId = await issueService.resolveIssueId(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }
      const { vote, proofVersion } = req.body;
      if (!VALID_VOTES.has(vote)) {
        return res.status(400).json({
          success: false,
          error: "Vote must be one of: fixed, not_fixed, unsure",
        });
      }
      const result = await verificationService.castVote(
        resolvedId,
        req.user!.id,
        vote,
        typeof proofVersion === "number" ? proofVersion : undefined
      );
      const summary = await verificationService.getVoteSummary(
        resolvedId,
        result.proofVersion ?? undefined
      );
      res.json({ success: true, data: { vote: result, summary } });
    } catch (error: any) {
      return sendDomainError(res, error);
    }
  }
);

router.get("/:id/timeline", async (req, res) => {
  try {
    const resolvedId = await issueService.resolveIssueId(req.params.id);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "Issue not found" });
    }
    const { auditService } = await import("../services/auditService.js");
    const timeline = await auditService.getIssueTimeline(resolvedId);
    const formatted = timeline.map((event) => {
      const iso = (event.createdAt ?? new Date()).toISOString();
      return {
        id: event.id,
        sequenceNum: event.sequenceNum,
        issueId: event.issueId,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        actor:
          event.actorRole === "system"
            ? "System AI"
            : event.actorRole === "citizen"
              ? "Citizen"
              : "Officer",
        actorRole: event.actorRole,
        reason: event.reason,
        prevHash: event.prevHash,
        eventHash: event.eventHash,
        createdAt: iso,
        timestamp: iso,
      };
    });
    res.json({ success: true, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id/duplicates", async (req, res) => {
  try {
    const resolvedId = await issueService.resolveIssueId(req.params.id);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "Issue not found" });
    }
    const { aiOrchestrator } = await import("../ai/orchestrator.js");
    const data = await aiOrchestrator.listDuplicates();
    res.json({
      success: true,
      data: data.filter(
        (item) => item.issueAId === resolvedId || item.issueBId === resolvedId
      ),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id/graph", async (req, res) => {
  try {
    const resolvedId = await issueService.resolveIssueId(req.params.id);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "Issue not found" });
    }
    const { issueGraphService } = await import("../ai/graph.js");
    const graph = await issueGraphService.list();
    res.json({
      success: true,
      data: {
        ...graph,
        nodes: graph.nodes.filter((node) => node.id === resolvedId),
        edges: graph.edges.filter(
          (edge) => edge.issueAId === resolvedId || edge.issueBId === resolvedId
        ),
        clusters: graph.clusters.filter((cluster) =>
          cluster.issueIds.includes(resolvedId)
        ),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  "/:id/ai/infer",
  requireAuth,
  requireRole("officer", "admin", "researcher"),
  async (req, res) => {
    try {
      const resolvedId = await issueService.resolveIssueId(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }
      const job = await aiQueue.enqueueIssueInference(resolvedId);
      res.status(202).json({ success: true, data: job });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  "/:id/media",
  requireAuth,
  requireRole("citizen", "officer", "admin"),
  uploadPhoto,
  async (req, res) => {
    try {
      const issueOwner = await issueService.resolveIssueOwner(req.params.id);
      if (!issueOwner) {
        return res.status(404).json({ success: false, error: "Issue not found" });
      }

      if (
        req.user!.role === "citizen" &&
        issueOwner.reporterId !== req.user!.id
      ) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: only the issue reporter or an officer/admin can attach media",
        });
      }

      const mediaType =
        typeof req.body?.type === "string" && req.body.type.trim()
          ? req.body.type.trim()
          : "before";
      if (!VALID_MEDIA_TYPES.has(mediaType)) {
        return res.status(400).json({
          success: false,
          error: "Media type must be one of: before, after, proof",
        });
      }

      let buffer: Buffer;
      let mimeType: string;

      if (req.file && req.file.buffer && req.file.buffer.length > 0) {
        buffer = req.file.buffer;
        mimeType = req.file.mimetype || "image/jpeg";
      } else if (typeof req.body?.dataUrl === "string" && req.body.dataUrl) {
        const matches = req.body.dataUrl.match(
          /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i
        );
        if (!matches) {
          return res.status(400).json({
            success: false,
            error: "Valid base64 image dataUrl (jpeg, png, webp) or photo file is required",
          });
        }
        mimeType = matches[1].toLowerCase();
        buffer = Buffer.from(matches[2].replace(/\s+/g, ""), "base64");
        if (buffer.length === 0) {
          return res
            .status(400)
            .json({ success: false, error: "Decoded image payload is empty" });
        }
      } else {
        return res
          .status(400)
          .json({ success: false, error: "Photo file or dataUrl is required" });
      }

      const { db } = await import("../db/index.js");
      const { issueMedia } = await import("../db/schema.js");
      const { createHash } = await import("crypto");

      const fileHash = createHash("sha256").update(buffer).digest("hex");
      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : "jpg";
      const stored = await storeIssueImage({ buffer, mimeType, extension });

      const [saved] = await db
        .insert(issueMedia)
        .values({
          issueId: issueOwner.id,
          type: mediaType,
          privatePath: stored.privatePath,
          publicPath: stored.publicPath,
          fileHash,
          perceptualHash: fileHash.substring(0, 16),
          fileSize: buffer.length,
          mimeType,
        })
        .returning();

      res.json({
        success: true,
        data: {
          id: saved.id,
          issueId: saved.issueId,
          type: saved.type,
          publicPath: isSafePublicMediaUrl(saved.publicPath)
            ? saved.publicPath
            : null,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
          status: "saved",
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
