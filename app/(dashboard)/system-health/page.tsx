"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import {
  mockSystemServices,
  mockIncidents,
  type SystemService,
  type Incident,
} from "@/lib/constants"

const statusIcon = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  down: XCircle,
}

const statusColor = {
  healthy: "text-emerald-500" as const,
  degraded: "text-amber-500" as const,
  down: "text-red-500" as const,
}

const severityColor = {
  critical: "destructive" as const,
  major: "warning" as const,
  minor: "secondary" as const,
}

export default function SystemHealthPage() {
  const [services] = useState<SystemService[]>(mockSystemServices)
  const [incidents] = useState<Incident[]>(mockIncidents)

  const overallStatus = services.every((s) => s.status === "healthy") ? "healthy" : services.some((s) => s.status === "down") ? "down" : "degraded"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">Monitor system status and incidents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${statusColor[overallStatus]}`}>
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xl font-semibold capitalize">{overallStatus}</p>
              <p className="text-sm text-muted-foreground">
                {overallStatus === "healthy"
                  ? "All systems operational"
                  : overallStatus === "degraded"
                  ? "Some systems experiencing issues"
                  : "System outage detected"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Current status of all system services</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Response Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const Icon = statusIcon[service.status]
                return (
                  <TableRow key={service.name}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${statusColor[service.status]}`} />
                        <span className="capitalize">{service.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{service.uptime}</TableCell>
                    <TableCell>{service.responseTime}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incident History</CardTitle>
          <CardDescription>Recent incidents and their resolution status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Resolved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">{incident.title}</TableCell>
                  <TableCell>
                    <Badge variant={severityColor[incident.severity]}>
                      {incident.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        incident.status === "resolved"
                          ? "success"
                          : incident.status === "investigating"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {incident.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(incident.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {incident.resolvedAt
                      ? new Date(incident.resolvedAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45%</div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full w-[45%] rounded-full bg-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">62%</div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full w-[62%] rounded-full bg-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full w-[78%] rounded-full bg-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
