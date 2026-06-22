import { RepoTreeNode } from "../../types";
import { TreeNode, TreeFolder } from "./types";

export function buildTree(flatNodes: RepoTreeNode[]): TreeNode[] {
  const root: TreeFolder = { name: "", path: "", children: [], type: "tree" };
  const dirMap = new Map<string, TreeFolder>();
  dirMap.set("", root);

  // Ensure parent directories exist
  const ensureDir = (dirPath: string): TreeFolder => {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath)!;
    const parts = dirPath.split("/");
    const parentPath = parts.slice(0, -1).join("/");
    const parent = ensureDir(parentPath);
    const folder: TreeFolder = { name: parts[parts.length - 1], path: dirPath, children: [], type: "tree" };
    dirMap.set(dirPath, folder);
    parent.children.push(folder);
    return folder;
  };

  for (const node of flatNodes) {
    const parts = node.path.split("/");
    if (node.type === "tree") {
      ensureDir(node.path);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = ensureDir(parentPath);
      parent.children.push({
        name: parts[parts.length - 1],
        path: node.path,
        size: node.size,
        sha: node.sha,
        ignored: node.ignored,
        type: "blob",
      });
    }
  }

  // Sort: folders first, then files alphabetically
  const sortChildren = (children: TreeNode[]): TreeNode[] => {
    return children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(child => {
      if (child.type === "tree") {
        (child as TreeFolder).children = sortChildren((child as TreeFolder).children);
      }
      return child;
    });
  };

  root.children = sortChildren(root.children);
  return root.children;
}
