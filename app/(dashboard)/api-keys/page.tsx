"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Copy, Key, Plus, Trash2 } from "lucide-react"
import { mockApiKeys, type ApiKey } from "@/lib/constants"

export default function APIKeysPage() {
  const t = useTranslations("apiKeys")
  const [keys, setKeys] = useState<ApiKey[]>(mockApiKeys)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyScope, setNewKeyScope] = useState("read")
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  const generateKey = () => {
    const key = `sk-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    const newKey: ApiKey = {
      id: String(Date.now()),
      name: newKeyName,
      scope: newKeyScope,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: null,
      active: true,
    }
    setKeys((prev) => [newKey, ...prev])
    setGeneratedKey(key)
    setNewKeyName("")
  }

  const revokeKey = (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: !k.active } : k)))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const scopeLabel = (scope: string) => {
    switch (scope) {
      case "read": return t("scopeRead")
      case "read, write": return t("scopeReadWrite")
      case "read, write, delete": return t("scopeFull")
      default: return scope
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("generateKey")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("generateKeyTitle")}</DialogTitle>
              <DialogDescription>
                {t("generateKeyDesc")}
              </DialogDescription>
            </DialogHeader>
            {generatedKey ? (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm font-medium">{t("keyValue")}</p>
                  <p className="mt-1 break-all font-mono text-sm">{generatedKey}</p>
                  <p className="mt-2 text-xs text-amber-600">
                    {t("keyGenerated")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => copyToClipboard(generatedKey)}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t("copyKey")}
                  </Button>
                  <Button variant="outline" onClick={() => { setGeneratedKey(null); setShowNewKeyDialog(false) }}>
                    {t("done")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">{t("keyName")}</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production API"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyScope">{t("scope")}</Label>
                  <Select value={newKeyScope} onValueChange={setNewKeyScope}>
                    <SelectTrigger id="keyScope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">{t("scopeRead")}</SelectItem>
                      <SelectItem value="read, write">{t("scopeReadWrite")}</SelectItem>
                      <SelectItem value="read, write, delete">{t("scopeFull")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={generateKey} disabled={!newKeyName}>
                    {t("generate")}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("activeKeys")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Key className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("scope")}: {scopeLabel(key.scope)} | {t("createdAt")}: {key.createdAt}
                      {key.lastUsed ? ` | ${t("lastUsed")}: ${key.lastUsed}` : ` | ${t("neverUsed")}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={key.active ? "success" : "destructive"}>
                    {key.active ? t("active") : t("revoked")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
