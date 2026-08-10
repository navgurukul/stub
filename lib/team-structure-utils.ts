import { EmployeeReportee, FlatEmployee } from "@/lib/team-structure-type";
export function getInitials(nameOrEmail?: string): string {
  if (!nameOrEmail) return "??";
  const clean = nameOrEmail.split("@")[0].replace(/[._-]/g, " ");
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0] ? parts[0].substring(0, 2).toUpperCase() : "??";
}


export function displayName(name?: string, email?: string): string {
  if (name && !name.includes("@")) return name;
  const username = email ? email.split("@")[0] : "";
  if (!username) return "Unknown";
  return username
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get CSS styles mapping based on department
 */
export const getDeptStyles = (dept: string | null) => {
  if (!dept) return {
    text: "text-zinc-500 dark:text-zinc-400",
    avatar: "bg-zinc-400 text-white dark:bg-zinc-600"
  };

  const d = dept.toLowerCase();
  if (
    d.includes("ceo") ||
    d.includes("leader") ||
    d.includes("director") ||
    d.includes("leadership")
  ) {
    return {
      text: "text-orange-600 dark:text-orange-400",
      avatar: "bg-orange-500 text-white"
    };
  }
  if (
    d.includes("engineer") ||
    d.includes("tech") ||
    d.includes("cio") ||
    d.includes("office") ||
    d.includes("engineering")
  ) {
    return {
      text: "text-blue-600 dark:text-blue-400",
      avatar: "bg-blue-500 text-white"
    };
  }
  if (
    d.includes("program") ||
    d.includes("ops") ||
    d.includes("operation") ||
    d.includes("operations") ||
    d.includes("finance") ||
    d.includes("placement") ||
    d.includes("placements")
  ) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      avatar: "bg-emerald-500 text-white"
    };
  }

  return {
    text: "text-purple-600 dark:text-purple-400",
    avatar: "bg-purple-500 text-white"
  };
};


export const sanitizeEmail = (email: string): string => {
  if (!email) return "";
  return email.trim().replace(/"/g, '').toLowerCase();
};

/**
 * Traverse the tree and get all emails of managers/people with reportees
 */
export function getAllEmails(nodes: EmployeeReportee[]): string[] {
  const emails: string[] = [];
  function traverse(node: EmployeeReportee) {
    if (node.reportees && node.reportees.length > 0) {
      emails.push(node.email);
      node.reportees.forEach(traverse);
    }
  }
  nodes.forEach(traverse);
  return emails;
}

export function filterTree(
  nodes: EmployeeReportee[],
  query: string
): { filtered: EmployeeReportee[]; matchedEmails: Set<string> } {
  const lowercaseQuery = query.toLowerCase().trim();
  const matchedEmails = new Set<string>();

  if (!nodes) {
    return { filtered: [], matchedEmails };
  }

  if (!lowercaseQuery) {
    return { filtered: nodes, matchedEmails };
  }

  function checkNode(node: EmployeeReportee): EmployeeReportee | null {
    if (!node) return null;

    const computedName = displayName(node.name || node.manager, node.email).toLowerCase();
    const displayNameStr = (node.name || node.manager || "").toLowerCase();
    const emailStr = (node.email || "").toLowerCase();
    const deptStr = (node.department || "").toLowerCase();

    const matchesSelf =
      computedName.includes(lowercaseQuery) ||
      displayNameStr.includes(lowercaseQuery) ||
      emailStr.includes(lowercaseQuery) ||
      deptStr.includes(lowercaseQuery);

    const filteredReportees: EmployeeReportee[] = [];
    if (node.reportees) {
      for (const child of node.reportees) {
        const result = checkNode(child);
        if (result) {
          filteredReportees.push(result);
        }
      }
    }

    if (matchesSelf || filteredReportees.length > 0) {
      if (matchesSelf) {
        matchedEmails.add(node.email);
      }
      return {
        ...node,
        reportees: filteredReportees,
      };
    }

    return null;
  }

  const filtered = nodes
    .map((node) => checkNode(node))
    .filter((node): node is EmployeeReportee => node !== null);

  return { filtered, matchedEmails };
}

/**
 * Build a nested tree from a flat reportee list
 */
export function buildTree(flatData: EmployeeReportee[]): EmployeeReportee[] {
  const nodesMap = new Map<string, EmployeeReportee>();
  const childEmails = new Set<string>();

  flatData.forEach((item) => {
    if (!item.email) return;
    const email = sanitizeEmail(item.email);
    nodesMap.set(email, {
      manager: item.manager ? sanitizeEmail(item.manager) : undefined,
      name: item.name || item.manager || item.email,
      email: email,
      department: item.department,
      reporteesCount: item.reporteesCount,
      reportees: [],
    });
  });

  flatData.forEach((item) => {
    if (!item.email) return;
    const parentEmail = sanitizeEmail(item.email);
    const parentNode = nodesMap.get(parentEmail)!;

    if (item.reportees && Array.isArray(item.reportees)) {
      item.reportees.forEach((child) => {
        if (!child.email) return;
        const childEmail = sanitizeEmail(child.email);
        childEmails.add(childEmail);

        let childNode = nodesMap.get(childEmail);
        if (!childNode) {
          childNode = {
            manager: parentEmail,
            name: child.name || child.manager || child.email,
            email: childEmail,
            department: child.department,
            reporteesCount: child.reporteesCount || 0,
            reportees: [],
          };
          nodesMap.set(childEmail, childNode);
        } else {
          if (!childNode.manager) {
            childNode.manager = parentEmail;
          }
        }

        if (!parentNode.reportees!.some(r => sanitizeEmail(r.email) === childEmail)) {
          parentNode.reportees!.push(childNode);
        }
      });
    }
  });

  const roots: EmployeeReportee[] = [];
  nodesMap.forEach((node, email) => {
    if (!childEmails.has(email)) {
      roots.push(node);
    }
  });

  if (roots.length === 0 && nodesMap.size > 0) {
    nodesMap.forEach((node) => {
      if (!node.manager || !nodesMap.has(node.manager)) {
        roots.push(node);
      }
    });
  }

  if (roots.length === 0) {
    return flatData;
  }

  return roots.sort((a, b) => b.reporteesCount - a.reporteesCount);
}


export function flattenTree(roots: EmployeeReportee[]): FlatEmployee[] {
  const list: FlatEmployee[] = [];
  const visited = new Set<string>();

  function traverse(node: EmployeeReportee, parentNode?: EmployeeReportee) {
    if (!node) return;
    const emailKey = sanitizeEmail(node.email);
    if (visited.has(emailKey)) return;
    visited.add(emailKey);

    const name = displayName(node.name || node.manager, node.email);
    const managerName = parentNode ? displayName(parentNode.name || parentNode.manager, parentNode.email) : undefined;

    list.push({
      email: node.email,
      name,
      department: node.department,
      managerName,
      reporteesCount: node.reporteesCount,
    });

    if (node.reportees) {
      node.reportees.forEach((child) => traverse(child, node));
    }
  }

  roots.forEach((root) => traverse(root));
  return list;
}

export function findPathToNode(
  nodes: EmployeeReportee[],
  targetEmail: string,
  currentPath: EmployeeReportee[] = []
): EmployeeReportee[] | null {
  for (const node of nodes) {
    const pathWithNode = [...currentPath, node];
    if (node.email.toLowerCase().trim() === targetEmail.toLowerCase().trim()) {
      return pathWithNode;
    }
    if (node.reportees && node.reportees.length > 0) {
      const found = findPathToNode(node.reportees, targetEmail, pathWithNode);
      if (found) return found;
    }
  }
  return null;
}
