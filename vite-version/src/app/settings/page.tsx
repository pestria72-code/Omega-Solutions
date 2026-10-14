import * as React from "react"
import { Sun, Moon, Monitor, Save, RotateCcw } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { DemoBanner } from "@/components/demo-banner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "cn"

const PREFS_KEY = "omega-demo-preferences"

interface DemoPrefs {
  currency: string
  dateFormat: string
  fiscalYearStart: string
}

const defaultPrefs: DemoPrefs = {
  currency: "KES",
  dateFormat: "DD MMM YYYY",
  fiscalYearStart: "January",
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = React.useState<DemoPrefs>(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY)
      return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs
    } catch {
      return defaultPrefs
    }
  })
  const [saved, setSaved] = React.useState(false)

  const handleSave = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setPrefs(defaultPrefs)
    localStorage.removeItem(PREFS_KEY)
  }

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ]

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Settings"
          description="Configure appearance and display preferences"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset} className="cursor-pointer">
                <RotateCcw className="size-4" />
                Reset
              </Button>
              <Button onClick={handleSave} className="cursor-pointer">
                <Save className="size-4" />
                {saved ? "Saved!" : "Save Preferences"}
              </Button>
            </div>
          }
        />
        <DemoBanner message="These preferences are stored locally in your browser only. They are demo settings and will be replaced by server-side preferences when the backend is connected." />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Theme Preference</CardTitle>
              <CardDescription>Choose how the application appears</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors cursor-pointer",
                      theme === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                    aria-pressed={theme === opt.value}
                  >
                    <opt.icon className="size-5" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Locale and formatting options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pref-currency">Currency</Label>
                  <Select value={prefs.currency} onValueChange={(v) => v && setPrefs({ ...prefs, currency: v })}>
                    <SelectTrigger id="pref-currency" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">Kenyan Shilling (KSh)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pref-date">Date Format</Label>
                  <Select value={prefs.dateFormat} onValueChange={(v) => v && setPrefs({ ...prefs, dateFormat: v })}>
                    <SelectTrigger id="pref-date" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD MMM YYYY">DD MMM YYYY (14 Oct 2024)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (10/14/2024)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (14/10/2024)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-10-14)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pref-fy">Fiscal Year Start</Label>
                  <Select value={prefs.fiscalYearStart} onValueChange={(v) => v && setPrefs({ ...prefs, fiscalYearStart: v })}>
                    <SelectTrigger id="pref-fy" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="January">January</SelectItem>
                      <SelectItem value="April">April</SelectItem>
                      <SelectItem value="July">July</SelectItem>
                      <SelectItem value="October">October</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
