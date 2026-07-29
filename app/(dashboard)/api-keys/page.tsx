"use client"

import { useState } from "react"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">Manage API keys for programmatic access</p>
        </div>
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for external integrations.
              </DialogDescription>
            </DialogHeader>
            {generatedKey ? (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm font-medium">Your API Key</p>
                  <p className="mt-1 break-all font-mono text-sm">{generatedKey}</p>
                  <p className="mt-2 text-xs text-amber-600">
                    Make sure to copy this key now. You won&apos;t be able to see it again.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => copyToClipboard(generatedKey)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button variant="outline" onClick={() => { setGeneratedKey(null); setShowNewKeyDialog(false) }}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production API"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyScope">Scope</Label>
                  <Select value={newKeyScope} onValueChange={setNewKeyScope}>
                    <SelectTrigger id="keyScope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read only</SelectItem>
                      <SelectItem value="read, write">Read & Write</SelectItem>
                      <SelectItem value="read, write, delete">Full Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={generateKey} disabled={!newKeyName}>
                    Generate Key
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
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
                      Scope: {key.scope} | Created: {key.createdAt}
                      {key.lastUsed ? ` | Last used: ${key.lastUsed}` : " | Never used"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={key.active ? "success" : "destructive"}>
                    {key.active ? "Active" : "Revoked"}
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
