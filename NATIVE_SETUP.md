# GYMTRACK – Native Setup (Mac / Xcode)

Diese Anleitung deckt die Punkte ab, die **nicht** im Web-Code (`index.html`) erledigt
werden können, sondern direkt im Xcode-Projekt auf dem Mac gemacht werden müssen.

## 0. Nach dem `git pull` auf dem Mac (immer zuerst!)

Die Web-Änderungen liegen nur in `index.html`. Damit sie in der App landen:

```bash
npm install          # falls package.json sich geändert hat
npx cap sync ios     # kopiert index.html + Plugins ins iOS-Projekt
npx cap open ios     # öffnet Xcode
```

> Ohne `cap sync` / `cap copy ios` zeigt die App weiterhin den alten Stand!

---

## 5. 📷 Fotos hinzufügen (Kamera/Fotos – Info.plist-Texte zwingend!)

Die App nutzt `@capacitor/camera`. iOS **crasht** sofort, wenn beim Zugriff auf Kamera
oder Fotomediathek die passenden Nutzungstexte in der Info.plist fehlen. Darum diese
drei Schlüssel in `ios/App/App/Info.plist` ergänzen (nach dem ersten `<dict>`):

```xml
<key>NSCameraUsageDescription</key>
<string>GYMTRACK braucht die Kamera, um Fortschritts-Fotos aufzunehmen.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>GYMTRACK braucht Zugriff auf deine Fotos, um Fortschritts-Bilder auszuwählen.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>GYMTRACK kann Fortschritts-Fotos in deiner Mediathek speichern.</string>
```

Danach `npx cap sync ios` (falls nötig) und neu bauen. Auf dem iPhone beim ersten
Foto-Antippen die Erlaubnis bestätigen. Wurde sie versehentlich abgelehnt:
iOS-Einstellungen → GYMTRACK → Kamera / Fotos wieder erlauben.

---

## 6. 💳 Abo / In-App-Kauf (RevenueCat + App Store Connect)

Aktuell kann man das PRO-Abo **nicht kaufen**, weil `RC_IOS_API_KEY` in `index.html`
leer ist UND die Produkte noch nicht in App Store Connect + RevenueCat existieren.
Das ist externe Einrichtung – sie braucht deine Apple- und RevenueCat-Konten.

Der Code erwartet **exakt** diese Bezeichner:
- Produkt-IDs: `gymtrack_pro_monthly` und `gymtrack_pro_yearly`
- Entitlement: `pro`
- Offering: `default` mit den Paketen **monthly** + **annual**

### a) Apple Developer Program
Du brauchst eine zahlende Mitgliedschaft (99 $/Jahr), sonst sind keine In-App-Käufe möglich.

### b) App Store Connect
1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → App anlegen (Bundle-ID `com.nchristen.gymtrack`).
2. **Vereinbarungen → „Paid Apps"-Vertrag** akzeptieren + **Bank-/Steuerdaten** ausfüllen (sonst keine Käufe!).
3. **Abonnements (Auto-Renewable Subscriptions)** → Gruppe anlegen, dann zwei Produkte:
   - `gymtrack_pro_monthly` (monatlich, Preis z. B. CHF 2.30)
   - `gymtrack_pro_yearly` (jährlich, Preis z. B. CHF 17)
   - Jeweils Lokalisierung (Name/Beschreibung) + Review-Screenshot ausfüllen.
4. **App-Information → App-spezifisches geteiltes Geheimnis** generieren & notieren.

### c) RevenueCat ([app.revenuecat.com](https://app.revenuecat.com))
1. Projekt anlegen → **App Store**-App hinzufügen (Bundle-ID + das geteilte Geheimnis aus b4).
2. **Products** → beide Produkt-IDs aus b3 hinzufügen.
3. **Entitlements** → `pro` anlegen → beide Produkte anhängen.
4. **Offerings** → Offering `default` → Pakete: **Monthly** = `gymtrack_pro_monthly`, **Annual** = `gymtrack_pro_yearly`.
5. **API Keys** → den **Apple/iOS Public Key** (beginnt mit `appl_…`) kopieren.

### d) Key eintragen
In `index.html` (Zeile ~3542):
```js
const RC_IOS_API_KEY = 'appl_DEIN_KEY_HIER';
```
→ committen, auf dem Mac `git pull` + `npx cap sync ios` + neu bauen.

### e) Testen
In-App-Käufe testen nur über **Sandbox** (App Store Connect → Benutzer → Sandbox-Tester
anlegen) oder über **TestFlight** – nicht im normalen Simulator. Erst wenn Apple die
Abos geprüft/freigegeben hat, sind sie live kaufbar.

> Schick mir einfach den `appl_…`-Key, sobald du ihn hast – dann trage ich ihn ein und pushe.

---

## 1. ✅ Export / Download (bereits im Code gefixt)

Im WKWebView funktioniert der `<a download>`-Trick **nicht** – darum wird jetzt der
native iOS-Share-Sheet benutzt (`navigator.share` mit Datei). Du kannst die JSON-Datei
dann z. B. in „Dateien", iCloud, AirDrop oder Mail speichern.
**Nichts weiter zu tun** – nach `cap sync` testen.

---

## 2. ⚠️ Google-Login-Crash beheben (Xcode-Konfiguration nötig)

Der Crash kommt daher, dass die Google-Konfiguration **Platzhalter** enthält und der
iOS-URL-Scheme fehlt. So behebst du es:

### a) Client-IDs (bereits eingetragen ✅)
- **Web-Client-ID** (in `capacitor.config.json` als `serverClientId` + `iosClientId` bereits gesetzt):
  - Web: `31698189822-8305210pa4lq2gseqiakvs1i040civj3.apps.googleusercontent.com`
  - iOS: `31698189822-rjkk3lu3eub60okh78c7eup0atacoecp.apps.googleusercontent.com`

> Das `client_secret` (`GOCSPX-…`) wird in der App NICHT benötigt und darf NICHT
> ins Repo. Falls es irgendwo geteilt wurde, in der Google Cloud Console rotieren.

### b) `capacitor.config.json` – schon erledigt
Die Werte stehen bereits drin. Nichts weiter zu tun.

### c) `ios/App/App/Info.plist` (nur auf dem Mac) ergänzen
Mit den ECHTEN Werten (aus deiner GoogleService-Info-Plist):
```xml
<key>GIDClientID</key>
<string>31698189822-rjkk3lu3eub60okh78c7eup0atacoecp.apps.googleusercontent.com</string>

<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.31698189822-rjkk3lu3eub60okh78c7eup0atacoecp</string>
    </array>
  </dict>
</array>
```

> Tipp: Wenn du bereits andere `CFBundleURLTypes` in der Info.plist hast,
> füge nur ein weiteres `<dict>` zum bestehenden `<array>` hinzu (nicht doppelt anlegen).

### d) Firebase
`GoogleService-Info.plist` muss im Xcode-Projekt unter `ios/App/App/` liegen und im
Target eingebunden sein. In der Firebase-Console muss **Google** als Sign-In-Methode
aktiviert sein.

Danach `npx cap sync ios` und neu bauen. Der Login öffnet dann den System-Browser
statt zu crashen.

---

## 3. ✅ Schritte- & Schlaf-Diagramm (Code fertig – nur HealthKit-Capability nötig)

Das Widget „Aktivität & Schlaf" auf dem Home-Tab ist im Code fertig (7-Tage-Balken-
Diagramme). Es braucht nur die HealthKit-Berechtigung:

### a) Capability hinzufügen
Xcode → Target `App` → **Signing & Capabilities** → `+ Capability` → **HealthKit**.

### b) `Info.plist` Nutzungstexte
```xml
<key>NSHealthShareUsageDescription</key>
<string>GYMTRACK zeigt deine Schritte und deinen Schlaf in der App an.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>GYMTRACK liest deine Gesundheitsdaten nur zur Anzeige.</string>
```

Nach `cap sync` fragt die App beim ersten Öffnen des Home-Tabs nach der Erlaubnis.
Im Simulator gibt es oft keine Health-Daten → am echten iPhone testen.

---

## 4. 🟦 Home-Screen-Widgets (WidgetKit – neues Xcode-Target)

Home-Screen-Widgets sind **native iOS-Extensions** und können nicht im Web-Code liegen.
Der Web-Code schreibt die Kennzahlen aber bereits in eine geteilte **App Group**
(`group.com.nchristen.gymtrack`, Funktion `Native.publishWidgetData`). Du musst nur das
Widget-Target anlegen:

### a) App Group anlegen
Xcode → Target `App` → Signing & Capabilities → `+ Capability` → **App Groups** →
`group.com.nchristen.gymtrack` hinzufügen (Häkchen setzen).

### b) Widget-Extension-Target erstellen
Xcode → File → New → Target… → **Widget Extension** → Name z. B. `GymWidget`
(„Include Configuration Intent" kann aus bleiben). Beim Erstellen aktivieren.
Dann dem neuen Target **dieselbe App Group** hinzufügen (Signing & Capabilities).

### c) Code der Widget-Extension ersetzen
Inhalt von `GymWidget.swift` durch den Code aus
[`ios-widget/GymWidget.swift`](ios-widget/GymWidget.swift) ersetzen.

### d) Bauen
Schema auf `App` lassen, bauen, dann auf dem iPhone: Home-Screen lange drücken →
`+` → „GYMTRACK" → Widget hinzufügen. Es zeigt Streak, Level/Punkte und Schritte.

> Das Widget aktualisiert sich automatisch (Timeline alle ~30 Min). Direkt nach einem
> Workout kann es einen Moment dauern, bis iOS es neu lädt.

---

## Zusammenfassung Checkliste (Mac)

- [ ] `git pull` → `npm install` → `npx cap sync ios`
- [ ] Google: Client-IDs eintragen (config + Info.plist + URL-Scheme) → kein Crash mehr
- [ ] HealthKit-Capability + Info.plist-Texte → Schritte/Schlaf-Diagramm
- [ ] App Group + Widget-Target anlegen, `GymWidget.swift` einfügen → Home-Screen-Widget
- [ ] `GoogleService-Info.plist` vorhanden & im Target
- [ ] In Xcode bauen & auf echtem iPhone testen
