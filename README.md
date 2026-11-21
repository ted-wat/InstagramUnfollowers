# 📱 Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/davidarroyo1234/InstagramUnfollowers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🇬🇧 English](#-english) | [🇪🇸 Español](#-español)

---

<a name="-english"></a>
## 🇬🇧 English

**Non-Followers** shows accounts you follow that are absent from your current follower list. **Past Unfollowers (Diff)** compares two saved observations using numeric Instagram account IDs. A creator who never followed you back can appear in Non-Followers and is excluded from the historical diff.

### Save a baseline and compare it later

1. Build this checkout with Node 22+, `npm ci` and `npm run build`. Inspect **`dist/iu-diff-console.js`**, then load the script on your own signed-in `https://www.instagram.com/` page as described below.
2. Click **Run Scan**. Let the scanner finish both followers and following. Open **Snapshots**, enter a label such as **T0** and click **Save Current Scan as Snapshot**. The capture time defaults to when the scan finished. You can edit the local date and time.
3. Click **Export snapshots (.json)** and keep the backup somewhere private. Snapshots are scoped to the signed-in account and this browser's Instagram site storage. Clearing site data removes the local history. A backup contains both lists, including handles, names and profile-picture URLs. The whitelist has its own backup in Settings.
4. On a later date, reload Instagram, load the overlay again, run a fresh scan and save **T1**. In **Snapshots**, choose the earlier **Baseline (T0)** and later **Comparison (T1)**. Click **View diff**. To use existing history after a reload, open **Snapshots** directly from the launch screen.
5. The result includes an ID only if it followed you at T0, is absent from T1 followers, is still in T1 following and is outside your whitelist. Search, protect and select accounts using the existing controls. Comparison metadata supplies the displayed handle after a rename. The two observations show a relationship change. They cannot establish intent, the exact time of the change or events between scans.

**Restore or import.** Use **Import snapshot backup (.json)** to restore this tool's history while signed in to the same account. For an Accounts Center export, choose **Import Meta Accounts Center files**, enter the export capture time, and select `following.json` and **all** `followers_N.json` files together from the same account and all-time export. A single relationship timestamp is not an export timestamp. Many exports identify accounts only by handle or profile link. The importer shows those handles locally for review. Every entry must have a verifiable numeric ID for an export to become a diff snapshot. Omitted final parts cannot be detected from filenames alone.

**Interrupted scans.** An interrupted or legacy cached scan can be reviewed. Saving a baseline requires a complete fresh scan. HTTP 429 or `feedback_required` stops the operation. The cooldown is ten minutes. Local backup and diff review can continue during that time. [Network and storage audit](./SECURITY_AUDIT.md)

### 🖥️ Desktop Usage

1. Use the readable console script from your local build.
2. Copy its complete contents. The generated `dist/index.html` also contains a **Copy** button for the same script.
3. Go to the Instagram website and log in to your account.
4. Open the developer console:
   - Windows / Linux: `Ctrl + Shift + J`
   - Mac OS: `⌘ + ⌥ + I`
5. Paste the code into the console and press `Enter`. You'll see this interface:
   <br/><img src="./assets/initial.png" alt="Initial screen" />
6. Click **"Run Scan"** to start scanning (or **"⚡ Load previous scan"** to open your saved results instantly).
7. As scanning runs, accounts appear live on screen, and follow-back status updates automatically:
   <br/><img src="./assets/results.png" alt="Results screen" />
8. 🤍 **Whitelist users** by clicking the initials beside their name.
9. 🌐 **Switch language** anytime between English and Spanish using the `🌐 EN / ES` button in the top bar.
10. 💾 **Manage your whitelist** via Settings:
    - Export: Save your whitelist as a JSON backup file
    - Import: Restore or merge whitelisted users from a file
    - Paste: Bulk-paste usernames directly into your protected whitelist
    - Clear: Remove all users from whitelist
    <br/><img src="./assets/settings_whitelist.png" alt="Settings screen" />
11. ✅ **Select users** to unfollow using the checkboxes.
12. ⚙️ **Customize script timings and language** via the "Settings" button:
    <br/><img src="./assets/settings.png" alt="Settings screen" />

### 📱 Mobile Usage

For Android users who want to use it on mobile:
1. Download the latest version of [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)
2. Open Instagram web through the Eruda browser
3. Follow the same steps as desktop (the console will be automatically available when clicking the Eruda icon)

### ✨ Features

- 🔍 **Scan & Detect**: Accurately identifies users who don't follow you back.
- ⚡ **Live Progressive Streaming**: Accounts stream dynamically onto your screen as each batch arrives, eliminating blank waiting screens on large accounts.
- ⚡ **Instant Local Cache (0ms load)**: Re-open and review previously completed audits instantly without re-scraping from scratch.
- 🌐 **Bilingual (EN / ES)**: Native English and Spanish support with instant switching.
- 🛡️ **Action-Block Guard**: Double-checks unfollow API responses to prevent ghost unfollows; halts the queue automatically if Instagram returns `feedback_required` to protect your account.
- ⏳ **Request pacing**: Jittered delays, periodic pauses and a persistent cooldown apply to live operations.
- ⚠️ **Wrong-Detect Guard**: Expanded page limits supporting accounts with tens of thousands of followers, with safe lock preventing accidental unfollows if a scan is interrupted.
- 🤍 **Persistent & Bulk Whitelist**: Protect specific accounts with local persistence, JSON export/import, and direct username list pasting.
- ⚙️ **Customizable Timings**: Control request pacing to match your account safety preferences.
- 🎨 **Apple-inspired UI**: Clean, responsive, and minimalist interface.
- 🔒 **Local history**: The overlay accesses Instagram for the signed-in account. Snapshot comparison, backup and import work locally.

### 🛠️ Development

- Node 22 or later (see `.nvmrc`)
- Install dependencies with `npm ci`
- Run the tests with `npm test`
- Build: `npm run build`
- Dev server with live reload: `npm run build-dev`
- The build generates the copy page, console script and standalone preview in `dist/`. The upstream `public/index.html` is a protected build template. The configured Pages workflow publishes the generated directory.

---

<a name="-español"></a>
## 🇪🇸 Español

**No te siguen** muestra cuentas que sigues y que no figuran entre tus seguidores actuales. **Seguidores perdidos (diferencia)** compara dos capturas por ID numérico.

### Guardar T0 y comparar con T1

1. Con Node 22 o posterior, ejecuta `npm ci` y `npm run build`. Revisa `dist/iu-diff-console.js` y carga el script en tu propia sesión de Instagram.
2. Pulsa **Iniciar Escaneo** y espera a que termine la lectura de seguidores y seguidos. Abre **Capturas**, escribe una etiqueta como **T0**, revisa la hora local y pulsa **Guardar escaneo actual como captura**.
3. Guarda una copia con **Exportar capturas (.json)**. Borrar los datos del sitio elimina el historial del navegador. Las copias contienen datos personales de ambas listas. La lista blanca tiene su propia copia en Ajustes.
4. Más adelante, realiza un nuevo escaneo y guárdalo como **T1**. Elige T0 como captura inicial y T1 como comparación. Pulsa **Ver diferencia**. Solo aparecen cuentas que te seguían en T0, ya no figuran entre los seguidores en T1, seguías en T1 y están fuera de la lista blanca. Un cambio de nombre conserva la identidad. Las capturas no revelan el motivo ni el momento exacto del cambio.
5. Puedes restaurar tu copia en **Importar copia de capturas (.json)** para la misma cuenta. En **Importar archivos del Centro de cuentas de Meta**, indica la fecha de la exportación y selecciona `following.json` y todas las partes `followers_N.json` de una única exportación de todo el historial. Los archivos con registros sin ID numérico permiten consultar los nombres localmente. Solo las listas completas con IDs verificables se guardan como capturas para la comparación.

### 🖥️ Uso en Computadora (Escritorio)

1. Abre el archivo compilado `dist/iu-diff-console.js` y revisa su contenido.
2. Copia el código completo. La página generada `dist/index.html` también ofrece un botón para copiarlo.
3. Entra a Instagram en tu navegador e inicia sesión en tu cuenta.
4. Abre la consola de desarrollador:
   - Windows / Linux: `Ctrl + Shift + J`
   - Mac OS: `⌘ + ⌥ + I`
5. Pega el código en la consola y presiona `Enter`. Verás la interfaz:
   <br/><img src="./assets/initial.png" alt="Pantalla inicial" />
6. Haz clic en **"Iniciar Escaneo"** para comenzar (o **"⚡ Cargar escaneo anterior"** para ver tus resultados guardados al instante).
7. Durante el escaneo, las cuentas se muestran en vivo y el estado de seguimiento se actualiza en tiempo real:
   <br/><img src="./assets/results.png" alt="Pantalla de resultados" />
8. 🤍 **Agrega cuentas a la lista blanca** haciendo clic sobre su foto de perfil para protegerlas.
9. 🌐 **Cambia el idioma** entre Español e Inglés en cualquier momento con el botón `🌐 ES / EN` en la barra superior.
10. 💾 **Administra tu lista blanca** desde Ajustes:
    - Exportar: Guarda tu lista blanca como respaldo en un archivo JSON.
    - Importar: Restaura o combina cuentas desde un archivo de respaldo.
    - Pegar: Pega listas de nombres de usuario para protegerlos directamente.
    - Borrar: Limpia la lista blanca cuando lo desees.
    <br/><img src="./assets/settings_whitelist.png" alt="Pantalla de ajustes de lista blanca" />
11. ✅ **Selecciona los usuarios** que deseas dejar de seguir usando las casillas de verificación.
12. ⚙️ **Personaliza los tiempos de espera y el idioma** desde el botón de "Ajustes":
    <br/><img src="./assets/settings.png" alt="Pantalla de configuración" />

### 📱 Uso en Móvil (Android)

Para usuarios de Android que quieran utilizarlo desde el móvil:
1. Descarga la última versión de [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)
2. Abre la versión web de Instagram a través del navegador Eruda.
3. Sigue los mismos pasos que en la computadora (la consola estará disponible al tocar el ícono de Eruda).

### ✨ Características Principales

- 🔍 **Detección precisa**: Encuentra rápidamente a quienes sigues pero no te siguen de vuelta.
- ⚡ **Carga progresiva en vivo**: Las cuentas aparecen en pantalla en tiempo real mientras se descargan, evitando pantallas en blanco en cuentas con muchos seguidos.
- ⚡ **Caché local instantáneo (0ms)**: Carga escaneos anteriores con un solo clic desde la pantalla inicial sin hacer peticiones innecesarias.
- 🌐 **Soporte Bilingüe (Español / Inglés)**: Interfaz completamente en español e inglés con cambio instantáneo.
- 🛡️ **Protección contra bloqueos de acción (Action Block)**: Verifica la respuesta real de la API de Instagram al dejar de seguir evitando falsos éxitos ("ghost unfollows"); detiene la cola automáticamente ante `feedback_required` para proteger tu cuenta de suspensiones.
- ⏳ **Límites**: HTTP 429 o `feedback_required` detienen la operación y activan una espera de diez minutos.
- ⚠️ **Protección contra falsos no-seguidores**: Límites de páginas ampliados para cuentas con decenas de miles de seguidores, y bloqueo de seguridad del unfollow si el escaneo se interrumpió.
- 🤍 **Lista blanca persistente y masiva**: Protege a tus amigos y familiares con guardado local, exportación/importación en JSON y opción de pegar nombres de usuario directamente.
- ⚙️ **Tiempos configurables**: Ajusta los intervalos entre peticiones para mayor seguridad.
- 🎨 **Diseño limpio y moderno**: Interfaz minimalista y responsiva inspirada en el diseño de Apple.
- 🔒 **Historial local**: El escaneo consulta Instagram. Las capturas, las comparaciones y las copias se procesan en tu navegador.

### 🛠️ Desarrollo

- Node 22 o posterior
- Instalar dependencias con `npm ci`
- Ejecutar las pruebas con `npm test`
- Compilar: `npm run build`
- Servidor de desarrollo con recarga automática: `npm run build-dev`
- El script, la página de copia y la vista previa se generan en `dist/`. El flujo de Pages usa estos archivos.

---

## ⚖️ Legal & License

**Disclaimer:** This tool is not affiliated, associated, authorized, endorsed by, or officially connected with Instagram.  
**Aviso:** Esta herramienta no está afiliada, asociada ni respaldada oficialmente por Instagram.

⚠️ **Use at your own risk! / ¡Úsalo bajo tu propio riesgo!**

📜 Licensed under the [MIT License](LICENSE)
