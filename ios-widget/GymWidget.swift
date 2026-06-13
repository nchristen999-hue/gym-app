//
//  GymWidget.swift
//  GYMTRACK – Home Screen Widget (WidgetKit)
//
//  EINBAU (auf dem Mac, siehe NATIVE_SETUP.md Punkt 4):
//   1. App Group `group.com.nchristen.gymtrack` zu App- UND Widget-Target hinzufügen.
//   2. Neues "Widget Extension"-Target anlegen (z. B. "GymWidget").
//   3. Den AUTOMATISCH erzeugten Inhalt der GymWidget.swift durch DIESE Datei ersetzen.
//
//  Die Werte werden vom Web-Code via Capacitor Preferences (App Group) geschrieben:
//  Schlüssel "CapacitorStorage.widget_data" als JSON-String.
//

import WidgetKit
import SwiftUI

// MARK: - Datenmodell

struct GymData {
    var streak: Int
    var level: Int
    var points: Int
    var weekWorkouts: Int
    var steps: Int?

    static let placeholder = GymData(streak: 5, level: 7, points: 12480, weekWorkouts: 3, steps: 8421)

    static func load() -> GymData {
        let suite = UserDefaults(suiteName: "group.com.nchristen.gymtrack")
        // Capacitor Preferences speichert mit Präfix "CapacitorStorage."
        guard let raw = suite?.string(forKey: "CapacitorStorage.widget_data"),
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return GymData(streak: 0, level: 1, points: 0, weekWorkouts: 0, steps: nil) }

        func intVal(_ key: String) -> Int {
            if let n = json[key] as? Int { return n }
            if let d = json[key] as? Double { return Int(d) }
            if let s = json[key] as? String { return Int(s) ?? 0 }
            return 0
        }
        let steps: Int? = (json["steps"] is NSNull || json["steps"] == nil) ? nil : intVal("steps")
        return GymData(
            streak: intVal("streak"),
            level: intVal("level"),
            points: intVal("points"),
            weekWorkouts: intVal("weekWorkouts"),
            steps: steps
        )
    }
}

// MARK: - Timeline

struct GymEntry: TimelineEntry {
    let date: Date
    let data: GymData
}

struct GymProvider: TimelineProvider {
    func placeholder(in context: Context) -> GymEntry {
        GymEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (GymEntry) -> Void) {
        let data = context.isPreview ? GymData.placeholder : GymData.load()
        completion(GymEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<GymEntry>) -> Void) {
        let entry = GymEntry(date: Date(), data: GymData.load())
        // Alle 30 Minuten aktualisieren.
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - UI

private let accent = Color(red: 212/255, green: 1.0, blue: 58/255) // #d4ff3a

struct GymWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: GymProvider.Entry

    var body: some View {
        switch family {
        case .systemSmall: smallView
        default: mediumView
        }
    }

    private var header: some View {
        HStack {
            Text("GYMTRACK")
                .font(.system(size: 11, weight: .heavy, design: .monospaced))
                .foregroundColor(accent)
            Spacer()
            HStack(spacing: 2) {
                Text("🔥")
                Text("\(entry.data.streak)")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
            }
        }
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 6) {
            header
            Spacer()
            Text("LVL \(entry.data.level)")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundColor(.white)
            Text("\(entry.data.points) XP")
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundColor(.gray)
        }
        .padding(14)
        .containerBackground(for: .widget) { Color.black }
    }

    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 8) {
            header
            Spacer()
            HStack(spacing: 16) {
                stat(value: "L\(entry.data.level)", label: "Level")
                stat(value: "\(entry.data.weekWorkouts)", label: "Diese Woche")
                if let s = entry.data.steps {
                    stat(value: stepsString(s), label: "Schritte")
                } else {
                    stat(value: "\(entry.data.points)", label: "XP")
                }
            }
        }
        .padding(16)
        .containerBackground(for: .widget) { Color.black }
    }

    private func stat(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.gray)
        }
    }

    private func stepsString(_ s: Int) -> String {
        s >= 1000 ? String(format: "%.1fk", Double(s) / 1000.0) : "\(s)"
    }
}

// MARK: - Widget

@main
struct GymWidget: Widget {
    let kind: String = "GymWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GymProvider()) { entry in
            GymWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("GYMTRACK")
        .description("Streak, Level & Schritte auf einen Blick.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
