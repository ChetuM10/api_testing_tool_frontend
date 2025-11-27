import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import Auth from "./Auth";
import {
  History,
  Folder,
  LogOut,
  Plus,
  Send,
  Save,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  FileCode,
  Clock,
  Settings,
  Edit3,
  Trash2,
  AlertCircle,
  Code2,
  Play,
  Box,
  Layout,
  Sun,
  Moon,
  Info,
} from "lucide-react";

// React Ace imports
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties"; // Dark Theme
import "ace-builds/src-noconflict/theme-chrome"; // Light Theme
import "ace-builds/src-noconflict/ext-language_tools";

// Worker fix for Vite
import ace from "ace-builds";
import jsonWorkerUrl from "ace-builds/src-noconflict/worker-json?url";
ace.config.setModuleUrl("ace/mode/json_worker", jsonWorkerUrl);

// Initialize Supabase Client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// --- STATUS CODE TEXT MAPPING ---
const STATUS_TEXT = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

// --- ERROR DISPLAY COMPONENT ---
const ErrorDisplay = ({ error }) => (
  <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-6 m-4 text-red-800 dark:text-red-200 shadow-lg backdrop-blur-sm transition-all">
    <div className="flex items-start gap-4">
      <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg shrink-0">
        <AlertCircle size={24} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error.title}</span>
          {error.status && (
            <span className="text-xs font-mono bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300">
              {error.status}
            </span>
          )}
        </h3>
        <p className="mt-2 text-sm opacity-90 font-mono whitespace-pre-wrap break-words leading-relaxed">
          {error.message}
        </p>
      </div>
    </div>
  </div>
);

// --- HELPER: DETECT JSON ---
const isJsonData = (data) => {
  if (typeof data === "object" && data !== null) return true;
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
};

function App() {
  // --- THEME STATE ---
  const [theme, setTheme] = useState(
    typeof window !== "undefined"
      ? localStorage.getItem("theme") || "dark"
      : "dark"
  );

  // --- AUTH STATE ---
  const [user, setUser] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // --- APP STATE ---
  const [url, setUrl] = useState(
    "https://jsonplaceholder.typicode.com/todos/1"
  );
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState([{ key: "", value: "" }]);
  const [body, setBody] = useState('{\n  "key": "value"\n}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("params");

  // --- SIDEBAR STATE ---
  const [historyItems, setHistoryItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [expandedCols, setExpandedCols] = useState({});
  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState(true);
  const [isCollectionsSectionOpen, setIsCollectionsSectionOpen] =
    useState(true);

  // --- ENVIRONMENT STATE ---
  const [environments, setEnvironments] = useState([]);
  const [activeEnvId, setActiveEnvId] = useState("");
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [envEditor, setEnvEditor] = useState({
    id: null,
    name: "",
    variables: [],
  });

  // --- MODALS ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [saveModal, setSaveModal] = useState({
    open: false,
    name: "",
    colId: "",
  });

  // --- THEME LOGIC ---
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // --- AUTH & INITIAL DATA ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsPasswordRecovery(false);
        setCollections([]);
        setHistoryItems([]);
        setEnvironments([]);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !isPasswordRecovery) {
      fetchHistory();
      fetchCollections();
      fetchEnvironments();
    }
  }, [user, isPasswordRecovery]);

  // --- DATA FETCHING & DELETION ---
  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/history`, {
        headers: { "user-id": user.id },
      });
      setHistoryItems(
        res.data.map((i) => ({
          ...i,
          time: new Date(i.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
      );
    } catch (e) {
      console.error("fetchHistory error:", e);
    }
  };

  const deleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/history/${id}`, {
        headers: { "user-id": user.id },
      });
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to clear all history?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/history`, {
        headers: { "user-id": user.id },
      });
      setHistoryItems([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const fetchCollections = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/collections`, {
        headers: { "user-id": user.id },
      });
      setCollections(res.data);
      if (res.data.length > 0 && !saveModal.colId)
        setSaveModal((p) => ({ ...p, colId: res.data[0].id }));
    } catch (e) {
      console.error("fetchCollections error:", e);
    }
  };

  const fetchEnvironments = async () => {
    const { data } = await supabase
      .from("environments")
      .select("*")
      .order("created_at");
    if (data) setEnvironments(data);
  };

  // --- ENVIRONMENTS LOGIC ---
  const openEnvEditor = async (envId = null) => {
    if (envId) {
      const env = environments.find((e) => e.id === envId);
      const { data: vars } = await supabase
        .from("environment_variables")
        .select("*")
        .eq("environment_id", envId);
      setEnvEditor({ id: envId, name: env.name, variables: vars || [] });
    } else {
      setEnvEditor({
        id: null,
        name: "New Environment",
        variables: [{ key: "", value: "", enabled: true }],
      });
    }
    setIsEnvModalOpen(true);
  };

  const saveEnvironment = async () => {
    let envId = envEditor.id;
    if (envId) {
      await supabase
        .from("environments")
        .update({ name: envEditor.name })
        .eq("id", envId);
    } else {
      const { data } = await supabase
        .from("environments")
        .insert({ user_id: user.id, name: envEditor.name })
        .select()
        .single();
      if (data) envId = data.id;
    }

    if (envId) {
      await supabase
        .from("environment_variables")
        .delete()
        .eq("environment_id", envId);
      const vars = envEditor.variables
        .filter((v) => v.key)
        .map((v) => ({
          environment_id: envId,
          key: v.key,
          value: v.value,
          enabled: v.enabled !== false,
        }));
      if (vars.length)
        await supabase.from("environment_variables").insert(vars);
    }

    await fetchEnvironments();
    if (!activeEnvId) setActiveEnvId(envId);
    setIsEnvModalOpen(false);
  };

  const deleteEnvironment = async () => {
    if (!envEditor.id || !confirm("Delete this environment?")) return;
    await supabase.from("environments").delete().eq("id", envEditor.id);
    await fetchEnvironments();
    if (activeEnvId === envEditor.id) setActiveEnvId("");
    setIsEnvModalOpen(false);
  };

  // --- INTERPOLATION ---
  const interpolate = async (text) => {
    if (!text || !activeEnvId || !text.includes("{{")) return text;
    const { data: vars } = await supabase
      .from("environment_variables")
      .select("key, value")
      .eq("environment_id", activeEnvId)
      .eq("enabled", true);
    if (!vars) return text;

    let result = text;
    vars.forEach((v) => {
      result = result.replaceAll(`{{${v.key}}}`, v.value);
    });
    return result;
  };

  // --- SEND REQUEST ---
  const handleSend = async () => {
    if (!url.trim()) {
      setError({
        title: "Invalid URL",
        message: "Please enter a valid URL to send a request.",
        status: "Client Error",
      });
      return;
    }

    if (!navigator.onLine) {
      setError({
        title: "No Internet Connection",
        message: "You are offline. Please check your network settings.",
        status: "Offline",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const finalUrl = await interpolate(url);

      try {
        new URL(finalUrl);
      } catch {
        throw new Error("Malformed URL");
      }

      const finalHeaders = {};
      for (const h of headers) {
        if (h.key)
          finalHeaders[await interpolate(h.key)] = await interpolate(h.value);
      }

      let finalBody = {};
      try {
        if (body.trim()) {
          const rawBody = await interpolate(body);
          finalBody = JSON.parse(rawBody);
        }
      } catch {
        throw new Error("Invalid JSON Body");
      }

      const res = await axios.post(
        `${BACKEND_URL}/api/proxy`,
        {
          url: finalUrl,
          method,
          headers: finalHeaders,
          body: finalBody,
          user_id: user?.id,
        },
        {
          timeout: 15000,
          validateStatus: () => true,
        }
      );

      if (
        res.status === 500 &&
        res.data?.details &&
        JSON.stringify(res.data.details).includes("ENOTFOUND")
      ) {
        setError({
          title: "Address Not Found",
          message:
            "Could not resolve the domain name. Please check the URL spelling.",
          status: "DNS Error",
        });
        setLoading(false);
        return;
      }

      if (res.status >= 400) {
        const resData = res.data.data;
        const messageToShow =
          resData &&
          JSON.stringify(resData) !== '""' &&
          JSON.stringify(resData) !== "{}"
            ? typeof resData === "object"
              ? JSON.stringify(resData, null, 2)
              : String(resData)
            : "The server returned an empty response.";

        setError({
          title: `Error ${res.status}: ${STATUS_TEXT[res.status] || "Error"}`,
          message: messageToShow,
          status: res.status,
        });
      } else {
        setResponse({
          status: res.data.status,
          data: res.data.data,
          time: res.data.time,
          size: res.data.size,
        });
      }

      if (user) fetchHistory();
    } catch (err) {
      console.error("Request Error:", err);

      let errorPayload = {
        title: "Request Failed",
        message: "An unknown error occurred.",
        status: "Error",
      };

      if (err.message === "Malformed URL") {
        errorPayload = {
          title: "Invalid URL Format",
          message:
            "The URL format is incorrect. Check for typos or missing http/https.",
          status: "Client Error",
        };
      } else if (err.message === "Invalid JSON Body") {
        errorPayload = {
          title: "Invalid JSON",
          message:
            "The request body contains invalid JSON. Please check your syntax.",
          status: "Client Error",
        };
      } else if (err.code === "ERR_NETWORK") {
        errorPayload = {
          title: "Network Error",
          message:
            "Could not reach the backend server. Ensure the backend is running on port 5000.",
          status: "Connection Failed",
        };
      } else if (err.code === "ECONNABORTED") {
        errorPayload = {
          title: "Request Timed Out",
          message: "The server took too long to respond (>15s).",
          status: "Timeout",
        };
      }

      setError(errorPayload);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ACTIONS & HELPERS ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const createCollection = async () => {
    if (!newCollectionName.trim() || !user) return;
    await axios.post(`${BACKEND_URL}/api/collections`, {
      name: newCollectionName,
      user_id: user.id,
    });
    fetchCollections();
    setIsCreateModalOpen(false);
    setNewCollectionName("");
  };

  const handleSave = async () => {
    if (!saveModal.name || !saveModal.colId || !user) return;
    await axios.post(`${BACKEND_URL}/api/collection-items`, {
      collection_id: saveModal.colId,
      name: saveModal.name,
      url,
      method,
      headers: headers.reduce((acc, h) => {
        if (h.key) acc[h.key] = h.value;
        return acc;
      }, {}),
      body: body ? JSON.parse(body) : {},
      user_id: user.id,
    });
    fetchCollections();
    setSaveModal({ open: false, name: "", colId: "" });
  };

  const getStatusColor = (s) =>
    s >= 200 && s < 300
      ? "text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10 border-emerald-500/20"
      : s >= 400
      ? "text-amber-500 bg-amber-100 dark:bg-amber-500/10 border-amber-500/20"
      : "text-rose-500 bg-rose-100 dark:bg-rose-500/10 border-rose-500/20";

  // --- RENDER ---
  if (isPasswordRecovery)
    return (
      <Auth onLogin={() => setIsPasswordRecovery(false)} initialView="update" />
    );
  if (!user) return <Auth onLogin={setUser} initialView="login" />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
      {/* SIDEBAR */}
      <div className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 transition-colors duration-300 h-full overflow-hidden">
        {/* User Profile & Theme Toggle */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user.email}</div>
              <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                Online
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* HISTORY SECTION */}
        <div
          className={`flex flex-col border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${
            isHistorySectionOpen ? "flex-1 min-h-0" : "flex-none"
          }`}
        >
          <div
            onClick={() => setIsHistorySectionOpen((prev) => !prev)}
            className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-widest">
              <Clock size={14} /> History
              {isHistorySectionOpen ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </div>
            {isHistorySectionOpen && historyItems.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearHistory();
                }}
                className="text-[10px] text-slate-400 hover:text-rose-500 font-medium transition-colors"
                title="Clear All History"
              >
                Clear
              </button>
            )}
          </div>

          {isHistorySectionOpen && (
            <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar space-y-1">
              {historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                  <History size={24} className="opacity-20" />
                  <span className="text-xs">No requests yet</span>
                  <span className="text-[10px] opacity-60">
                    Send a request to see it here
                  </span>
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setUrl(item.url);
                      setMethod(item.method);
                    }}
                    className="relative p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group border border-transparent transition-all pr-8"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          item.method === "GET"
                            ? "text-emerald-500 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
                            : "text-indigo-500 border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10"
                        }`}
                      >
                        {item.method}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto font-mono">
                        {item.time}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono w-full">
                      {item.url.replace(/^https?:\/\//, "")}
                    </div>

                    <button
                      onClick={(e) => deleteHistoryItem(e, item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* COLLECTIONS SECTION */}
        <div
          className={`flex flex-col bg-slate-50 dark:bg-slate-900/30 transition-all duration-300 ease-in-out ${
            isCollectionsSectionOpen ? "flex-1 min-h-0" : "flex-none"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setIsCollectionsSectionOpen((prev) => !prev)}
              className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-widest transition-colors flex-1 text-left"
            >
              <Folder size={14} /> Collections
              {isCollectionsSectionOpen ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 p-1.5 rounded-md transition-all"
            >
              <Plus size={14} />
            </button>
          </div>

          {isCollectionsSectionOpen && (
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
              {collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3">
                  <Folder size={24} className="opacity-20" />
                  <span className="text-xs text-center">
                    No collections yet
                  </span>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    Create your first collection
                  </button>
                </div>
              ) : (
                collections.map((col) => (
                  <div
                    key={col.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950/30"
                  >
                    <div
                      onClick={() =>
                        setExpandedCols((p) => ({
                          ...p,
                          [col.id]: !p[col.id],
                        }))
                      }
                      className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {expandedCols[col.id] ? (
                        <ChevronDown size={12} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={12} className="text-slate-400" />
                      )}
                      <Folder size={14} className="text-indigo-500" />
                      <span className="text-xs font-medium truncate">
                        {col.name}
                      </span>
                    </div>
                    {expandedCols[col.id] && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 py-1">
                        {col.items &&
                          col.items.map((req) => (
                            <div
                              key={req.id}
                              onClick={() => {
                                setUrl(req.url);
                                setMethod(req.method);
                              }}
                              className="py-2 px-3 pl-9 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 border-l-2 border-transparent hover:border-indigo-500 transition-all group"
                            >
                              <span
                                className={`text-[9px] font-bold w-8 ${
                                  req.method === "GET"
                                    ? "text-emerald-500"
                                    : "text-indigo-500"
                                }`}
                              >
                                {req.method}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {req.name}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 relative transition-colors duration-300">
        {/* Top Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm z-10">
          <div className="flex gap-3 max-w-6xl mx-auto mb-3 justify-end items-center">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full mr-auto border border-slate-200 dark:border-slate-700">
              <Info size={10} />
              <span>
                Tip: Use{" "}
                <span className="font-mono text-indigo-500">
                  {"{{baseUrl}}"}
                </span>{" "}
                for dynamic URLs
              </span>
            </div>

            <div className="relative group">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:border-indigo-500/50 transition-all">
                <Settings size={12} className="text-slate-400" />
                <select
                  value={activeEnvId}
                  onChange={(e) =>
                    e.target.value === "manage"
                      ? openEnvEditor()
                      : setActiveEnvId(e.target.value)
                  }
                  className="bg-transparent outline-none text-slate-700 dark:text-slate-300 w-36 cursor-pointer font-medium"
                >
                  <option value="">No Environment</option>
                  {environments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="manage">⚙️ Manage Environments</option>
                </select>
                {activeEnvId && (
                  <button
                    onClick={() => openEnvEditor(activeEnvId)}
                    className="ml-1 text-indigo-500 hover:text-indigo-600"
                  >
                    <Edit3 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 max-w-6xl mx-auto">
            <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-sm">
              <div className="relative border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={`bg-transparent text-xs font-bold px-4 py-3 pr-8 outline-none appearance-none cursor-pointer ${
                    method === "GET"
                      ? "text-emerald-500"
                      : method === "POST"
                      ? "text-indigo-500"
                      : method === "DELETE"
                      ? "text-rose-500"
                      : "text-amber-500"
                  }`}
                >
                  {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter request URL"
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-mono tracking-wide"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              <span>Send</span>
            </button>
            <button
              onClick={() => setSaveModal((p) => ({ ...p, open: true }))}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-indigo-500 px-4 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Save size={18} />
            </button>
          </div>
        </div>

        {/* Request/Response Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto flex flex-col gap-6 h-full">
            {/* Request Panel */}
            <div className="flex flex-col gap-0 h-[45%] min-h-[300px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 px-2 pt-2">
                {["params", "headers", "body", "auth"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === tab
                        ? "border-indigo-500 text-indigo-500 bg-white dark:bg-slate-800/50 rounded-t-lg"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-t-lg"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-hidden relative">
                {activeTab === "body" && method === "GET" && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-50 dark:bg-amber-500/10 px-4 py-1.5 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-2 border-b border-amber-100 dark:border-amber-500/20 z-10">
                    <AlertCircle size={10} /> Note: GET requests typically
                    ignore the request body.
                  </div>
                )}

                {activeTab === "headers" && (
                  <div className="p-4 space-y-3 overflow-auto h-full bg-white dark:bg-slate-900 custom-scrollbar">
                    {headers.map((h, i) => (
                      <div key={i} className="flex gap-3 group">
                        <input
                          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-xs focus:border-indigo-500 focus:outline-none transition-colors font-mono text-slate-700 dark:text-slate-300"
                          placeholder="Key"
                          value={h.key}
                          onChange={(e) => {
                            const n = [...headers];
                            n[i].key = e.target.value;
                            setHeaders(n);
                          }}
                        />
                        <input
                          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-xs focus:border-indigo-500 focus:outline-none transition-colors font-mono text-emerald-600 dark:text-emerald-400"
                          placeholder="Value"
                          value={h.value}
                          onChange={(e) => {
                            const n = [...headers];
                            n[i].value = e.target.value;
                            setHeaders(n);
                          }}
                        />
                        <button
                          onClick={() => {
                            const n = [...headers];
                            n.splice(i, 1);
                            setHeaders(n);
                          }}
                          className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all px-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setHeaders([...headers, { key: "", value: "" }])
                      }
                      className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all font-medium"
                    >
                      <Plus size={14} /> Add Header
                    </button>
                  </div>
                )}
                {activeTab === "body" && (
                  <AceEditor
                    mode="json"
                    theme={
                      theme === "dark" ? "tomorrow_night_eighties" : "chrome"
                    }
                    value={body}
                    onChange={setBody}
                    name="body_editor"
                    width="100%"
                    height="100%"
                    fontSize={14}
                    showPrintMargin={false}
                    setOptions={{
                      showLineNumbers: true,
                      tabSize: 2,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    style={{ marginTop: method === "GET" ? "25px" : "0" }}
                  />
                )}
                {activeTab === "params" && (
                  <div className="p-8 text-center text-slate-400 text-sm italic">
                    Query params are automatically extracted from the URL.
                  </div>
                )}
              </div>
            </div>

            {/* Response Panel */}
            <div className="flex flex-col h-[55%] min-h-[350px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
              <div className="bg-slate-50 dark:bg-slate-950/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center h-[50px] shrink-0">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Response
                </span>
                {(response || (error && error.status)) && (
                  <div className="flex gap-3 text-[11px] font-mono items-center">
                    {response && (
                      <>
                        <span
                          className={`px-2 py-0.5 rounded border ${getStatusColor(
                            response.status
                          )} font-bold`}
                        >
                          {response.status}{" "}
                          {STATUS_TEXT[response.status] || "OK"}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {response.time}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {response.size}
                        </span>
                      </>
                    )}
                    {error && (
                      <span className="text-rose-500 bg-rose-100 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/20 font-bold">
                        {error.status || "Error"}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 relative bg-white dark:bg-slate-900 overflow-auto custom-scrollbar">
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 z-20 backdrop-blur-sm">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-indigo-500 animate-spin"></div>
                    </div>
                    <span className="mt-4 text-slate-400 text-xs tracking-widest uppercase font-medium animate-pulse">
                      Sending Request...
                    </span>
                  </div>
                )}
                {!loading && error && <ErrorDisplay error={error} />}
                {!response && !loading && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <Layout size={64} strokeWidth={1} />
                    <span className="text-sm mt-4 font-medium tracking-wide">
                      Ready to send request
                    </span>
                  </div>
                )}
                {!loading && response && (
                  <AceEditor
                    mode={isJsonData(response.data) ? "json" : "html"}
                    theme={
                      theme === "dark" ? "tomorrow_night_eighties" : "chrome"
                    }
                    value={
                      isJsonData(response.data)
                        ? JSON.stringify(response.data, null, 2)
                        : String(response.data)
                    }
                    readOnly={true}
                    width="100%"
                    height="100%"
                    fontSize={14}
                    showPrintMargin={false}
                    setOptions={{
                      useWorker: false,
                      showLineNumbers: true,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ENV MODAL */}
      {isEnvModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-2xl w-[600px] border border-slate-700 shadow-2xl flex flex-col max-h-[80vh] transform transition-all scale-100">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Box size={20} className="text-indigo-500" />
              Manage Environment
            </h3>
            <input
              className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white mb-6 focus:border-indigo-500 focus:outline-none transition-all"
              placeholder="Environment Name"
              value={envEditor.name}
              onChange={(e) =>
                setEnvEditor({ ...envEditor, name: e.target.value })
              }
            />
            <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
              {envEditor.variables.map((v, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <input
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono focus:border-indigo-500/50 outline-none"
                    placeholder="VARIABLE_KEY"
                    value={v.key}
                    onChange={(e) => {
                      const n = [...envEditor.variables];
                      n[i].key = e.target.value;
                      setEnvEditor({ ...envEditor, variables: n });
                    }}
                  />
                  <input
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:border-emerald-500/50 outline-none"
                    placeholder="Value"
                    value={v.value}
                    onChange={(e) => {
                      const n = [...envEditor.variables];
                      n[i].value = e.target.value;
                      setEnvEditor({ ...envEditor, variables: n });
                    }}
                  />
                  <button
                    onClick={() => {
                      const n = [...envEditor.variables];
                      n.splice(i, 1);
                      setEnvEditor({ ...envEditor, variables: n });
                    }}
                    className="text-slate-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setEnvEditor({
                    ...envEditor,
                    variables: [
                      ...envEditor.variables,
                      { key: "", value: "", enabled: true },
                    ],
                  })
                }
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium"
              >
                <Plus size={14} /> Add Variable
              </button>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-5">
              {envEditor.id ? (
                <button
                  onClick={deleteEnvironment}
                  className="text-rose-400 text-xs hover:text-rose-300 font-medium"
                >
                  Delete Environment
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEnvModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEnvironment}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVE REQUEST MODAL */}
      {saveModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-2xl w-96 border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Save size={18} className="text-emerald-500" />
              Save Request
            </h3>
            <input
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white mb-4 focus:border-emerald-500 outline-none transition-all"
              placeholder="Request Name"
              value={saveModal.name}
              onChange={(e) =>
                setSaveModal({ ...saveModal, name: e.target.value })
              }
            />
            <select
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white mb-6 focus:border-emerald-500 outline-none transition-all cursor-pointer"
              value={saveModal.colId}
              onChange={(e) =>
                setSaveModal({ ...saveModal, colId: e.target.value })
              }
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSaveModal({ ...saveModal, open: false })}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE COLLECTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-2xl w-80 border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Folder size={18} className="text-indigo-500" />
              New Collection
            </h3>
            <input
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white mb-6 focus:border-indigo-500 outline-none transition-all"
              placeholder="Collection Name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCollection}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
