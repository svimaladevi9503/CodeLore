import { RepoTreeNode } from "../../types";

export interface CleanerAgentViewProps {
  theme: "light" | "dark";
  repoName: string;
  owner: string;
}

export interface TreeFolder {
  name: string;
  path: string;
  children: (TreeFolder | TreeFile)[];
  type: "tree";
}

export interface TreeFile {
  name: string;
  path: string;
  size?: number;
  sha: string;
  ignored?: boolean;
  type: "blob";
}

export type TreeNode = TreeFolder | TreeFile;
