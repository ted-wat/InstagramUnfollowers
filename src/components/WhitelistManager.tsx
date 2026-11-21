import React, { useRef, useState } from "react";
import { UserNode } from '../model/user';
import { exportWhitelist, importWhitelist, mergeWhitelists } from '../utils/whitelist-manager';
import { Language, t } from "../utils/i18n";

interface WhitelistManagerProps {
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => boolean;
  lang: Language;
}

export const WhitelistManager = ({ whitelistedUsers, onWhitelistUpdate, lang }: WhitelistManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const persist = (users: readonly UserNode[]) => {
    if (onWhitelistUpdate(users)) {
      return true;
    }
    setMessage({ type: 'error', text: t(lang, 'whitelistSaveFailed') });
    return false;
  };

  const handleExport = () => {
    exportWhitelist(whitelistedUsers);
    setMessage({ type: "success", text: t(lang, "whitelistExported") });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    importWhitelist(
      file,
      (importedUsers) => {
        const finalUsers = importMode === 'merge' ? mergeWhitelists(whitelistedUsers, importedUsers) : importedUsers;
        if (!persist(finalUsers)) {
          return;
        }
        const added = finalUsers.length - whitelistedUsers.length;
        const text = importMode === 'merge'
          ? `Merged successfully! Added ${added} new users (${importedUsers.length} imported, ${importedUsers.length - added} duplicates skipped)`
          : `Replaced whitelist with ${importedUsers.length} users`;
        setMessage({ type: 'success', text });
        setTimeout(() => setMessage(null), 5000);
      },
      (errorMessage) => {
        setMessage({ type: "error", text: errorMessage });
        setTimeout(() => setMessage(null), 5000);
      }
    );

    // Reset file input
    event.currentTarget.value = "";
  };

  const handleClear = () => {
    if (!confirm(t(lang, "clearWhitelistConfirm"))) {
      return;
    }
    if (!persist([])) {
      return;
    }
    setMessage({ type: "success", text: t(lang, "whitelistCleared") });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePasteSubmit = () => {
    const rawTokens = pasteText
      .split(/[\s,;\n\r\t]+/)
      .map(s => s.replace(/^@+/, '').trim().toLowerCase())
      .filter(s => s !== '.' && s !== '..' && /^[a-zA-Z0-9._]{1,30}$/.test(s));

    if (rawTokens.length === 0) {
      setMessage({ type: "error", text: t(lang, "noValidUsernamesFound") });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    const uniqueUsernames = Array.from(new Set(rawTokens));
    const existingUsernames = new Set(whitelistedUsers.map(u => u.username.toLowerCase()));
    const toAdd = uniqueUsernames.filter(u => !existingUsernames.has(u));

    if (toAdd.length === 0) {
      setMessage({ type: "success", text: t(lang, "pastedUsersAlreadyExist") });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    const newNodes: UserNode[] = toAdd.map(username => ({
      id: `pasted_${username}`,
      username,
      full_name: username,
      profile_pic_url: '',
      is_private: false,
      is_verified: false,
      followed_by_viewer: true,
      follows_viewer: false,
      requested_by_viewer: false,
    }));

    const updated = [...whitelistedUsers, ...newNodes];
    if (!persist(updated)) {
      return;
    }
    setPasteText("");
    setShowPasteArea(false);
    setMessage({
      type: "success",
      text: t(lang, "pastedUsersAdded", newNodes.length),
    });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="whitelist-manager">
      <div className="whitelist-header">
        <h4>{t(lang, "whitelistTitle")}</h4>
        <span className="whitelist-count">
          {whitelistedUsers.length} {whitelistedUsers.length === 1 ? t(lang, "userSingular") : t(lang, "userPlural")}
        </span>
      </div>

      {message && (
        <div className={`whitelist-message ${message.type === "error" ? "error" : "success"}`}>
          {message.text}
        </div>
      )}

      <div className="whitelist-actions">
        <button type='button'
          className="btn btn-export" 
          onClick={handleExport}
          disabled={whitelistedUsers.length === 0}
          title={whitelistedUsers.length === 0 ? "No users" : t(lang, "exportWhitelist")}
        >
          📥 {t(lang, "exportWhitelist")}
        </button>

        <div className="import-section">
          <div className="import-mode">
            <label>
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              {t(lang, "mergeWhitelist")}
            </label>
            <label>
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              {t(lang, "replaceWhitelist")}
            </label>
          </div>

          <button type='button'
            className="btn btn-import" 
            onClick={handleImportClick}
            title={t(lang, "importWhitelist")}
          >
            📤 {t(lang, "importWhitelist")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        <button 
          type="button"
          className="btn btn-paste" 
          onClick={() => setShowPasteArea(!showPasteArea)}
          title={t(lang, "pasteWhitelist")}
        >
          📋 {t(lang, "pasteWhitelist")}
        </button>

        <button type='button'
          className="btn btn-clear" 
          onClick={handleClear}
          disabled={whitelistedUsers.length === 0}
          title={t(lang, "clearWhitelist")}
        >
          🗑️ {t(lang, "clearWhitelist")}
        </button>
      </div>

      {showPasteArea && (
        <div className="paste-whitelist-box">
          <textarea
            className="paste-whitelist-textarea"
            placeholder={t(lang, "pasteWhitelistPlaceholder")}
            value={pasteText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPasteText(e.currentTarget.value)}
            rows={3}
          />
          <button
            type="button"
            className="btn btn-paste-submit"
            onClick={handlePasteSubmit}
          >
            ➕ {t(lang, "addPastedToWhitelist")}
          </button>
        </div>
      )}

      <div className="whitelist-info">
        <p className="info-text">
          <strong>💡 Tip:</strong> {t(lang, "whitelistTip")}
        </p>
      </div>
    </div>
  );
};
