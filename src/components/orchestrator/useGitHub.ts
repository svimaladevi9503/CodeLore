/* eslint-disable react-doctor/no-derived-state, react-doctor/no-event-handler */
import { useState, useEffect, useCallback } from "react";

export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
}

export interface CommitData {
  sha: string;
  commit: {
    author: { name: string; date: string };
    message: string;
  };
  author: { avatar_url: string; login: string } | null;
  html_url: string;
}

interface UseGitHubParams {
  repoName: string;
  routingEvents: any[];
}

export function useGitHub({ repoName, routingEvents }: UseGitHubParams) {
  const [token, setToken] = useState(() => localStorage.getItem("gh_session") || "");
  const [inputToken, setInputToken] = useState("");
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [loadingGh, setLoadingGh] = useState(false);
  const [errorGh, setErrorGh] = useState("");
  const [commits, setCommits] = useState<CommitData[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [errorCommits, setErrorCommits] = useState("");

  const fetchCommits = useCallback(async (selectedRepoName?: string) => {
    const targetRepo = selectedRepoName || repoName;
    if (!token || !targetRepo || !ghUser) {
      setCommits([]);
      return;
    }

    const selected = ghRepos.find((r: GitHubRepo) => r.name === targetRepo);
    if (!selected && ghRepos.length > 0) {
      setCommits([]);
      return;
    }

    setLoadingCommits(true);
    setErrorCommits("");
    try {
      const fullName = selected ? selected.full_name : `${ghUser.login}/${targetRepo}`;
      const res = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=15`, {
        headers: { Authorization: `token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch repository commits");
      const data = await res.json();
      setCommits(data);
    } catch (err: any) {
      setErrorCommits(err.message || "Failed to load commits");
      setCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  }, [repoName, token, ghUser, ghRepos]);

  useEffect(() => {
    if (token && repoName && ghUser && ghRepos.length > 0) {
      fetchCommits();
    }
  }, [fetchCommits, token, repoName, ghUser, ghRepos, routingEvents]);

  const fetchGithubData = useCallback(async (accessToken: string) => {
    console.log("[useGitHub] fetchGithubData started, token length:", accessToken?.length);
    setLoadingGh(true);
    setErrorGh("");
    try {
      console.log("[useGitHub] Fetching user info from GitHub API...");
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${accessToken}` },
      });
      if (!userRes.ok) {
        console.error("[useGitHub] User API returned non-OK status:", userRes.status);
        throw new Error("Invalid GitHub token");
      }
      const userData = await userRes.json();
      console.log("[useGitHub] Successfully authenticated user:", userData.login);

      console.log("[useGitHub] Fetching repos list from GitHub API...");
      const reposRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: { Authorization: `token ${accessToken}` },
      });
      if (!reposRes.ok) {
        console.error("[useGitHub] Repos API returned non-OK status:", reposRes.status);
        throw new Error("Failed to fetch repositories");
      }
      const reposData = await reposRes.json();
      console.log("[useGitHub] Successfully loaded repos count:", reposData?.length);

      setGhUser({ login: userData.login, avatar_url: userData.avatar_url });
      setGhRepos(reposData);
      localStorage.setItem("gh_session", accessToken);
      localStorage.setItem("github_token", accessToken);
      setToken(accessToken);
    } catch (err: any) {
      console.error("[useGitHub] Authentication flow failed:", err);
      setErrorGh(err.message || "GitHub authorization failed");
      setGhUser(null);
      setGhRepos([]);
      localStorage.removeItem("gh_session");
      localStorage.removeItem("github_token");
      setToken("");
    } finally {
      setLoadingGh(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (token && !ghUser) {
      fetchGithubData(token);
    }
  }, [fetchGithubData, token, ghUser]);

  const handleConnect = () => {
    if (!inputToken.trim()) return;
    fetchGithubData(inputToken.trim());
  };

  const handleDisconnect = () => {
    localStorage.removeItem("gh_session");
    setToken("");
    setGhUser(null);
    setGhRepos([]);
    setInputToken("");
  };

  return {
    token,
    setToken,
    inputToken,
    setInputToken,
    ghUser,
    setGhUser,
    ghRepos,
    setGhRepos,
    loadingGh,
    errorGh,
    commits,
    loadingCommits,
    errorCommits,
    fetchCommits,
    handleConnect,
    handleDisconnect,
  };
}
