/**
 * tree-generator.ts
 * Initializes and updates a user's curriculum-driven skill tree.
 *
 * Radial layout algorithm:
 *   - Hub at (0, 0)
 *   - Each subject arm at angle = (subjectIndex / numSubjects) * 2π – π/2
 *   - Tier t at radius = HUB_RADIUS + (t-1) * TIER_SPACING
 */

import { TreeNodeStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { Schulart } from "@/lib/curriculum";

const HUB_RADIUS   = 320;  // px from center to first tier
const TIER_SPACING = 260;  // px between tiers

export interface DisplayNode {
  id:           string;
  slug:         string;
  title:        string;
  description:  string;
  icon:         string;    // from subject
  color:        string;    // from subject
  x:            number;
  y:            number;
  type:         "hub" | "subject" | "fusion";
  isHub:        boolean;
  tier:         number;
  status:       TreeNodeStatus;
  masteryTier:  number;
  questsDone:   number;
  questsNeeded: number;
  prerequisites: string[];  // node IDs
  subjectKey:   string | null;
  subjectLabel: string | null;
}

export interface DisplayEdge {
  fromId: string;
  toId:   string;
  active: boolean;  // true when fromId is MASTERED
}

/**
 * Build the tree state for a user, computing radial positions from the
 * subject set derived from their curriculum profile.
 * Returns DisplayNodes and DisplayEdges ready to render on canvas.
 */
export async function getUserTreeState(
  userId: string,
  subjectIds: string[],
): Promise<{ nodes: DisplayNode[]; edges: DisplayEdge[] }> {
  // Fetch all TreeNodes that belong to these subjects + the hub
  const treeNodes = await prisma.treeNode.findMany({
    where: {
      OR: [{ isHub: true }, { subjectId: { in: subjectIds } }],
    },
    include: {
      subject: true,
      prerequisites: { include: { requires: true } },
      quests: { select: { id: true } },
    },
    orderBy: [{ subjectId: "asc" }, { tier: "asc" }],
  });

  // Fetch user progress
  const progressRows = await prisma.userTreeProgress.findMany({
    where: { userId, nodeId: { in: treeNodes.map((n) => n.id) } },
  });
  const progressMap = new Map(progressRows.map((p) => [p.nodeId, p]));

  // Group non-hub nodes by subjectId
  const hub = treeNodes.find((n) => n.isHub);
  if (!hub) return { nodes: [], edges: [] };
  const bySubject = new Map<string, typeof treeNodes>();
  for (const node of treeNodes) {
    if (node.isHub || !node.subjectId) continue;
    const arr = bySubject.get(node.subjectId) ?? [];
    arr.push(node);
    bySubject.set(node.subjectId, arr);
  }

  // Compute angles per subject (radial "galaxy" layout)
  const subjectList = [...bySubject.keys()];
  const N = subjectList.length;
  const angleMap = new Map<string, number>();
  subjectList.forEach((sid, i) => {
    angleMap.set(sid, (i / N) * 2 * Math.PI - Math.PI / 2);
  });

  const nodeIdToDisplay = new Map<string, DisplayNode>();

  // Hub node at origin
  const hubProgress = progressMap.get(hub.id);
  const hubDisplay: DisplayNode = {
    id:            hub.id,
    slug:          hub.slug,
    title:         hub.title,
    description:   hub.description,
    icon:          "🌟",
    color:         "#f59e0b",
    x:             0,
    y:             0,
    type:          "hub",
    isHub:         true,
    tier:          0,
    status:        hubProgress?.status ?? TreeNodeStatus.AVAILABLE,
    masteryTier:   hubProgress?.masteryTier ?? 0,
    questsDone:    hubProgress?.questsDone ?? 0,
    questsNeeded:  hub.requiredQuestCount,
    prerequisites: [],
    subjectKey:    null,
    subjectLabel:  null,
  };
  nodeIdToDisplay.set(hub.id, hubDisplay);

  // Subject tier nodes
  for (const [subjectId, nodes] of bySubject) {
    const angle = angleMap.get(subjectId) ?? 0;
    const cosA  = Math.cos(angle);
    const sinA  = Math.sin(angle);
    const subject = nodes[0]!.subject;

    nodes.sort((a, b) => a.tier - b.tier);

    for (const node of nodes) {
      const r = HUB_RADIUS + (node.tier - 1) * TIER_SPACING;
      const x = cosA * r;
      const y = sinA * r;
      const prog = progressMap.get(node.id);

      const display: DisplayNode = {
        id:            node.id,
        slug:          node.slug,
        title:         node.title,
        description:   node.description,
        icon:          subject?.icon ?? "📚",
        color:         subject?.color ?? "#6366f1",
        x,
        y,
        type:          "subject",
        isHub:         false,
        tier:          node.tier,
        status:        prog?.status ?? TreeNodeStatus.HIDDEN,
        masteryTier:   prog?.masteryTier ?? 0,
        questsDone:    prog?.questsDone ?? 0,
        questsNeeded:  node.requiredQuestCount,
        prerequisites: node.prerequisites.map((p) => p.requiresNodeId),
        subjectKey:    subject?.key ?? null,
        subjectLabel:  subject?.label ?? null,
      };
      nodeIdToDisplay.set(node.id, display);
    }
  }

  // Build edges
  const edges: DisplayEdge[] = [];
  for (const node of treeNodes) {
    for (const prereq of node.prerequisites) {
      const fromProgress = progressMap.get(prereq.requiresNodeId);
      edges.push({
        fromId: prereq.requiresNodeId,
        toId:   node.id,
        active: fromProgress?.status === TreeNodeStatus.MASTERED,
      });
    }
  }

  return { nodes: [...nodeIdToDisplay.values()], edges };
}

/**
 * Initialize UserTreeProgress rows for a new user.
 * Hub starts as AVAILABLE, all subject nodes as HIDDEN.
 * Only creates rows that don't already exist.
 */
export async function initializeUserTree(
  userId: string,
  subjectIds: string[],
): Promise<void> {
  const treeNodes = await prisma.treeNode.findMany({
    where: {
      OR: [{ isHub: true }, { subjectId: { in: subjectIds } }],
    },
    select: { id: true, isHub: true },
  });

  const existing = await prisma.userTreeProgress.findMany({
    where: { userId, nodeId: { in: treeNodes.map((n) => n.id) } },
    select: { nodeId: true },
  });
  const existingSet = new Set(existing.map((e) => e.nodeId));

  const toCreate = treeNodes
    .filter((n) => !existingSet.has(n.id))
    .map((n) => ({
      userId,
      nodeId: n.id,
      status: n.isHub ? TreeNodeStatus.AVAILABLE : TreeNodeStatus.HIDDEN,
    }));

  if (toCreate.length > 0) {
    await prisma.userTreeProgress.createMany({ data: toCreate });
  }
}

/**
 * After a node is mastered, update the status of its direct children.
 * Children become REVEALED (teaser visible) or AVAILABLE (can start quests).
 */
export async function propagateUnlocks(
  userId: string,
  masteredNodeId: string,
): Promise<string[]> {
  // Find nodes that have masteredNodeId as a prerequisite
  const candidates = await prisma.treeNode.findMany({
    where: { prerequisites: { some: { requiresNodeId: masteredNodeId } } },
    include: { prerequisites: true },
  });

  const newlyAvailable: string[] = [];

  for (const candidate of candidates) {
    // Check all prerequisites are MASTERED
    const prereqIds  = candidate.prerequisites.map((p) => p.requiresNodeId);
    const prereqRows = await prisma.userTreeProgress.findMany({
      where: { userId, nodeId: { in: prereqIds } },
    });
    const allMet = prereqRows.length === prereqIds.length
      && prereqRows.every((r) => r.status === TreeNodeStatus.MASTERED);

    if (allMet) {
      await prisma.userTreeProgress.upsert({
        where:  { userId_nodeId: { userId, nodeId: candidate.id } },
        create: { userId, nodeId: candidate.id, status: TreeNodeStatus.AVAILABLE },
        update: { status: TreeNodeStatus.AVAILABLE },
      });
      newlyAvailable.push(candidate.id);
    } else {
      // Reveal as teaser if at least one prereq is met
      const someMet = prereqRows.some((r) => r.status === TreeNodeStatus.MASTERED);
      if (someMet) {
        const row = await prisma.userTreeProgress.findUnique({
          where: { userId_nodeId: { userId, nodeId: candidate.id } },
          select: { status: true },
        });
        if (!row) {
          await prisma.userTreeProgress.create({
            data: { userId, nodeId: candidate.id, status: TreeNodeStatus.REVEALED },
          });
        } else if (row.status === TreeNodeStatus.HIDDEN) {
          await prisma.userTreeProgress.update({
            where: { userId_nodeId: { userId, nodeId: candidate.id } },
            data:  { status: TreeNodeStatus.REVEALED },
          });
        }
      }
    }
  }

  return newlyAvailable;
}
