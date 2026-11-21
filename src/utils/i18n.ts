export type Language = "en" | "es";

export const LANGUAGE_STORAGE_KEY = "iu_language";

export const translations = {
  en: {
    whitelistSaveFailed: 'Could not save the whitelist. Your previous list is still in storage.',
    previewReadOnly: 'Preview uses sample accounts. Queue actions are disabled here.',
    snapshots: 'Snapshots',
    pastUnfollowers: 'Past Unfollowers (Diff)',
    saveSnapshot: 'Save Current Scan as Snapshot',
    chooseSnapshot: 'Choose a snapshot',
    close: 'Close',
    snapshotLabel: 'Snapshot label',
    captureTime: 'Capture time (local)',
    fullScanRequired: 'Complete a fresh scan to save both relationship lists.',
    baseline: 'Baseline (T0)',
    comparison: 'Comparison (T1)',
    pairOrder: 'Choose two snapshots. T0 must be earlier than T1. Counts show followers / following.',
    viewDiff: 'View diff',
    snapshotBackup: 'Snapshot backups',
    exportSnapshots: 'Export snapshots (.json)',
    importSnapshots: 'Import snapshot backup (.json)',
    snapshotsImported: 'Added %s snapshots from backup.',
    snapshotSaved: 'Snapshot saved in this browser.',
    importMeta: 'Import Meta Accounts Center files',
    metaFiles: 'Select following.json and every followers file from the same export. Handles without numeric IDs can be reviewed here.',
    metaTime: 'Export capture time (local)',
    metaAttest: 'These are all relationship files from one all-time export for this account.',
    metaChoose: 'Meta relationship files',
    metaUnresolved: 'Read %s followers and %s following. Some records have no numeric ID. They are available for review only.',
    following: 'Following',
    queueChanged: 'Queue stopped. The account, selection or whitelist changed, or account protection could not be verified.',
    queueSession: 'Queue stopped. Your Instagram session is unavailable.',
    loginForSnapshots: 'Sign in to Instagram to open your snapshot history.',

    // Launch Screen
    localAccountAudit: "Local account audit",
    launchTitle: "Find the follows that do not follow back.",
    launchDescription: "Scan your Instagram follows, review risk signals, protect whitelisted accounts, and act only on the users you select.",
    runScan: "Run Scan",
    runsInBrowserOnly: "Runs in this browser session only",
    loadCachedScan: "Load previous scan (%s accounts)",
    ready: "Ready",
    protected: "Protected",
    whitelist: "Whitelist",
    review: "Review",
    selectFirst: "Select first",

    // Toolbar
    scanNoticeBanner: "⚡ Fetching accounts in real time...",
    copyList: "Copy List",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    unfollowSelected: "Unfollow Selected",
    selectPage: "Select Page",
    selectAll: "Select All",
    settings: "Settings",
    goBackConfirm: "Go back to Instagram?",
    copiedToClipboard: "List copied to clipboard!",
    unfollowDisabledPartialScan: "Unfollow disabled: the scan did not finish completely.",
    switchToSpanish: "Cambiar a Español",
    switchToEnglish: "Switch to English",

    // Scanner / Filters
    scanner: "Scanner",
    filters: "Filter",
    nonFollowers: "Non-Followers",
    followers: "Followers",
    verified: "Verified",
    private: "Private",
    withoutProfilePicture: "Without Profile Picture",
    searchPlaceholder: "Search users...",
    nonWhitelistedTab: "Non-Whitelisted",
    whitelistedTab: "Whitelisted",
    addToWhitelist: "Add to Whitelist",
    removeFromWhitelist: "Remove from Whitelist",
    noUsersFound: "No users found matching your filters.",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    pause: "Pause",
    resume: "Resume",
    partialScanWarning: "⚠️ Incomplete scan: it was interrupted before every account was checked, so some non-followers may be missing. Mass unfollow is disabled to protect your account.",
    noPic: "No Pic",
    clear: "Clear",
    displayed: "Displayed",
    totalScanned: "Total scanned",
    scanSummary: "Scan Summary",
    unfollowCount: "Unfollow (%s)",
    unfollowConfirm: "Are you sure you want to unfollow the selected accounts?",
    scanInProgressWait: "Scan in progress: please wait until scan finishes to unfollow.",
    selectAtLeastOneUser: "Must select at least a single user to unfollow",

    // Settings
    settingsTitle: "Settings",
    language: "Language",
    timeBetweenSearchCycles: "Default time between search cycles",
    timeToWaitAfterFiveCycles: "Default time to wait after five search cycles",
    timeBetweenUnfollows: "Default time between unfollows",
    timeToWaitAfterFiveUnfollows: "Default time to wait after five unfollows",
    usersPerSearchCycle: "Users fetched per request (count)",
    settingsWarning1: "WARNING: Modifying these settings can lead to your account being banned.",
    settingsWarning2: "USE IT AT YOUR OWN RISK!!!!",
    saveSettings: "Save Settings",
    cancel: "Cancel",
    save: "Save",
    warningPrefix: "WARNING:",

    // Whitelist Manager
    whitelistTitle: "Whitelist Management",
    whitelistDescription: "Manage users you want to protect from being unfollowed.",
    exportWhitelist: "Export Whitelist",
    importWhitelist: "Import Whitelist",
    clearWhitelist: "Clear Whitelist",
    clearWhitelistConfirm: "Are you sure you want to clear your whitelist?",
    whitelistExported: "Whitelist exported successfully!",
    whitelistImported: "Whitelist imported successfully!",
    whitelistCleared: "Whitelist cleared!",
    userSingular: "user",
    userPlural: "users",
    mergeWhitelist: "Merge (add to existing)",
    replaceWhitelist: "Replace (overwrite)",
    whitelistTip: "Export your whitelist to save it as a backup. You can import it later to restore your saved users.",
    pasteWhitelist: "Paste Usernames",
    pasteWhitelistPlaceholder: "Paste usernames here (separated by commas, spaces, or newlines)...",
    addPastedToWhitelist: "Add to Whitelist",
    pastedUsersAdded: "Added %s new users to whitelist!",
    noValidUsernamesFound: "No valid usernames found.",
    pastedUsersAlreadyExist: "All pasted users are already in the whitelist.",

    // Unfollowing Queue
    unfollowQueue: "Unfollow Queue",
    succeeded: "Succeeded",
    failed: "Failed",
    allDone: "All DONE!",
    unfollowed: "Unfollowed",
    failedToUnfollow: "Failed to unfollow",

    // Toasts & Notifications
    scanCompleted: "Scanning completed!",
    scanFailedFollowing: "Scan failed: could not load your following list from Instagram.",
    scanFailedFollowers: "Scan failed: could not load your followers list from Instagram.",
    scanAccountChanged: "Instagram account changed. Start a new scan for the current account.",
    indexingFollowersProgress: "Indexing followers (%s loaded)...",
    scanningFollowingProgress: "Checking followed accounts (%s checked)...",
    partialScanInterrupted: "Partial scan: checked %s accounts, but scan was interrupted.",
    rateLimitPause: "Instagram cooldown active. Pausing for %s seconds before retrying...",
    sleepingSafety: "Sleeping %s seconds to prevent getting temp blocked",
    loadedFromCache: "Loaded %s accounts from cache!",
    actionBlockedWarning: "⚠️ Instagram blocked the request. The unfollow queue has stopped.",
  },
  es: {
    whitelistSaveFailed: 'No se pudo guardar la lista blanca. La lista anterior sigue almacenada.',
    previewReadOnly: 'La vista previa usa cuentas de ejemplo. Las acciones están desactivadas.',
    snapshots: 'Capturas',
    pastUnfollowers: 'Seguidores perdidos (diferencia)',
    saveSnapshot: 'Guardar escaneo actual como captura',
    chooseSnapshot: 'Elegir una captura',
    close: 'Cerrar',
    snapshotLabel: 'Nombre de la captura',
    captureTime: 'Hora de captura (local)',
    fullScanRequired: 'Completa un escaneo nuevo para guardar ambas listas.',
    baseline: 'Captura inicial (T0)',
    comparison: 'Captura de comparación (T1)',
    pairOrder: 'Elige dos capturas. T0 debe ser anterior a T1. Los totales indican seguidores / seguidos.',
    viewDiff: 'Ver diferencia',
    snapshotBackup: 'Copias de seguridad',
    exportSnapshots: 'Exportar capturas (.json)',
    importSnapshots: 'Importar copia de capturas (.json)',
    snapshotsImported: 'Se añadieron %s capturas de la copia.',
    snapshotSaved: 'Captura guardada en este navegador.',
    importMeta: 'Importar archivos del Centro de cuentas de Meta',
    metaFiles: 'Selecciona following.json y todos los archivos de seguidores de la misma exportación. Puedes revisar los nombres sin ID numérico.',
    metaTime: 'Hora de la exportación (local)',
    metaAttest: 'Son todos los archivos de relaciones de una exportación de todo el historial de esta cuenta.',
    metaChoose: 'Archivos de relaciones de Meta',
    metaUnresolved: 'Se leyeron %s seguidores y %s seguidos. Algunos registros no tienen ID numérico. Solo se pueden consultar.',
    following: 'Seguidos',
    queueChanged: 'Cola detenida. Cambió la cuenta, la selección o la lista blanca, o no se pudo verificar la protección.',
    queueSession: 'Cola detenida. Tu sesión de Instagram no está disponible.',
    loginForSnapshots: 'Inicia sesión en Instagram para abrir el historial de capturas.',

    // Launch Screen
    localAccountAudit: "Auditoría local de cuenta",
    launchTitle: "Encuentra a quienes sigues pero no te siguen de vuelta.",
    launchDescription: "Escanea tus seguidos de Instagram, analiza señales de riesgo, protege cuentas en lista blanca y actúa solo sobre los usuarios seleccionados.",
    runScan: "Iniciar Escaneo",
    runsInBrowserOnly: "Se ejecuta solo en esta sesión del navegador",
    loadCachedScan: "Cargar escaneo anterior (%s cuentas)",
    ready: "Listo",
    protected: "Protegido",
    whitelist: "Lista blanca",
    review: "Revisar",
    selectFirst: "Selecciona primero",

    // Toolbar
    scanNoticeBanner: "⚡ Obteniendo cuentas en tiempo real...",
    copyList: "Copiar Lista",
    exportJson: "Exportar JSON",
    exportCsv: "Exportar CSV",
    unfollowSelected: "Dejar de Seguir Seleccionados",
    selectPage: "Seleccionar Página",
    selectAll: "Seleccionar Todos",
    settings: "Ajustes",
    goBackConfirm: "¿Deseas volver a Instagram?",
    copiedToClipboard: "¡Lista copiada al portapapeles!",
    unfollowDisabledPartialScan: "Unfollow desactivado: el escaneo no finalizó por completo.",
    switchToSpanish: "Cambiar a Español",
    switchToEnglish: "Switch to English",

    // Scanner / Filters
    scanner: "Escáner",
    filters: "Filtros",
    nonFollowers: "No te siguen",
    followers: "Te siguen",
    verified: "Verificados",
    private: "Privados",
    withoutProfilePicture: "Sin foto de perfil",
    searchPlaceholder: "Buscar usuarios...",
    nonWhitelistedTab: "Fuera de Lista Blanca",
    whitelistedTab: "En Lista Blanca",
    addToWhitelist: "Añadir a Lista Blanca",
    removeFromWhitelist: "Quitar de Lista Blanca",
    noUsersFound: "No se encontraron usuarios con estos filtros.",
    page: "Página",
    of: "de",
    previous: "Anterior",
    next: "Siguiente",
    pause: "Pausar",
    resume: "Reanudar",
    partialScanWarning: "⚠️ Escaneo incompleto: se interrumpió antes de revisar todas las cuentas, por lo que pueden faltar cuentas que no te siguen. El unfollow masivo ha sido desactivado por seguridad.",
    noPic: "Sin foto",
    clear: "Limpiar",
    displayed: "Mostrados",
    totalScanned: "Total escaneados",
    scanSummary: "Resumen",
    unfollowCount: "Dejar de Seguir (%s)",
    unfollowConfirm: "¿Estás seguro de dejar de seguir a las cuentas seleccionadas?",
    scanInProgressWait: "Escaneo en progreso: espera a que termine para dejar de seguir.",
    selectAtLeastOneUser: "Debes seleccionar al menos un usuario",

    // Settings
    settingsTitle: "Configuración",
    language: "Idioma",
    timeBetweenSearchCycles: "Tiempo entre ciclos de búsqueda",
    timeToWaitAfterFiveCycles: "Tiempo de espera tras cinco ciclos de búsqueda",
    timeBetweenUnfollows: "Tiempo entre cada unfollow",
    timeToWaitAfterFiveUnfollows: "Tiempo de espera tras cinco unfollows",
    usersPerSearchCycle: "Usuarios por solicitud (cantidad)",
    settingsWarning1: "ADVERTENCIA: Modificar estos valores puede provocar bloqueos en tu cuenta.",
    settingsWarning2: "¡ÚSALO BAJO TU PROPIO RIESGO!",
    saveSettings: "Guardar Ajustes",
    cancel: "Cancelar",
    save: "Guardar",
    warningPrefix: "ADVERTENCIA:",

    // Whitelist Manager
    whitelistTitle: "Gestión de Lista Blanca",
    whitelistDescription: "Administra las cuentas que deseas proteger para no dejarlas de seguir.",
    exportWhitelist: "Exportar Lista Blanca",
    importWhitelist: "Importar Lista Blanca",
    clearWhitelist: "Borrar Lista Blanca",
    clearWhitelistConfirm: "¿Estás seguro de que deseas borrar tu lista blanca?",
    whitelistExported: "¡Lista blanca exportada correctamente!",
    whitelistImported: "¡Lista blanca importada correctamente!",
    whitelistCleared: "¡Lista blanca borrada!",
    userSingular: "usuario",
    userPlural: "usuarios",
    mergeWhitelist: "Combinar (añadir)",
    replaceWhitelist: "Reemplazar (sobrescribir)",
    whitelistTip: "Exporta tu lista blanca para guardarla como copia de seguridad. Puedes importarla después para restaurar tus usuarios guardados.",
    pasteWhitelist: "Pegar Usuarios",
    pasteWhitelistPlaceholder: "Pega nombres de usuario aquí (separados por comas, espacios o saltos de línea)...",
    addPastedToWhitelist: "Añadir a Lista Blanca",
    pastedUsersAdded: "¡Se añadieron %s nuevos usuarios a la lista blanca!",
    noValidUsernamesFound: "No se encontraron nombres de usuario válidos.",
    pastedUsersAlreadyExist: "Todos los usuarios pegados ya están en la lista blanca.",

    // Unfollowing Queue
    unfollowQueue: "Cola de Unfollow",
    succeeded: "Exitosos",
    failed: "Fallidos",
    allDone: "¡TODO LISTO!",
    unfollowed: "Dejó de seguir a",
    failedToUnfollow: "Error al dejar de seguir a",

    // Toasts & Notifications
    scanCompleted: "¡Escaneo completado!",
    scanFailedFollowing: "Error en el escaneo: no se pudo cargar la lista de seguidos de Instagram.",
    scanFailedFollowers: "Error en el escaneo: no se pudo cargar la lista de seguidores de Instagram.",
    scanAccountChanged: "Cambió la cuenta de Instagram. Inicia un nuevo escaneo para la cuenta actual.",
    indexingFollowersProgress: "Indexando seguidores (%s cargados)...",
    scanningFollowingProgress: "Comprobando cuentas seguidas (%s revisadas)...",
    partialScanInterrupted: "Escaneo parcial: se revisaron %s cuentas, pero el escaneo fue interrumpido.",
    rateLimitPause: "Enfriamiento de Instagram activo. Pausando %s segundos antes de reintentar...",
    sleepingSafety: "Esperando %s segundos para prevenir bloqueos temporales",
    loadedFromCache: "¡Se cargaron %s cuentas del historial!",
    actionBlockedWarning: "⚠️ Instagram bloqueó la solicitud. La cola se ha detenido.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "es") {
      return saved;
    }
    if (typeof navigator !== "undefined" && navigator.language && navigator.language.toLowerCase().startsWith("es")) {
      return "es";
    }
  } catch {
    // fallback
  }
  return "en";
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function t(lang: Language, key: TranslationKey, ...args: (string | number)[]): string {
  const dict = translations[lang] || translations.en;
  let text: string = dict[key] || translations.en[key] || (key as string);
  for (const arg of args) {
    text = text.replace("%s", String(arg));
  }
  return text;
}
